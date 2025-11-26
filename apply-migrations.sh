#!/bin/bash

# Script para aplicar migrations no Supabase
# Este script aplica todas as migrations do diretório supabase/migrations

echo "🚀 Aplicando migrations no Supabase..."
echo ""

# Verifica se está logado
if ! supabase projects list > /dev/null 2>&1; then
    echo "❌ Você precisa fazer login no Supabase primeiro."
    echo "Execute: supabase login"
    echo "Depois execute este script novamente."
    exit 1
fi

# Verifica se o projeto está linkado
PROJECT_REF="lyqcsclmauwmzipjiazs"

echo "📋 Verificando link com o projeto Supabase..."
if ! supabase link --project-ref $PROJECT_REF 2>/dev/null; then
    echo "⚠️  Projeto já está linkado ou ocorreu um erro."
fi

echo ""
echo "📦 Aplicando migrations..."
supabase db push

echo ""
echo "✅ Migrations aplicadas com sucesso!"

