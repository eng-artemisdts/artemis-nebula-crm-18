# 🚀 Deploy das Edge Functions OAuth

Este guia explica como fazer deploy das novas edge functions `oauth-connect` e `oauth-callback`.

## 📋 Funções Criadas

1. **oauth-connect** - Inicia o fluxo OAuth e gera URL de autorização
2. **oauth-callback** - Recebe o callback OAuth, troca código por tokens e salva configuração

## 🚀 Método 1: Deploy via Dashboard (Recomendado - Mais Fácil)

### Passo 1: Acessar o Dashboard

1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/functions
2. Faça login se necessário

### Passo 2: Deploy da função `oauth-connect`

1. Clique em **"Create a new function"** ou **"New Function"**
2. Nome da função: `oauth-connect`
3. Cole o conteúdo do arquivo: `supabase/functions/oauth-connect/index.ts`
4. Clique em **"Deploy"**

### Passo 3: Deploy da função `oauth-callback`

1. Clique em **"Create a new function"** novamente
2. Nome da função: `oauth-callback`
3. Cole o conteúdo do arquivo: `supabase/functions/oauth-callback/index.ts`
4. Clique em **"Deploy"**

### Passo 4: Configurar Secrets (Obrigatório)

Após o deploy, configure as credenciais OAuth:

1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/settings/functions
2. Vá em **Secrets**
3. Adicione as seguintes variáveis:

**Para Google Calendar/Gmail:**
```
GMAIL_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=seu-client-secret
```

**Opcional - Separado para Google Calendar:**
```
GOOGLE_CALENDAR_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=seu-client-secret
```

**Para Outlook:**
```
OUTLOOK_CLIENT_ID=seu-client-id
OUTLOOK_CLIENT_SECRET=seu-client-secret
```

**Opcional - Separado para Outlook Calendar:**
```
OUTLOOK_CALENDAR_CLIENT_ID=seu-client-id
OUTLOOK_CALENDAR_CLIENT_SECRET=seu-client-secret
```

### Passo 5: Configurar Redirect URI no Google/Microsoft

**Google (Gmail/Calendar):**
1. Acesse: https://console.cloud.google.com/apis/credentials
2. Edite suas credenciais OAuth 2.0
3. Adicione o Redirect URI:
   ```
   https://lyqcsclmauwmzipjiazs.supabase.co/functions/v1/oauth-callback
   ```

**Microsoft (Outlook/Calendar):**
1. Acesse: https://portal.azure.com/
2. Vá em "Azure Active Directory" > "App registrations"
3. Selecione seu app
4. Vá em "Authentication"
5. Adicione o Redirect URI:
   ```
   https://lyqcsclmauwmzipjiazs.supabase.co/functions/v1/oauth-callback
   ```

## 🖥️ Método 2: Deploy via CLI

### Pré-requisitos

1. Supabase CLI instalado:
   ```bash
   npm install -g supabase
   # ou
   brew install supabase/tap/supabase
   ```

2. Login no Supabase:
   ```bash
   supabase login
   ```

3. Linkar o projeto:
   ```bash
   supabase link --project-ref lyqcsclmauwmzipjiazs
   ```

### Deploy

```bash
# Deploy das novas functions
supabase functions deploy oauth-connect
supabase functions deploy oauth-callback

# Ou deploy de todas as functions (incluindo as novas)
./deploy-functions.sh
```

### Configurar Secrets via CLI

```bash
supabase secrets set GMAIL_CLIENT_ID=seu-client-id.apps.googleusercontent.com
supabase secrets set GMAIL_CLIENT_SECRET=seu-client-secret
supabase secrets set OUTLOOK_CLIENT_ID=seu-client-id
supabase secrets set OUTLOOK_CLIENT_SECRET=seu-client-secret
```

## ✅ Verificar Deploy

### Via Dashboard:
1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/functions
2. Verifique se `oauth-connect` e `oauth-callback` aparecem na lista

### Via CLI:
```bash
supabase functions list
```

## 🧪 Testar

1. Acesse a página de configuração de componentes
2. Selecione um componente que requer OAuth (ex: Google Calendar)
3. Clique em "Conectar com Google Calendar"
4. Deve abrir um popup com a tela de autorização do Google
5. Após autorizar, deve retornar e mostrar "Conectado com sucesso"

## 🐛 Troubleshooting

### Erro: "Credenciais OAuth não configuradas"
→ Configure os secrets `GMAIL_CLIENT_ID` e `GMAIL_CLIENT_SECRET` no Supabase

### Erro: "redirect_uri_mismatch"
→ Verifique se o Redirect URI está configurado corretamente nas credenciais OAuth do Google/Microsoft

### Erro: "Function not found"
→ Verifique se as functions foram deployadas corretamente

### Erro: "Unauthorized"
→ Verifique se o usuário está autenticado e o token JWT está sendo enviado

## 📚 Documentação Relacionada

- **Secrets necessários:** `EDGE_FUNCTIONS_SECRETS.md`
- **Configuração completa:** `EDGE_FUNCTIONS_SETUP.md`
- **Quick start:** `QUICK_START_EDGE_FUNCTIONS.md`


