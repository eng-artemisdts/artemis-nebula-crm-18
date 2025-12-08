# Exemplo de Teste - get-company-by-whatsapp

## ✅ Deploy Concluído

A função `get-company-by-whatsapp` foi deployada com sucesso!

## 🔑 Como Obter um Token de Acesso

A função requer autenticação de usuário. Para obter um token:

1. **Via Console do Navegador:**
   - Faça login na aplicação
   - Abra o console (F12)
   - Execute:
   ```javascript
   const { data } = await supabase.auth.getSession();
   console.log(data.session?.access_token);
   ```

2. **Via API (criar sessão):**
   ```bash
   curl -X POST 'https://lyqcsclmauwmzipjiazs.supabase.co/auth/v1/token?grant_type=password' \
     -H "apikey: SUA_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "seu-email@exemplo.com",
       "password": "sua-senha"
     }'
   ```

## 📝 Exemplo de Curl

```bash
curl -X POST \
  'https://lyqcsclmauwmzipjiazs.supabase.co/functions/v1/get-company-by-whatsapp' \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "5511999999999"
  }'
```

## 📋 Resposta Esperada

```json
{
  "success": true,
  "organization": {
    "id": "uuid-da-organizacao",
    "name": "Nome da Empresa",
    "company_name": "Nome Comercial",
    "phone": "11999999999",
    "cnpj": "12345678000190",
    "address": "Endereço",
    "website": "https://exemplo.com",
    "logo_url": "https://...",
    "plan": "free",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "default_ai_context": {
    "id": "uuid-da-ia",
    "name": "Configuração Padrão",
    "conversation_focus": "Vendas",
    "main_objective": "Converter leads",
    "priority": "high",
    "tone": "professional",
    "rejection_action": "follow_up",
    "additional_instructions": "...",
    "closing_instructions": "..."
  },
  "statuses": [
    {
      "id": "uuid",
      "status_key": "new",
      "label": "Novo",
      "is_required": true,
      "display_order": 0
    },
    ...
  ]
}
```

## ⚠️ Notas

- O número de WhatsApp deve corresponder a uma instância **conectada** (`status = "connected"`)
- O número será normalizado automaticamente (caracteres não numéricos removidos)
- Se não encontrar instância: retorna 404
- Se não houver IA padrão configurada: `default_ai_context` será `null`
