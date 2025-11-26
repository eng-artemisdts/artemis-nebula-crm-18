#!/bin/bash

# Script interativo para configurar secrets das Edge Functions

echo "🔐 Configuração de Secrets para Edge Functions"
echo ""

# Verifica se está logado
if ! supabase projects list > /dev/null 2>&1; then
    echo "❌ Você precisa fazer login no Supabase primeiro."
    echo "Execute: supabase login"
    exit 1
fi

echo "📋 Vamos configurar os secrets necessários."
echo ""
echo "⚠️  IMPORTANTE: Variáveis com prefixo SUPABASE_ são automáticas!"
echo "   Você NÃO precisa configurá-las - o Supabase já as fornece."
echo ""
echo "   Você pode pular qualquer secret pressionando Enter"
echo ""

echo "📦 Secrets opcionais (pressione Enter para pular):"
echo ""

read -p "STRIPE_SECRET_KEY (para pagamentos): " STRIPE_SECRET_KEY
if [ ! -z "$STRIPE_SECRET_KEY" ]; then
    supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
    echo "✅ STRIPE_SECRET_KEY configurado"
fi

read -p "STRIPE_WEBHOOK_SECRET (para webhook do Stripe): " STRIPE_WEBHOOK_SECRET
if [ ! -z "$STRIPE_WEBHOOK_SECRET" ]; then
    supabase secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
    echo "✅ STRIPE_WEBHOOK_SECRET configurado"
fi

read -p "EVOLUTION_API_URL (para WhatsApp): " EVOLUTION_API_URL
if [ ! -z "$EVOLUTION_API_URL" ]; then
    supabase secrets set EVOLUTION_API_URL="$EVOLUTION_API_URL"
    echo "✅ EVOLUTION_API_URL configurado"
fi

read -p "EVOLUTION_API_KEY (para WhatsApp): " EVOLUTION_API_KEY
if [ ! -z "$EVOLUTION_API_KEY" ]; then
    supabase secrets set EVOLUTION_API_KEY="$EVOLUTION_API_KEY"
    echo "✅ EVOLUTION_API_KEY configurado"
fi

read -p "GOOGLE_PLACES_API_KEY (para busca de negócios): " GOOGLE_PLACES_API_KEY
if [ ! -z "$GOOGLE_PLACES_API_KEY" ]; then
    supabase secrets set GOOGLE_PLACES_API_KEY="$GOOGLE_PLACES_API_KEY"
    echo "✅ GOOGLE_PLACES_API_KEY configurado"
fi

read -p "GOOGLE_DRIVE_CLIENT_ID (para upload no Drive): " GOOGLE_DRIVE_CLIENT_ID
if [ ! -z "$GOOGLE_DRIVE_CLIENT_ID" ]; then
    supabase secrets set GOOGLE_DRIVE_CLIENT_ID="$GOOGLE_DRIVE_CLIENT_ID"
    echo "✅ GOOGLE_DRIVE_CLIENT_ID configurado"
fi

read -p "GOOGLE_DRIVE_CLIENT_SECRET (para upload no Drive): " GOOGLE_DRIVE_CLIENT_SECRET
if [ ! -z "$GOOGLE_DRIVE_CLIENT_SECRET" ]; then
    supabase secrets set GOOGLE_DRIVE_CLIENT_SECRET="$GOOGLE_DRIVE_CLIENT_SECRET"
    echo "✅ GOOGLE_DRIVE_CLIENT_SECRET configurado"
fi

read -p "GOOGLE_DRIVE_REFRESH_TOKEN (para upload no Drive): " GOOGLE_DRIVE_REFRESH_TOKEN
if [ ! -z "$GOOGLE_DRIVE_REFRESH_TOKEN" ]; then
    supabase secrets set GOOGLE_DRIVE_REFRESH_TOKEN="$GOOGLE_DRIVE_REFRESH_TOKEN"
    echo "✅ GOOGLE_DRIVE_REFRESH_TOKEN configurado"
fi

read -p "OPENAI_API_KEY (para suggest-categories): " OPENAI_API_KEY
if [ ! -z "$OPENAI_API_KEY" ]; then
    supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY"
    echo "✅ OPENAI_API_KEY configurado"
fi

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "💡 Lembrete: Variáveis SUPABASE_* são automáticas e não precisam ser configuradas!"
echo ""
echo "📝 Para verificar os secrets configurados:"
echo "   supabase secrets list"
