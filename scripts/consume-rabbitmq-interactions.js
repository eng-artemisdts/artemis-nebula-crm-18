#!/usr/bin/env node

/**
 * Script para consumir interações agendadas do RabbitMQ
 * 
 * Este script pode ser executado via cron job no n8n ou qualquer outro serviço
 * que suporte execução de scripts Node.js.
 * 
 * Uso:
 *   node scripts/consume-rabbitmq-interactions.js
 * 
 * Variáveis de ambiente necessárias:
 *   - SUPABASE_URL: URL do projeto Supabase
 *   - SUPABASE_ANON_KEY: Chave anônima do Supabase
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.error('   Configure SUPABASE_URL e SUPABASE_ANON_KEY');
  process.exit(1);
}

async function consumeInteractions() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] 🚀 Iniciando consumo de interações do RabbitMQ...`);

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/rabbitmq-consume-interactions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    if (data.error) {
      console.error(`[${timestamp}] ❌ Erro ao consumir interações:`, data.error);
      process.exit(1);
    }

    console.log(`[${timestamp}] ✅ Processamento concluído em ${duration}ms`);
    console.log(`   📊 Processadas: ${data.processed || 0}`);
    console.log(`   ✅ Sucesso: ${data.success || 0}`);
    console.log(`   ❌ Erros: ${data.errors || 0}`);

    if (data.message) {
      console.log(`   💬 Mensagem: ${data.message}`);
    }

    process.exit(0);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${timestamp}] ❌ Erro após ${duration}ms:`, error.message);

    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }

    process.exit(1);
  }
}

if (require.main === module) {
  consumeInteractions();
}

module.exports = { consumeInteractions };

