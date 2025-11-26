#!/bin/bash

# Script para fazer deploy de todas as Edge Functions

echo "🚀 Fazendo deploy das Edge Functions..."
echo ""

# Verifica se está logado
if ! supabase projects list > /dev/null 2>&1; then
    echo "❌ Você precisa fazer login no Supabase primeiro."
    echo "Execute: supabase login"
    exit 1
fi

# Verifica se o projeto está linkado
PROJECT_REF="lyqcsclmauwmzipjiazs"

echo "📋 Verificando link com o projeto Supabase..."
if ! supabase link --project-ref $PROJECT_REF 2>/dev/null; then
    echo "⚠️  Projeto já está linkado ou ocorreu um erro."
fi

echo ""
echo "📦 Fazendo deploy das functions..."
echo ""

# Lista de functions
FUNCTIONS=(
    "create-admin-user"
    "create-payment-link"
    "evolution-create-instance"
    "evolution-connect-instance"
    "evolution-delete-instance"
    "evolution-instance-status"
    "evolution-send-message"
    "evolution-webhook"
    "handle-stripe-webhook"
    "search-nearby-businesses"
    "suggest-categories"
    "upload-to-google-drive"
)

# Deploy de cada function
for func in "${FUNCTIONS[@]}"; do
    echo "📤 Deployando: $func"
    if supabase functions deploy "$func" 2>&1; then
        echo "✅ $func deployada com sucesso"
    else
        echo "❌ Erro ao fazer deploy de $func"
    fi
    echo ""
done

echo "✅ Deploy concluído!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Configure os secrets necessários:"
echo "      supabase secrets set SUPABASE_URL=..."
echo "      supabase secrets set SUPABASE_SERVICE_ROLE_KEY=..."
echo "   2. Verifique os logs:"
echo "      supabase functions logs <function-name>"
echo "   3. Teste as functions via Dashboard ou CLI"

