# 🔧 Correção: Erro "Name must not start with the SUPABASE_ prefix"

## ❌ Problema

Ao tentar configurar secrets no Supabase, você recebe o erro:
```
Name must not start with the SUPABASE_ prefix
```

## ✅ Solução

**Variáveis com prefixo `SUPABASE_` são fornecidas automaticamente pelo Supabase!**

Você **NÃO precisa** (e **NÃO pode**) configurá-las como secrets. Elas já estão disponíveis automaticamente em todas as Edge Functions.

### Variáveis Automáticas (NÃO configure):

- ❌ `SUPABASE_URL` - Automática
- ❌ `SUPABASE_ANON_KEY` - Automática  
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - Automática

### Variáveis que Você DEVE Configurar (se necessário):

- ✅ `STRIPE_SECRET_KEY` - Para pagamentos
- ✅ `STRIPE_WEBHOOK_SECRET` - Para webhook do Stripe
- ✅ `EVOLUTION_API_URL` - Para WhatsApp
- ✅ `EVOLUTION_API_KEY` - Para WhatsApp
- ✅ `GOOGLE_PLACES_API_KEY` - Para busca de negócios
- ✅ `GOOGLE_DRIVE_CLIENT_ID` - Para upload no Drive
- ✅ `GOOGLE_DRIVE_CLIENT_SECRET` - Para upload no Drive
- ✅ `GOOGLE_DRIVE_REFRESH_TOKEN` - Para upload no Drive
- ✅ `OPENAI_API_KEY` - Para suggest-categories

## 🚀 Como Configurar Corretamente

### Via Dashboard:

1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/settings/functions
2. Vá em **Secrets**
3. Adicione **APENAS** os secrets de serviços externos
4. **NÃO** adicione variáveis com prefixo `SUPABASE_`

### Via CLI:

```bash
# ✅ CORRETO - Configure apenas secrets externos
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set EVOLUTION_API_URL=https://api.evolution.com
supabase secrets set EVOLUTION_API_KEY=sua-chave

# ❌ ERRADO - NÃO faça isso!
# supabase secrets set SUPABASE_URL=...  # ERRO!
# supabase secrets set SUPABASE_ANON_KEY=...  # ERRO!
# supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...  # ERRO!
```

### Via Script:

```bash
./setup-secrets.sh
```

O script foi atualizado e não pedirá mais as variáveis `SUPABASE_*`.

## 📝 Resumo

- ✅ Variáveis `SUPABASE_*` = Automáticas (não configure)
- ✅ Secrets de serviços externos = Configure conforme necessário
- ✅ Use o script `setup-secrets.sh` para configurar facilmente

## 🔍 Verificar Secrets Configurados

```bash
supabase secrets list
```

**Nota:** As variáveis `SUPABASE_*` não aparecerão na lista porque são automáticas!

