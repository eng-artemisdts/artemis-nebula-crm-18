#!/bin/bash

# Script para testar a função get-company-by-whatsapp
# 
# Uso:
#   ./test-get-company-by-whatsapp.sh <phone_number> [access_token]
#
# Exemplo:
#   ./test-get-company-by-whatsapp.sh 5511999999999
#   ./test-get-company-by-whatsapp.sh 5511999999999 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

set -e

# Configurações
SUPABASE_URL="${VITE_SUPABASE_URL:-https://lyqcsclmauwmzipjiazs.supabase.co}"
SUPABASE_ANON_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}"

# Validação de parâmetros
if [ -z "$1" ]; then
  echo "❌ Erro: Número de WhatsApp é obrigatório"
  echo ""
  echo "Uso:"
  echo "  $0 <phone_number> [access_token]"
  echo ""
  echo "Exemplo:"
  echo "  $0 5511999999999"
  echo "  $0 5511999999999 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  exit 1
fi

PHONE_NUMBER="$1"
ACCESS_TOKEN="${2:-$SUPABASE_ANON_KEY}"

if [ -z "$ACCESS_TOKEN" ]; then
  echo "⚠️  Aviso: Token de acesso não fornecido"
  echo ""
  echo "Para obter um token de acesso:"
  echo "  1. Faça login na aplicação"
  echo "  2. Abra o console do navegador (F12)"
  echo "  3. Execute: localStorage.getItem('sb-lyqcsclmauwmzipjiazs-auth-token')"
  echo "  4. Ou use o SUPABASE_ANON_KEY como fallback (menos seguro)"
  echo ""
  echo "Usando SUPABASE_ANON_KEY como fallback..."
  ACCESS_TOKEN="${SUPABASE_ANON_KEY}"
fi

# Executa o curl
echo "🚀 Testando get-company-by-whatsapp..."
echo "   URL: ${SUPABASE_URL}/functions/v1/get-company-by-whatsapp"
echo "   Phone: ${PHONE_NUMBER}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\": \"${PHONE_NUMBER}\"}" \
  "${SUPABASE_URL}/functions/v1/get-company-by-whatsapp")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Resposta (HTTP $HTTP_CODE):"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
  echo ""
  echo "✅ Sucesso! Empresa encontrada."
  exit 0
else
  echo ""
  echo "❌ Erro HTTP $HTTP_CODE"
  exit 1
fi
