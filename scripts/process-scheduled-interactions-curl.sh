#!/bin/bash

# Script curl para processar interações agendadas
# Use este comando no n8n como HTTP Request node

SUPABASE_URL="https://lyqcsclmauwmzipjiazs.supabase.co"
SUPABASE_ANON_KEY="SUA_CHAVE_ANON_AQUI"

echo "🚀 Processando interações agendadas..."
echo "   URL: ${SUPABASE_URL}/functions/v1/process-scheduled-interactions"
echo ""

curl -X POST \
  "${SUPABASE_URL}/functions/v1/process-scheduled-interactions" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}'

echo ""
echo "✅ Requisição enviada!"

