#!/bin/bash

# Exemplo de teste para get-company-by-whatsapp
# 
# IMPORTANTE: Esta função requer autenticação de usuário (não apenas anon key)
# 
# Para obter um token de acesso:
# 1. Faça login na aplicação web
# 2. Abra o console do navegador (F12)
# 3. Execute no console:
#    const session = await supabase.auth.getSession();
#    console.log(session.data.session?.access_token);
# 4. Copie o token e use no comando abaixo

SUPABASE_URL="https://lyqcsclmauwmzipjiazs.supabase.co"
PHONE_NUMBER="5511999999999"  # Substitua por um número real de uma instância conectada
ACCESS_TOKEN="SEU_TOKEN_AQUI"  # Substitua pelo token obtido acima

echo "🚀 Testando get-company-by-whatsapp..."
echo "   URL: ${SUPABASE_URL}/functions/v1/get-company-by-whatsapp"
echo "   Phone: ${PHONE_NUMBER}"
echo ""

curl -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\": \"${PHONE_NUMBER}\"}" \
  "${SUPABASE_URL}/functions/v1/get-company-by-whatsapp" | python3 -m json.tool 2>/dev/null || \
curl -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\": \"${PHONE_NUMBER}\"}" \
  "${SUPABASE_URL}/functions/v1/get-company-by-whatsapp"

echo ""
echo ""
echo "📝 Exemplo de resposta esperada:"
echo '{'
echo '  "success": true,'
echo '  "organization": {'
echo '    "id": "...",'
echo '    "name": "...",'
echo '    "company_name": "...",'
echo '    ...'
echo '  },'
echo '  "default_ai_context": { ... },'
echo '  "statuses": [ ... ]'
echo '}'
