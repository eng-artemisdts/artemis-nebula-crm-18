#!/bin/bash

# Script shell para consumir interações do RabbitMQ
# Pode ser usado diretamente em cron jobs ou n8n

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# Carrega variáveis de ambiente se existir arquivo .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Verifica se as variáveis necessárias estão configuradas
if [ -z "$SUPABASE_URL" ] && [ -z "$VITE_SUPABASE_URL" ]; then
  echo "❌ Erro: SUPABASE_URL não configurado"
  exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ] && [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
  echo "❌ Erro: SUPABASE_ANON_KEY não configurado"
  exit 1
fi

# Executa o script Node.js
if command -v node &> /dev/null; then
  node "$SCRIPT_DIR/consume-rabbitmq-interactions.js"
else
  echo "❌ Erro: Node.js não encontrado"
  exit 1
fi

