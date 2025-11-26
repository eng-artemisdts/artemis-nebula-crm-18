#!/bin/bash

# Script para verificar configuração do Supabase

echo "🔍 Verificando configuração do Supabase..."
echo ""

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "   Crie um arquivo .env baseado no .env.example"
    exit 1
fi

# Verificar variáveis de ambiente
echo "📋 Verificando variáveis de ambiente..."

if grep -q "VITE_SUPABASE_URL=" .env && grep -q "VITE_SUPABASE_PUBLISHABLE_KEY=" .env; then
    SUPABASE_URL=$(grep "VITE_SUPABASE_URL=" .env | cut -d '=' -f2)
    SUPABASE_KEY=$(grep "VITE_SUPABASE_PUBLISHABLE_KEY=" .env | cut -d '=' -f2)
    
    if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "your_supabase_project_url" ]; then
        echo "❌ VITE_SUPABASE_URL não está configurado corretamente"
        echo "   Configure no arquivo .env"
    else
        echo "✅ VITE_SUPABASE_URL está configurado"
        echo "   URL: ${SUPABASE_URL:0:30}..."
    fi
    
    if [ -z "$SUPABASE_KEY" ] || [ "$SUPABASE_KEY" = "your_supabase_anon_key" ]; then
        echo "❌ VITE_SUPABASE_PUBLISHABLE_KEY não está configurado corretamente"
        echo "   Configure no arquivo .env"
    else
        echo "✅ VITE_SUPABASE_PUBLISHABLE_KEY está configurado"
        echo "   Key: ${SUPABASE_KEY:0:20}..."
    fi
else
    echo "❌ Variáveis de ambiente não encontradas no .env"
    echo "   Adicione VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY"
fi

echo ""
echo "📝 Próximos passos se houver problemas:"
echo "   1. Verifique se as migrations foram aplicadas"
echo "   2. Crie um usuário via interface web ou SQL"
echo "   3. Verifique o arquivo TROUBLESHOOTING.md para mais detalhes"
echo ""
echo "💡 Dica: Se você acabou de configurar, crie uma conta em:"
echo "   http://localhost:8080/login (clique em 'Criar conta')"

