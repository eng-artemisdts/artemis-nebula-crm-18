#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://lyqcsclmauwmzipjiazs.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cWNzY2xtYXV3bXppcGppYXpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEwMTc1OCwiZXhwIjoyMDc5Njc3NzU4fQ.n2pBkYeY3Ujwy4NPxkbAQPjJpZVbOvZ4iB8cMmnUD1U";
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "https://evolution-api-evolution-api.kltkek.easypanel.host";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "B39A18CF-1F2A-45B4-848E-9B674B3459CD";

const ORGANIZATION_ID = '866d61f4-3e76-45dd-8773-4343f8fe3b28';

if (!SUPABASE_URL) {
  console.error('❌ Erro: SUPABASE_URL não configurado');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não configurado');
  process.exit(1);
}

if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
  console.error('❌ Erro: EVOLUTION_API_URL e EVOLUTION_API_KEY devem estar configurados');
  process.exit(1);
}

function cleanPhoneNumber(phone) {
  if (!phone) return null;
  return phone.replace(/\D/g, '');
}

function formatWhatsAppNumber(phone) {
  if (!phone) return null;
  
  const cleaned = cleanPhoneNumber(phone);
  
  if (!cleaned || cleaned.length === 0) return null;
  
  if (cleaned.startsWith('55')) {
    return cleaned;
  }
  
  if (cleaned.length === 11 || cleaned.length === 10) {
    return `55${cleaned}`;
  }
  
  if (cleaned.length > 11) {
    return cleaned;
  }
  
  return `55${cleaned}`;
}

function createRemoteJid(phone) {
  const formattedPhone = formatWhatsAppNumber(phone);
  if (!formattedPhone) return null;
  return `${formattedPhone}@s.whatsapp.net`;
}

async function getActiveInstance(supabase, organizationId) {
  const { data: instances, error } = await supabase
    .from('whatsapp_instances')
    .select('instance_name, status')
    .eq('organization_id', organizationId)
    .eq('status', 'connected')
    .limit(1);

  if (error) {
    throw new Error(`Erro ao buscar instâncias: ${error.message}`);
  }

  if (!instances || instances.length === 0) {
    throw new Error('Nenhuma instância WhatsApp ativa encontrada para esta organização');
  }

  return instances[0].instance_name;
}

async function validateWhatsAppNumber(phone, instanceName) {
  try {
    const formattedNumber = formatWhatsAppNumber(phone);
    if (!formattedNumber) {
      return { exists: false, jid: null, error: 'Número inválido' };
    }

    const url = `${EVOLUTION_API_URL}/chat/whatsappNumbers/${instanceName}`;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
      'Authorization': `Bearer ${EVOLUTION_API_KEY}`,
    };

    const checkResponse = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        numbers: [formattedNumber]
      }),
    });

    if (!checkResponse.ok) {
      const errorData = await checkResponse.text();
      let errorMessage = `API error: ${checkResponse.status}`;
      
      try {
        const errorJson = JSON.parse(errorData);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch (e) {
        errorMessage = errorData || errorMessage;
      }

      if (checkResponse.status === 401) {
        errorMessage = `Erro de autenticação (401). Verifique EVOLUTION_API_KEY. Detalhes: ${errorMessage}`;
      }

      return { exists: false, jid: null, error: errorMessage };
    }

    const checkData = await checkResponse.json();

    if (checkData && checkData.length > 0) {
      return {
        exists: checkData[0].exists || false,
        jid: checkData[0].jid || null
      };
    }

    return { exists: false, jid: null };
  } catch (error) {
    return {
      exists: false,
      jid: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function fillRemoteJid() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] 🚀 Iniciando preenchimento de remote_jid dos leads...`);
  console.log(`   🏢 Organização: ${ORGANIZATION_ID}`);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('\n🔍 Buscando instância WhatsApp ativa...');
    const instanceName = await getActiveInstance(supabase, ORGANIZATION_ID);
    console.log(`   ✅ Instância encontrada: ${instanceName}`);
    console.log(`   🔑 Evolution API URL: ${EVOLUTION_API_URL}`);
    console.log(`   🔑 Evolution API Key: ${EVOLUTION_API_KEY ? EVOLUTION_API_KEY.substring(0, 8) + '...' : 'NÃO CONFIGURADA'}`);

    let allLeads = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    console.log('\n📥 Buscando leads do banco de dados...');

    const { count: totalCount, error: countError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', ORGANIZATION_ID);

    if (countError) {
      throw new Error(`Erro ao contar leads: ${countError.message}`);
    }

    console.log(`   📊 Total de leads na organização: ${totalCount || 0}`);

    if (totalCount === 0) {
      console.log('\n⚠️  Nenhum lead encontrado para esta organização.');
      process.exit(0);
    }

    while (hasMore) {
      const { data: leads, error: fetchError } = await supabase
        .from('leads')
        .select('id, contact_whatsapp, phone, remote_jid, name, whatsapp_verified, organization_id')
        .eq('organization_id', ORGANIZATION_ID)
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw new Error(`Erro ao buscar leads: ${fetchError.message}`);
      }

      if (!leads || leads.length === 0) {
        hasMore = false;
      } else {
        allLeads = allLeads.concat(leads);
        page++;
        
        if (leads.length < pageSize) {
          hasMore = false;
        }
      }
    }

    console.log(`   ✅ Total de leads encontrados: ${allLeads.length}`);

    const leadsToUpdate = [];
    const leadsSkipped = [];
    const leadsAlreadyValid = [];

    for (const lead of allLeads) {
      const phone = lead.contact_whatsapp || lead.phone;
      
      if (!phone) {
        leadsSkipped.push({
          id: lead.id,
          name: lead.name,
          reason: 'Sem número de telefone'
        });
        continue;
      }

      if (lead.remote_jid && lead.whatsapp_verified) {
        leadsAlreadyValid.push({
          id: lead.id,
          name: lead.name,
          remote_jid: lead.remote_jid
        });
        continue;
      }

      const formattedPhone = formatWhatsAppNumber(phone);
      if (!formattedPhone) {
        leadsSkipped.push({
          id: lead.id,
          name: lead.name,
          phone: phone,
          reason: 'Não foi possível formatar telefone'
        });
        continue;
      }

      leadsToUpdate.push({
        id: lead.id,
        name: lead.name,
        phone: formattedPhone,
        currentRemoteJid: lead.remote_jid,
        currentVerified: lead.whatsapp_verified
      });
    }

    console.log(`\n📊 Estatísticas:`);
    console.log(`   ✅ Leads já válidos: ${leadsAlreadyValid.length}`);
    console.log(`   📝 Leads para atualizar: ${leadsToUpdate.length}`);
    console.log(`   ⏭️  Leads ignorados: ${leadsSkipped.length}`);

    if (leadsSkipped.length > 0) {
      console.log(`\n⚠️  Leads ignorados (primeiros 10):`);
      leadsSkipped.slice(0, 10).forEach(lead => {
        console.log(`   - ${lead.name || lead.id}: ${lead.reason}`);
      });
      if (leadsSkipped.length > 10) {
        console.log(`   ... e mais ${leadsSkipped.length - 10} leads`);
      }
    }

    if (leadsToUpdate.length === 0) {
      console.log('\n✅ Todos os leads já têm remote_jid válido!');
      process.exit(0);
    }

    console.log(`\n🔄 Validando e atualizando ${leadsToUpdate.length} leads...`);

    let successCount = 0;
    let errorCount = 0;
    let validatedCount = 0;
    let notFoundCount = 0;
    const errors = [];

    for (let i = 0; i < leadsToUpdate.length; i++) {
      const lead = leadsToUpdate[i];
      
      if ((i + 1) % 10 === 0) {
        console.log(`   🔄 Processando... ${i + 1}/${leadsToUpdate.length}`);
      }

      try {
        const validation = await validateWhatsAppNumber(lead.phone, instanceName);

        let remoteJid = validation.jid;
        let whatsappVerified = validation.exists;

        if (!remoteJid) {
          remoteJid = createRemoteJid(lead.phone);
        }

        if (!validation.exists && !validation.jid) {
          notFoundCount++;
        } else if (validation.exists && validation.jid) {
          validatedCount++;
        }

        const updateData = {
          remote_jid: remoteJid,
          whatsapp_verified: whatsappVerified
        };

        const { error: updateError } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', lead.id);

        if (updateError) {
          throw updateError;
        }

        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          lead: lead.name || lead.id,
          error: error.message
        });
        
        if (errors.length <= 10) {
          console.error(`   ❌ Erro ao atualizar lead ${lead.name || lead.id}: ${error.message}`);
        }
      }
    }

    const duration = Date.now() - startTime;

    console.log(`\n✅ Processamento concluído em ${(duration / 1000).toFixed(2)}s`);
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ✅ Validados no WhatsApp: ${validatedCount}`);
    console.log(`   ⚠️  Não encontrados no WhatsApp: ${notFoundCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   ⏭️  Ignorados: ${leadsSkipped.length}`);
    console.log(`   ✅ Já válidos: ${leadsAlreadyValid.length}`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log(`\n❌ Erros encontrados:`);
      errors.forEach(err => {
        console.log(`   - ${err.lead}: ${err.error}`);
      });
    } else if (errors.length > 10) {
      console.log(`\n❌ ${errors.length} erros encontrados (mostrando primeiros 10 acima)`);
    }

    if (leadsToUpdate.length > 0 && leadsToUpdate.length <= 20) {
      console.log(`\n📋 Exemplos de atualizações:`);
      leadsToUpdate.slice(0, 5).forEach(lead => {
        console.log(`   - ${lead.name || lead.id}:`);
        console.log(`     Telefone: ${lead.phone}`);
        console.log(`     Remote JID antigo: ${lead.currentRemoteJid || '(vazio)'}`);
        console.log(`     Verificado antigo: ${lead.currentVerified ? 'Sim' : 'Não'}`);
      });
    }

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n[${timestamp}] ❌ Erro após ${(duration / 1000).toFixed(2)}s:`, error.message);

    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }

    process.exit(1);
  }
}

fillRemoteJid();
