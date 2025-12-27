# Secrets Necessários para Edge Functions

## ⚠️ IMPORTANTE: Variáveis SUPABASE_ são Automáticas

O Supabase **fornece automaticamente** as seguintes variáveis para todas as Edge Functions:
- `SUPABASE_URL` - Disponível automaticamente
- `SUPABASE_ANON_KEY` - Disponível automaticamente
- `SUPABASE_SERVICE_ROLE_KEY` - Disponível automaticamente

**Você NÃO precisa configurar essas variáveis como secrets!** Elas já estão disponíveis nas Edge Functions.

## 🔑 Secrets que Precisam ser Configurados

Apenas configure os secrets abaixo que são específicos para funcionalidades externas:

## 💳 Secrets para Funções de Pagamento

### create-payment-link
### handle-stripe-webhook

```bash
STRIPE_SECRET_KEY=sk_test_...ou_sk_live_...
```

**Como obter:**
1. Acesse: https://dashboard.stripe.com/apikeys
2. Copie a **Secret key** (test ou live)

## 📱 Secrets para Funções WhatsApp (Evolution API)

### evolution-create-instance
### evolution-connect-instance
### evolution-delete-instance
### evolution-instance-status
### evolution-send-message
### evolution-webhook

```bash
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-evolution-api
```

**Como obter:**
- Consulte a documentação da sua Evolution API
- Ou configure sua própria instância Evolution API

## 🔍 Secrets para Busca de Negócios

### search-nearby-businesses

```bash
GOOGLE_PLACES_API_KEY=sua-chave-google-places
```

**Como obter:**
1. Acesse: https://console.cloud.google.com/apis/credentials
2. Crie uma API Key para Google Places API
3. Habilite a API: https://console.cloud.google.com/apis/library/places-backend.googleapis.com

## 📁 Secrets para Google Drive

### upload-to-google-drive

```bash
GOOGLE_DRIVE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=seu-client-secret
GOOGLE_DRIVE_REFRESH_TOKEN=seu-refresh-token
```

**Como obter:**
1. Acesse: https://console.cloud.google.com/apis/credentials
2. Crie credenciais OAuth 2.0
3. Configure o redirect URI
4. Obtenha o refresh token usando o OAuth flow

## 🔐 Secrets para OAuth (Gmail e Google Calendar)

### oauth-connect
### oauth-callback

**Para Gmail:**
```bash
GMAIL_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=seu-client-secret
```

**Para Google Calendar (pode usar as mesmas credenciais do Gmail ou criar separadas):**
```bash
GOOGLE_CALENDAR_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=seu-client-secret
```

**Nota:** Se não configurar `GOOGLE_CALENDAR_CLIENT_ID` e `GOOGLE_CALENDAR_CLIENT_SECRET`, a função usará as credenciais do Gmail.

**Como obter:**
1. Acesse: https://console.cloud.google.com/apis/credentials
2. Crie credenciais OAuth 2.0 Client ID
3. Configure o tipo de aplicativo como "Aplicativo da Web"
4. Adicione o redirect URI: `https://[seu-projeto].supabase.co/functions/v1/oauth-callback`
5. Habilite as APIs necessárias:
   - Para Gmail: Gmail API
   - Para Google Calendar: Google Calendar API
6. Copie o Client ID e Client Secret

## 📧 Secrets para OAuth (Outlook e Outlook Calendar)

### oauth-connect
### oauth-callback

**Para Outlook:**
```bash
OUTLOOK_CLIENT_ID=seu-client-id
OUTLOOK_CLIENT_SECRET=seu-client-secret
```

**Para Outlook Calendar (pode usar as mesmas credenciais do Outlook ou criar separadas):**
```bash
OUTLOOK_CALENDAR_CLIENT_ID=seu-client-id
OUTLOOK_CALENDAR_CLIENT_SECRET=seu-client-secret
```

**Nota:** Se não configurar `OUTLOOK_CALENDAR_CLIENT_ID` e `OUTLOOK_CALENDAR_CLIENT_SECRET`, a função usará as credenciais do Outlook.

**Como obter:**
1. Acesse: https://portal.azure.com/
2. Vá em "Azure Active Directory" > "App registrations"
3. Clique em "New registration"
4. Configure o Redirect URI: `https://[seu-projeto].supabase.co/functions/v1/oauth-callback`
5. Vá em "Certificates & secrets" e crie um novo client secret
6. Copie o Application (client) ID e o Client secret
7. Configure as permissões necessárias:
   - Para Outlook: `Mail.Send`, `User.Read`
   - Para Outlook Calendar: `Calendars.ReadWrite`, `User.Read`

## 🤖 Secrets para IA

### suggest-categories

```bash
OPENAI_API_KEY=sk-...
```

**Como obter:**
1. Acesse: https://platform.openai.com/api-keys
2. Crie uma nova API key
3. Copie a chave (ela só aparece uma vez!)

## ✅ Functions que NÃO precisam de secrets adicionais

Estas functions só usam as variáveis automáticas do Supabase:

- **create-admin-user** - Usa apenas variáveis automáticas SUPABASE_*

## 🚀 Como Configurar os Secrets

### Via Dashboard (Recomendado para iniciantes):

1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/settings/functions
2. Vá em **Secrets**
3. Clique em **Add new secret**
4. Adicione cada variável uma por uma

**⚠️ NÃO adicione variáveis com prefixo `SUPABASE_` - elas são automáticas!**

### Via CLI:

```bash
# ⚠️ NÃO configure SUPABASE_URL, SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY
# Essas variáveis são fornecidas automaticamente pelo Supabase

# Secrets opcionais (conforme necessário)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...  # Para handle-stripe-webhook
supabase secrets set EVOLUTION_API_URL=https://api.evolution.com
supabase secrets set EVOLUTION_API_KEY=sua-chave-evolution
supabase secrets set GOOGLE_PLACES_API_KEY=sua-chave-google
supabase secrets set GOOGLE_DRIVE_CLIENT_ID=seu-client-id
supabase secrets set GOOGLE_DRIVE_CLIENT_SECRET=seu-client-secret
supabase secrets set GOOGLE_DRIVE_REFRESH_TOKEN=seu-refresh-token
supabase secrets set GMAIL_CLIENT_ID=seu-client-id  # Para oauth-connect/oauth-callback
supabase secrets set GMAIL_CLIENT_SECRET=seu-client-secret  # Para oauth-connect/oauth-callback
supabase secrets set GOOGLE_CALENDAR_CLIENT_ID=seu-client-id  # Opcional - para oauth-connect/oauth-callback
supabase secrets set GOOGLE_CALENDAR_CLIENT_SECRET=seu-client-secret  # Opcional - para oauth-connect/oauth-callback
supabase secrets set OUTLOOK_CLIENT_ID=seu-client-id  # Para oauth-connect/oauth-callback
supabase secrets set OUTLOOK_CLIENT_SECRET=seu-client-secret  # Para oauth-connect/oauth-callback
supabase secrets set OUTLOOK_CALENDAR_CLIENT_ID=seu-client-id  # Opcional - para oauth-connect/oauth-callback
supabase secrets set OUTLOOK_CALENDAR_CLIENT_SECRET=seu-client-secret  # Opcional - para oauth-connect/oauth-callback
supabase secrets set OPENAI_API_KEY=sk-...  # Para suggest-categories
```

### Verificar Secrets Configurados:

```bash
supabase secrets list
```

## 📋 Checklist Rápido

- [ ] ⚠️ `SUPABASE_*` variáveis são automáticas - NÃO configure!
- [ ] `STRIPE_SECRET_KEY` (se usar pagamentos)
- [ ] `STRIPE_WEBHOOK_SECRET` (se usar handle-stripe-webhook)
- [ ] `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` (se usar WhatsApp)
- [ ] `GOOGLE_PLACES_API_KEY` (se usar busca de negócios)
- [ ] `GOOGLE_DRIVE_*` (se usar upload no Drive)
- [ ] `GMAIL_CLIENT_ID` e `GMAIL_CLIENT_SECRET` (se usar Gmail)
- [ ] `GOOGLE_CALENDAR_CLIENT_ID` e `GOOGLE_CALENDAR_CLIENT_SECRET` (se usar Google Calendar, opcional - pode usar credenciais do Gmail)
- [ ] `OUTLOOK_CLIENT_ID` e `OUTLOOK_CLIENT_SECRET` (se usar Outlook)
- [ ] `OUTLOOK_CALENDAR_CLIENT_ID` e `OUTLOOK_CALENDAR_CLIENT_SECRET` (se usar Outlook Calendar, opcional - pode usar credenciais do Outlook)
- [ ] `OPENAI_API_KEY` (se usar suggest-categories)

## ⚠️ Importante

1. **NUNCA** configure secrets com prefixo `SUPABASE_` - eles são automáticos!
2. **NUNCA** commite secrets no código
3. **NUNCA** exponha secrets no frontend
4. Use secrets do Supabase para armazenar credenciais externas
5. Rotacione as chaves regularmente
6. Use chaves de teste em desenvolvimento

