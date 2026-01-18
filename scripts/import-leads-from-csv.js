#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import Papa from 'papaparse';


const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://lyqcsclmauwmzipjiazs.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cWNzY2xtYXV3bXppcGppYXpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEwMTc1OCwiZXhwIjoyMDc5Njc3NzU4fQ.n2pBkYeY3Ujwy4NPxkbAQPjJpZVbOvZ4iB8cMmnUD1U";

const ORGANIZATION_ID = '866d61f4-3e76-45dd-8773-4343f8fe3b28';
const CSV_FILE_PATH = '/Users/gabrielmoura/Downloads/nebula-clients-2.csv';

if (!SUPABASE_URL) {
  console.error('❌ Erro: SUPABASE_URL não configurado');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não configurado');
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


async function importLeads() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] 🚀 Iniciando importação de leads do CSV...`);
  console.log(`   📁 Arquivo: ${CSV_FILE_PATH}`);
  console.log(`   🏢 Organização: ${ORGANIZATION_ID}`);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('\n📥 Lendo arquivo CSV...');
    const csvContent = readFileSync(CSV_FILE_PATH, 'utf-8');
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.warn('⚠️  Avisos ao parsear CSV:');
      parseResult.errors.slice(0, 5).forEach(err => {
        console.warn(`   - Linha ${err.row}: ${err.message}`);
      });
    }

    const rows = parseResult.data;
    console.log(`   ✅ ${rows.length} linhas encontradas no CSV`);

    if (rows.length === 0) {
      console.log('\n⚠️  Nenhuma linha encontrada no CSV.');
      process.exit(0);
    }

    console.log('\n📊 Processando e validando leads...');
    
    const leadsData = [];
    const leadsSkipped = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const telefone1 = row['Telefone 1'] || row['telefone1'] || row['Telefone1'];
      const razao = row['Razão'] || row['Razao'] || row['razao'];
      const fantasia = row['Fantasia'] || row['fantasia'];
      const cidade = row['Cidade'] || row['cidade'];
      const email = row['E-mail'] || row['Email'] || row['email'];
      const nome = row['Nome'] || row['nome'];
      const cnpj = row['CNPJ'] || row['cnpj'];

      if (!telefone1) {
        leadsSkipped.push({
          row: i + 2,
          reason: 'Sem telefone',
          data: { razao, fantasia }
        });
        continue;
      }

      const cleanedPhone = cleanPhoneNumber(telefone1);
      if (!cleanedPhone || cleanedPhone.length < 10) {
        leadsSkipped.push({
          row: i + 2,
          reason: 'Telefone inválido',
          data: { telefone1, razao, fantasia }
        });
        continue;
      }

      const leadName = razao || fantasia || nome || `Lead ${i + 1}`;
      
      leadsData.push({
        row: i + 2,
        telefone1: cleanedPhone,
        name: leadName,
        razao,
        fantasia,
        cidade,
        email,
        nome,
        cnpj
      });
    }

    console.log(`   ✅ ${leadsData.length} leads com telefone válido encontrados`);
    console.log(`   ⏭️  ${leadsSkipped.length} leads ignorados (sem telefone ou inválido)`);

    if (leadsData.length === 0) {
      console.log('\n⚠️  Nenhum lead com telefone válido encontrado!');
      process.exit(0);
    }

    console.log('\n🔍 Validando números no WhatsApp via Evolution API...');
    const phonesToCheck = leadsData
      .map(lead => {
        const cleaned = cleanPhoneNumber(lead.telefone1);
        return cleaned;
      })
      .filter(phone => phone && phone.length >= 10);
    
    console.log(`   📞 Validando ${phonesToCheck.length} números únicos...`);

    let phoneToJidMap = {};
    let validationError = null;

    try {
      const { data: checkData, error: checkError } = await supabase.functions.invoke('evolution-check-whatsapp', {
        body: { numbers: phonesToCheck }
      });

      if (checkError) {
        console.error('❌ Erro ao validar números:', checkError);
        
        let errorMessage = checkError.message || 'Erro desconhecido';
        if (checkError.context?.status) {
          errorMessage = `Status ${checkError.context.status}: ${errorMessage}`;
        }
        
        try {
          const errorBody = await checkError.context?.body?.json?.() || checkError.context?.body;
          if (errorBody?.error) {
            errorMessage = errorBody.error;
          }
        } catch (e) {
          // Ignora erro ao tentar ler o body
        }

        validationError = errorMessage;
        console.warn(`   ⚠️  Validação falhou: ${errorMessage}`);
        console.warn(`   📝 Criando leads sem validação do WhatsApp...`);
      } else if (checkData?.results) {
        checkData.results.forEach((result) => {
          if (result.exists && result.jid) {
            const cleanedResultNumber = cleanPhoneNumber(result.number);
            phoneToJidMap[cleanedResultNumber] = result.jid;
          }
        });
        console.log(`   ✅ ${Object.keys(phoneToJidMap).length} números validados no WhatsApp`);
      }
    } catch (error) {
      console.error('❌ Erro ao chamar edge function:', error);
      validationError = error.message || 'Erro desconhecido';
      console.warn(`   ⚠️  Validação falhou: ${validationError}`);
      console.warn(`   📝 Criando leads sem validação do WhatsApp...`);
    }

    const leadsToInsert = leadsData
      .map((lead) => {
        const cleanedPhone = cleanPhoneNumber(lead.telefone1);
        const normalizedPhone = formatWhatsAppNumber(lead.telefone1);
        const hasValidJid = phoneToJidMap[cleanedPhone];
        const remoteJid = hasValidJid ? phoneToJidMap[cleanedPhone] : createRemoteJid(lead.telefone1);

        if (!validationError && !hasValidJid) {
          return null;
        }

        return {
          name: lead.name,
          description: lead.cnpj ? `CNPJ: ${lead.cnpj}` : `Lead importado do CSV`,
          status: 'novo',
          contact_email: lead.email || null,
          contact_whatsapp: normalizedPhone,
          phone: lead.telefone1 || null,
          remote_jid: remoteJid,
          source: 'csv_import',
          whatsapp_verified: hasValidJid,
          organization_id: ORGANIZATION_ID,
          city: lead.cidade || null,
          company_name: lead.fantasia || lead.razao || null,
          notes: lead.cnpj ? `CNPJ: ${lead.cnpj}` : (validationError ? `⚠️ Validação falhou: ${validationError}` : null)
        };
      })
      .filter((lead) => lead !== null);

    const invalidCount = leadsData.length - leadsToInsert.length;
    if (invalidCount > 0 && !validationError) {
      leadsData.forEach((lead) => {
        const cleanedPhone = cleanPhoneNumber(lead.telefone1);
        if (!phoneToJidMap[cleanedPhone]) {
          leadsSkipped.push({
            row: lead.row,
            reason: 'Número não está no WhatsApp',
            data: { telefone1: lead.telefone1, razao: lead.razao, fantasia: lead.fantasia }
          });
        }
      });
    }

    console.log(`\n📊 Estatísticas de processamento:`);
    console.log(`   ✅ Leads válidos para inserir: ${leadsToInsert.length}`);
    if (validationError) {
      console.log(`   ⚠️  Validação do WhatsApp falhou - leads serão criados sem validação`);
    }
    console.log(`   ⏭️  Leads ignorados: ${leadsSkipped.length}`);
    if (leadsToInsert.length === 0) {
      console.log('\n⚠️  Nenhum lead válido para inserir!');
      if (!validationError) {
        console.log('   Todos os números precisam estar registrados no WhatsApp.');
      }
      process.exit(0);
    }

    if (leadsSkipped.length > 0) {
      console.log(`\n⚠️  Leads ignorados (primeiros 10):`);
      leadsSkipped.slice(0, 10).forEach(lead => {
        console.log(`   - Linha ${lead.row}: ${lead.reason} - ${lead.data?.razao || lead.data?.fantasia || 'N/A'}`);
      });
      if (leadsSkipped.length > 10) {
        console.log(`   ... e mais ${leadsSkipped.length - 10} leads`);
      }
    }

    console.log(`\n💾 Inserindo ${leadsToInsert.length} leads no banco de dados...`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < leadsToInsert.length; i++) {
      const lead = leadsToInsert[i];
      
      try {
        const { error: insertError } = await supabase
          .from('leads')
          .insert(lead);

        if (insertError) {
          throw insertError;
        }

        successCount++;
        
        if ((i + 1) % 50 === 0) {
          console.log(`   ✅ Inseridos ${i + 1}/${leadsToInsert.length} leads...`);
        }
      } catch (error) {
        errorCount++;
        errors.push({
          lead: lead.name,
          error: error.message
        });
        
        if (errors.length <= 10) {
          console.error(`   ❌ Erro ao inserir lead ${lead.name}: ${error.message}`);
        }
      }
    }

    const duration = Date.now() - startTime;

    console.log(`\n✅ Processamento concluído em ${(duration / 1000).toFixed(2)}s`);
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   ⏭️  Ignorados: ${leadsSkipped.length}`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log(`\n❌ Erros encontrados:`);
      errors.forEach(err => {
        console.log(`   - ${err.lead}: ${err.error}`);
      });
    } else if (errors.length > 10) {
      console.log(`\n❌ ${errors.length} erros encontrados (mostrando primeiros 10 acima)`);
    }

    if (leadsToInsert.length > 0 && leadsToInsert.length <= 20) {
      console.log(`\n📋 Exemplos de leads inseridos:`);
      leadsToInsert.slice(0, 5).forEach(lead => {
        console.log(`   - ${lead.name}:`);
        console.log(`     WhatsApp: ${lead.contact_whatsapp}`);
        console.log(`     Remote JID: ${lead.remote_jid}`);
        console.log(`     Verificado: ${lead.whatsapp_verified ? 'Sim' : 'Não'}`);
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

importLeads();
