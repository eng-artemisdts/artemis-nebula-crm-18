# 🚀 Quick Start - Edge Functions

Guia rápido para configurar e fazer deploy das Edge Functions.

## ⚡ Passos Rápidos

### 1. Login e Link do Projeto

```bash
supabase login
supabase link --project-ref lyqcsclmauwmzipjiazs
```

### 2. Configurar Secrets (Opcional)

⚠️ **IMPORTANTE:** Variáveis `SUPABASE_*` são automáticas - NÃO configure!

**Opção A - Via Script Interativo:**
```bash
./setup-secrets.sh
```

**Opção B - Manualmente (apenas serviços externos):**
```bash
# Configure apenas os secrets que você precisa (exemplos):
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set EVOLUTION_API_URL=https://api.evolution.com
supabase secrets set EVOLUTION_API_KEY=sua-chave-evolution
```

### 3. Fazer Deploy das Functions

**Opção A - Script Automatizado:**
```bash
./deploy-functions.sh
```

**Opção B - Manualmente:**
```bash
supabase functions deploy
```

### 4. Verificar Deploy

```bash
supabase functions list
```

## 📚 Documentação Completa

- **Configuração detalhada:** `EDGE_FUNCTIONS_SETUP.md`
- **Secrets necessários:** `EDGE_FUNCTIONS_SECRETS.md`

## ✅ Checklist Mínimo

- [ ] Login no Supabase CLI
- [ ] Projeto linkado
- [ ] ⚠️ Variáveis SUPABASE_* são automáticas - NÃO configure!
- [ ] Secrets opcionais configurados (se necessário)
- [ ] Functions deployadas
- [ ] Functions testadas

## 🆘 Problemas Comuns

**Erro: "Function not found"**
→ Execute: `supabase functions deploy <function-name>`

**Erro: "Missing environment variables"**
→ Configure os secrets necessários: `./setup-secrets.sh`
→ ⚠️ Lembre-se: variáveis `SUPABASE_*` são automáticas!

**Erro: "Name must not start with the SUPABASE_ prefix"**
→ Você tentou configurar uma variável SUPABASE_* - elas são automáticas!
→ Remova essas variáveis e configure apenas secrets de serviços externos

**Erro: "Unauthorized"**
→ Verifique se o JWT está sendo enviado corretamente

## 📞 Ajuda

Consulte os arquivos de documentação:
- `EDGE_FUNCTIONS_SETUP.md` - Guia completo
- `EDGE_FUNCTIONS_SECRETS.md` - Lista de secrets

