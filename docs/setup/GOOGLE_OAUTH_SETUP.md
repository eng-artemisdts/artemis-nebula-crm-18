# Configuração do Google OAuth

## 🔴 Erro: redirect_uri_mismatch

Este erro ocorre quando a URL de redirecionamento não está registrada no Google OAuth Console.

**Mensagem de erro típica:**
```
Erro 400: redirect_uri_mismatch
Acesso bloqueado: a solicitação desse app é inválida
```

## ✅ Solução Passo a Passo

### Passo 1: Identificar a URL de Redirecionamento

A URL de redirecionamento é construída automaticamente como: `${window.location.origin}/oauth/callback`

**Para descobrir qual URL está sendo usada:**

1. **Método 1 - Console do Navegador (Mais Rápido):**
   - Abra o console do navegador (F12 ou Cmd+Option+I no Mac)
   - Vá na aba **Console**
   - Tente fazer login com Google novamente
   - Procure pela mensagem: `🔗 OAuth Connect - URLs:`
   - Copie o valor de `redirectUri` que aparece no log

2. **Método 2 - Verificar Manualmente:**
   - Olhe a barra de endereço do navegador
   - A URL de redirecionamento será: `[URL_ATUAL]/oauth/callback`
   - Exemplos:
     - Se você está em `http://localhost:8080` → `http://localhost:8080/oauth/callback`
     - Se você está em `https://meuapp.com` → `https://meuapp.com/oauth/callback`
     - Se você está em `http://localhost:5173` → `http://localhost:5173/oauth/callback`

3. **Método 3 - Logs do Supabase:**
   - Acesse: https://supabase.com/dashboard/project/lyqcsclmauwmzipjiazs/functions
   - Clique em `oauth-connect`
   - Veja os logs recentes - você verá a `redirectUri` sendo logada

### Passo 2: Adicionar a URL no Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione seu projeto (ou crie um novo se necessário)
3. Vá em **APIs & Services** > **Credentials** (ou **Credenciais**)
4. Encontre e clique no **OAuth 2.0 Client ID** que você está usando
   - Se não tiver um, clique em **+ CREATE CREDENTIALS** > **OAuth client ID**
   - Configure como **Web application**
5. Na seção **Authorized redirect URIs**, clique em **+ ADD URI**
6. Adicione a URL que você identificou no Passo 1
   - **IMPORTANTE**: Copie e cole exatamente como aparece (incluindo http/https, porta, etc.)
   - Exemplo: `http://localhost:8080/oauth/callback`
7. Clique em **SAVE** (Salvar)

### Passo 3: Adicionar Todas as URLs Necessárias

Certifique-se de adicionar **todas** as URLs que você pode usar:

- **Desenvolvimento local:**
  - `http://localhost:8080/oauth/callback`
  - `http://localhost:5173/oauth/callback` (se usar Vite na porta padrão)
  - `http://localhost:3000/oauth/callback` (se usar outra porta)

- **Produção:**
  - `https://seu-dominio.com/oauth/callback`
  - `https://www.seu-dominio.com/oauth/callback` (se usar www)

- **Staging/Teste:**
  - Qualquer outra URL de ambiente que você use

### Passo 4: Verificar e Testar

1. **Salve as alterações** no Google Cloud Console
2. **Aguarde 1-2 minutos** para a propagação das mudanças
3. **Tente fazer login novamente** com o Google
4. Se ainda der erro, verifique:
   - Se a URL está **exatamente** igual (sem espaços, sem barras extras)
   - Se você salvou as alterações
   - Se aguardou tempo suficiente para propagação

## 🔍 Verificação Rápida no Console

Para verificar rapidamente qual URL está sendo usada, abra o console do navegador (F12) e execute:

```javascript
console.log('📍 URL Atual:', window.location.origin);
console.log('🔗 URL de Callback:', window.location.origin + '/oauth/callback');
console.log('✅ Esta URL deve estar registrada no Google Cloud Console');
```

## ⚠️ Problemas Comuns

### URL não está sendo aceita
- Verifique se não há espaços antes ou depois da URL
- Certifique-se de que não há barra no final (`/oauth/callback` e não `/oauth/callback/`)
- URLs são case-sensitive - use exatamente como aparece

### Erro persiste após adicionar
- Aguarde mais tempo (pode levar até 5 minutos para propagar)
- Limpe o cache do navegador (Ctrl+Shift+Delete ou Cmd+Shift+Delete)
- Tente em uma janela anônima/privada
- Verifique se você está usando o OAuth Client ID correto

### Não sei qual OAuth Client ID usar
- Se você tem múltiplos projetos, verifique qual Client ID está configurado nas variáveis de ambiente
- Verifique os secrets do Supabase: `GMAIL_CLIENT_ID` ou `GOOGLE_CALENDAR_CLIENT_ID`
- O Client ID deve corresponder ao projeto onde você está adicionando as URLs

## 📝 Exemplo Completo

**Cenário:** Você está desenvolvendo localmente em `http://localhost:8080`

1. **Identificar URL:** `http://localhost:8080/oauth/callback`
2. **No Google Cloud Console:**
   - Vá em **APIs & Services** > **Credentials**
   - Clique no seu OAuth 2.0 Client ID
   - Em **Authorized redirect URIs**, adicione: `http://localhost:8080/oauth/callback`
   - Clique em **SAVE**
3. **Aguarde 1-2 minutos**
4. **Teste novamente**

## 🚀 Para Produção

Quando for fazer deploy em produção:

1. Identifique a URL de produção (ex: `https://meuapp.vercel.app`)
2. Adicione no Google Cloud Console: `https://meuapp.vercel.app/oauth/callback`
3. Certifique-se de que as variáveis de ambiente no Supabase estão configuradas corretamente

## 📚 Recursos Adicionais

- [Documentação do Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Troubleshooting OAuth](https://developers.google.com/identity/protocols/oauth2/policies#uri-validation)

