# 🔧 Resolver Erro: redirect_uri_mismatch

## ⚡ Solução Rápida (2 minutos)

### 1. Descubra a URL que está sendo usada

**Opção A - Console do Navegador:**
1. Abra o console (F12)
2. Tente fazer login com Google
3. Procure por: `🔗 OAuth Connect - URLs:`
4. Copie o valor de `redirectUri`

**Opção B - Olhe a barra de endereço:**
- Se você está em: `http://localhost:8080`
- A URL de callback é: `http://localhost:8080/oauth/callback`

### 2. Adicione no Google Cloud Console

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Clique no seu **OAuth 2.0 Client ID**
3. Em **Authorized redirect URIs**, clique em **+ ADD URI**
4. Cole a URL que você copiou (ex: `http://localhost:8080/oauth/callback`)
5. Clique em **SAVE**
6. Aguarde 1-2 minutos

### 3. Tente novamente

Tente fazer login com Google novamente.

---

## 📋 Checklist

- [ ] Identifiquei a URL de callback (ex: `http://localhost:8080/oauth/callback`)
- [ ] Adicionei a URL no Google Cloud Console
- [ ] Salvei as alterações
- [ ] Aguardei 1-2 minutos
- [ ] Tentei fazer login novamente

---

## ❓ Ainda não funciona?

1. **Verifique se a URL está exatamente igual** (sem espaços, sem barras extras)
2. **Limpe o cache do navegador** (Ctrl+Shift+Delete)
3. **Tente em uma janela anônima**
4. **Verifique os logs do console** - a URL será mostrada automaticamente

---

## 📞 Precisa de ajuda?

Consulte o arquivo `GOOGLE_OAUTH_SETUP.md` para instruções detalhadas.

