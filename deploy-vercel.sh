#!/bin/bash

# Script para fazer deploy na Vercel

echo "🚀 Preparando deploy na Vercel..."
echo ""

# Verificar se está logado
if ! vercel whoami > /dev/null 2>&1; then
    echo "❌ Você não está logado na Vercel."
    echo "   Execute: vercel login"
    echo "   Isso abrirá seu navegador para autenticação."
    exit 1
fi

echo "✅ Autenticado na Vercel"
echo ""

# Verificar configuração do Git
echo "📋 Verificando configuração do Git..."
git_email=$(git config user.email)
git_name=$(git config user.name)

if [ -z "$git_email" ] || [ -z "$git_name" ]; then
    echo "❌ Configuração do Git não encontrada para este projeto"
    echo ""
    echo "💡 Execute o script de configuração:"
    echo "   ./configure-git-user.sh"
    echo ""
    echo "   Ou configure manualmente:"
    echo "   git config --local user.email 'seu-email@github.com'"
    echo "   git config --local user.name 'Seu Nome'"
    echo ""
    exit 1
fi

echo "   Nome: $git_name"
echo "   Email: $git_email"
echo ""
echo "⚠️  Certifique-se de que o email acima está vinculado à sua conta GitHub"
echo "   para que o Vercel reconheça os commits corretamente"
echo ""

# Verificar variáveis de ambiente
echo "📋 Verificando variáveis de ambiente..."
echo ""
echo "⚠️  IMPORTANTE: Certifique-se de que as seguintes variáveis estão configuradas:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_PUBLISHABLE_KEY"
echo ""
read -p "As variáveis de ambiente estão configuradas na Vercel? (s/n): " confirm

if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
    echo ""
    echo "📝 Configure as variáveis de ambiente primeiro:"
    echo "   1. Acesse: https://vercel.com/dashboard"
    echo "   2. Selecione seu projeto"
    echo "   3. Vá em Settings > Environment Variables"
    echo "   4. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY"
    echo ""
    exit 1
fi

echo ""
echo "🚀 Iniciando deploy..."
echo ""

# Deploy de produção
vercel --prod

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Verifique se o deploy foi bem-sucedido"
echo "   2. Teste a aplicação na URL fornecida"
echo "   3. Verifique se o login funciona corretamente"
echo ""



