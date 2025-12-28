# Guia de Configuração das Edge Functions

Este guia explica como configurar e fazer deploy das Edge Functions no Supabase.

## 📋 Edge Functions do Projeto

O projeto possui as seguintes Edge Functions:

1. **create-admin-user** - Cria usuário admin padrão
2. **create-payment-link** - Cria links de pagamento via Stripe
3. **evolution-create-instance** - Cria instância WhatsApp na Evolution API
4. **evolution-connect-instance** - Conecta instância WhatsApp
5. **evolution-delete-instance** - Deleta instância WhatsApp
6. **evolution-instance-status** - Verifica status da instância
7. **evolution-send-message** - Envia mensagens via WhatsApp
8. **evolution-webhook** - Recebe webhooks da Evolution API
9. **handle-stripe-webhook** - Processa webhooks do Stripe
10. **oauth-connect** - Inicia fluxo OAuth para Gmail, Google Calendar, Outlook
11. **oauth-callback** - Processa callback OAuth e salva tokens
12. **search-nearby-businesses** - Busca negócios próximos (Google Places)
13. **suggest-categories** - Sugere categorias para leads
14. **upload-to-google-drive** - Faz upload de documentos para Google Drive

## 🚀 Método 1: Deploy via Supabase CLI (Recomendado)

### Pré-requisitos

1. Supabase CLI instalado ✅ (já instalado)
2. Login no Supabase CLI
3. Projeto linkado

### Passo a Passo

#### 1. Fazer Login no Supabase CLI

```bash
supabase login
```

Isso abrirá seu navegador para autenticação.

#### 2. Linkar o Projeto (se ainda não estiver linkado)

```bash
supabase link --project-ref lyqcsclmauwmzipjiazs
```

#### 3. Configurar Secrets (Variáveis de Ambiente)

⚠️ **IMPORTANTE:** Variáveis com prefixo `SUPABASE_` são fornecidas automaticamente pelo Supabase e **NÃO precisam ser configuradas**!

As Edge Functions precisam apenas de variáveis de ambiente para serviços externos. Configure-as no Supabase Dashboard:

1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/settings/functions
2. Vá em **Secrets**
3. Adicione apenas as variáveis de serviços externos (veja lista abaixo)

**Para funções de pagamento (create-payment-link, handle-stripe-webhook):**
- `STRIPE_SECRET_KEY` - Chave secreta do Stripe (ex: `sk_test_...`)

**Para funções WhatsApp (evolution-*):**
- `EVOLUTION_API_URL` - URL da sua Evolution API (ex: `https://api.evolution.com`)
- `EVOLUTION_API_KEY` - Chave de API da Evolution

**Para upload no Google Drive (upload-to-google-drive):**
- `GOOGLE_DRIVE_CLIENT_ID` - Client ID do Google OAuth
- `GOOGLE_DRIVE_CLIENT_SECRET` - Client Secret do Google OAuth
- `GOOGLE_DRIVE_REFRESH_TOKEN` - Refresh Token do Google OAuth

#### 4. Fazer Deploy das Functions

**Deploy de todas as functions:**
```bash
supabase functions deploy
```

**Deploy de uma function específica:**
```bash
supabase functions deploy create-admin-user
supabase functions deploy create-payment-link
supabase functions deploy evolution-create-instance
supabase functions deploy evolution-connect-instance
supabase functions deploy evolution-delete-instance
supabase functions deploy evolution-instance-status
supabase functions deploy evolution-send-message
supabase functions deploy evolution-webhook
supabase functions deploy handle-stripe-webhook
supabase functions deploy oauth-connect
supabase functions deploy oauth-callback
supabase functions deploy search-nearby-businesses
supabase functions deploy suggest-categories
supabase functions deploy upload-to-google-drive
```

## 🖥️ Método 2: Deploy via Dashboard do Supabase

### Passo a Passo

1. **Acesse o Dashboard:**
   https://app.supabase.com/project/lyqcsclmauwmzipjiazs/functions

2. **Para cada function:**
   - Clique em "Create a new function"
   - Nomeie a function (ex: `create-admin-user`)
   - Cole o código do arquivo `index.ts` correspondente
   - Configure as variáveis de ambiente (secrets)
   - Clique em "Deploy"

## ⚙️ Configuração de Secrets via CLI

Você também pode configurar secrets via CLI:

```bash
# ⚠️ NÃO configure SUPABASE_URL, SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY
# Essas variáveis são fornecidas automaticamente pelo Supabase

# Configurar apenas secrets de serviços externos
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set EVOLUTION_API_URL=https://api.evolution.com
supabase secrets set EVOLUTION_API_KEY=sua-chave-evolution
supabase secrets set GOOGLE_PLACES_API_KEY=sua-chave-google
supabase secrets set GOOGLE_DRIVE_CLIENT_ID=seu-client-id
supabase secrets set GOOGLE_DRIVE_CLIENT_SECRET=seu-client-secret
supabase secrets set GOOGLE_DRIVE_REFRESH_TOKEN=seu-refresh-token
supabase secrets set OPENAI_API_KEY=sk-...
```

## 🔍 Verificar Status das Functions

### Via CLI:
```bash
supabase functions list
```

### Via Dashboard:
https://app.supabase.com/project/lyqcsclmauwmzipjiazs/functions

## 🧪 Testar uma Function

### Via CLI:
```bash
supabase functions invoke create-admin-user
```

### Via Dashboard:
1. Acesse a function
2. Clique em "Invoke function"
3. Envie um JSON de teste (se necessário)

## 📝 Configurações Especiais

### Funções que não requerem JWT (configuradas no config.toml):

- `handle-stripe-webhook` - Recebe webhooks do Stripe
- `suggest-categories` - Pode ser pública
- `evolution-webhook` - Recebe webhooks da Evolution API

### Funções que requerem JWT:

- `upload-to-google-drive` - Requer autenticação
- Todas as outras functions de Evolution - Requerem autenticação

## 🐛 Troubleshooting

### Erro: "Function not found"
- Verifique se a function foi deployada
- Verifique se o nome está correto

### Erro: "Missing environment variables"
- Verifique se os secrets necessários foram configurados
- Use `supabase secrets list` para verificar
- ⚠️ Lembre-se: variáveis `SUPABASE_*` são automáticas e não aparecem na lista

### Erro: "Unauthorized"
- Verifique se o JWT está sendo enviado corretamente
- Verifique as configurações de `verify_jwt` no `config.toml`

### Ver Logs:
```bash
supabase functions logs create-admin-user
```

Ou via Dashboard:
https://app.supabase.com/project/lyqcsclmauwmzipjiazs/logs/edge-functions

## 📚 Recursos Adicionais

- [Documentação Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

## ✅ Checklist de Configuração

- [ ] Supabase CLI instalado e logado
- [ ] Projeto linkado
- [ ] ⚠️ Variáveis SUPABASE_* são automáticas - NÃO configure!
- [ ] Secrets de serviços externos configurados (conforme necessário)
- [ ] Todas as functions deployadas
- [ ] Functions testadas
- [ ] Logs verificados

## 🚨 Importante

1. **NUNCA** exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend
2. **NUNCA** commite secrets no código
3. Use variáveis de ambiente (secrets) para todas as credenciais
4. Teste as functions após o deploy
5. Monitore os logs regularmente

