#!/bin/bash

# Script curl para consumir interações do RabbitMQ
# Pode ser usado diretamente em cron jobs ou n8n

set -e

# Configurações - ajuste conforme necessário
SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL}}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${VITE_SUPABASE_PUBLISHABLE_KEY}}"

# Valores padrão (substitua pelos seus valores)
DEFAULT_SUPABASE_URL="https://lyqcsclmauwmzipjiazs.supabase.co"
DEFAULT_SUPABASE_ANON_KEY="sua-chave-anon-aqui"

# Usa valores padrão se variáveis não estiverem configuradas
if [ -z "$SUPABASE_URL" ]; then
  SUPABASE_URL="$DEFAULT_SUPABASE_URL"
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
  SUPABASE_ANON_KEY="$DEFAULT_SUPABASE_ANON_KEY"
fi

# Validação
if [ "$SUPABASE_URL" = "https://lyqcsclmauwmzipjiazs.supabase.co" ] && [ "$SUPABASE_ANON_KEY" = "sua-chave-anon-aqui" ]; then
  echo "❌ Erro: Configure SUPABASE_URL e SUPABASE_ANON_KEY"
  echo "   Exporte as variáveis ou edite este script"
  exit 1
fi

# Executa o curl
echo "🚀 Consumindo interações do RabbitMQ..."
echo "   URL: ${SUPABASE_URL}/functions/v1/rabbitmq-consume-interactions"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${SUPABASE_URL}/functions/v1/rabbitmq-consume-interactions")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Resposta (HTTP $HTTP_CODE):"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
  echo ""
  echo "✅ Sucesso!"
  exit 0
else
  echo ""
  echo "❌ Erro HTTP $HTTP_CODE"
  exit 1
fi

