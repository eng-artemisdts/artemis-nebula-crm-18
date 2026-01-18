#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://lyqcsclmauwmzipjiazs.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cWNzY2xtYXV3bXppcGppYXpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEwMTc1OCwiZXhwIjoyMDc5Njc3NzU4fQ.n2pBkYeY3Ujwy4NPxkbAQPjJpZVbOvZ4iB8cMmnUD1U"; 
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cWNzY2xtYXV3bXppcGppYXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDE3NTgsImV4cCI6MjA3OTY3Nzc1OH0.TciAIAZYbdwOdfLyZGym19FqKY02aLsEPT9riwXh0DY";

if (!SUPABASE_URL) {
  console.error('❌ Erro: SUPABASE_URL não configurado');
  process.exit(1);
}

const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Erro: Chave do Supabase não configurada');
  console.error('   Configure SUPABASE_SERVICE_ROLE_KEY (recomendado) ou SUPABASE_ANON_KEY');
  console.error('   Ou use VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Aviso: Usando SUPABASE_ANON_KEY. Pode haver limitações devido a RLS (Row Level Security)');
  console.warn('   Recomendado: Use SUPABASE_SERVICE_ROLE_KEY para bypass do RLS');
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

async function updateLeadsRemoteJid() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] 🚀 Iniciando atualização de remote_jid dos leads...`);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    let allLeads = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    console.log('📥 Buscando leads do banco de dados...');

    const { count: totalCount, error: countError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      if (countError.code === 'PGRST301' || countError.message?.includes('permission denied') || countError.message?.includes('RLS')) {
        throw new Error(`Erro de permissão (RLS) ao contar leads: ${countError.message}\n   Use SUPABASE_SERVICE_ROLE_KEY para bypass do RLS`);
      }
      throw new Error(`Erro ao contar leads: ${countError.message}`);
    }

    console.log(`   📊 Total de leads no banco: ${totalCount || 0}`);

    if (totalCount === 0) {
      console.log('\n⚠️  Nenhum lead encontrado no banco de dados.');
      console.log('   Verifique se:');
      console.log('   1. Há leads cadastrados no sistema');
      console.log('   2. As políticas RLS estão permitindo acesso (use SUPABASE_SERVICE_ROLE_KEY)');
      process.exit(0);
    }

    while (hasMore) {
      const { data: leads, error: fetchError } = await supabase
        .from('leads')
        .select('id, contact_whatsapp, phone, remote_jid, name')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('created_at', { ascending: true });

      if (fetchError) {
        if (fetchError.code === 'PGRST301' || fetchError.message?.includes('permission denied') || fetchError.message?.includes('RLS')) {
          throw new Error(`Erro de permissão (RLS): ${fetchError.message}\n   Use SUPABASE_SERVICE_ROLE_KEY para bypass do RLS`);
        }
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

      const newRemoteJid = createRemoteJid(phone);
      
      if (!newRemoteJid) {
        leadsSkipped.push({
          id: lead.id,
          name: lead.name,
          phone: phone,
          reason: 'Não foi possível criar remote_jid do telefone'
        });
        continue;
      }

      if (lead.remote_jid === newRemoteJid) {
        continue;
      }

      leadsToUpdate.push({
        id: lead.id,
        name: lead.name,
        phone: phone,
        oldRemoteJid: lead.remote_jid,
        newRemoteJid: newRemoteJid
      });
    }

    console.log(`\n📊 Estatísticas:`);
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
      console.log('\n✅ Nenhum lead precisa ser atualizado!');
      process.exit(0);
    }

    console.log(`\n🔄 Atualizando ${leadsToUpdate.length} leads...`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < leadsToUpdate.length; i++) {
      const lead = leadsToUpdate[i];
      
      try {
        const { error: updateError } = await supabase
          .from('leads')
          .update({ remote_jid: lead.newRemoteJid })
          .eq('id', lead.id);

        if (updateError) {
          if (updateError.code === 'PGRST301' || updateError.message?.includes('permission denied') || updateError.message?.includes('RLS')) {
            throw new Error(`Erro de permissão (RLS): ${updateError.message}\n   Use SUPABASE_SERVICE_ROLE_KEY para bypass do RLS`);
          }
          throw updateError;
        }

        successCount++;
        
        if ((i + 1) % 100 === 0) {
          console.log(`   ✅ Atualizados ${i + 1}/${leadsToUpdate.length} leads...`);
        }
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

    console.log(`\n✅ Processamento concluído em ${duration}ms`);
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);

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
      leadsToUpdate.slice(0, 10).forEach(lead => {
        console.log(`   - ${lead.name || lead.id}:`);
        console.log(`     Telefone: ${lead.phone}`);
        console.log(`     Remote JID antigo: ${lead.oldRemoteJid || '(vazio)'}`);
        console.log(`     Remote JID novo: ${lead.newRemoteJid}`);
      });
    }

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n[${timestamp}] ❌ Erro após ${duration}ms:`, error.message);

    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }

    process.exit(1);
  }
}

updateLeadsRemoteJid();
