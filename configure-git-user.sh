#!/bin/bash

# Script para configurar o usuário Git apenas para este projeto
# Isso garante que os commits usem o email correto para o Vercel

echo "🔧 Configurando usuário Git apenas para este projeto..."
echo ""

# Verificar configuração atual
echo "📋 Configuração atual:"
echo "   Nome: $(git config user.name)"
echo "   Email: $(git config user.email)"
echo ""

# Solicitar email do GitHub
echo "⚠️  IMPORTANTE: Use o email vinculado à sua conta GitHub para o Vercel reconhecer os commits"
echo ""
read -p "Digite o email da sua conta GitHub: " github_email

if [ -z "$github_email" ]; then
    echo "❌ Email não pode estar vazio"
    exit 1
fi

# Solicitar nome (opcional, manter o atual se não informado)
read -p "Digite seu nome (ou pressione Enter para manter '$(git config user.name)'): " user_name

if [ -z "$user_name" ]; then
    user_name=$(git config user.name)
fi

# Configurar apenas para este repositório (--local)
echo ""
echo "⚙️  Configurando Git apenas para este projeto..."
git config --local user.name "$user_name"
git config --local user.email "$github_email"

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "📋 Nova configuração:"
echo "   Nome: $(git config --local user.name)"
echo "   Email: $(git config --local user.email)"
echo ""
echo "💡 Esta configuração é apenas para este projeto e não afeta outros repositórios"
echo ""
