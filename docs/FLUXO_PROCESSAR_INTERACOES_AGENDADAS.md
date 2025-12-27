# Processar Interações Agendadas

## 🔄 Fluxo
1. Cron n8n (1min) → Edge Function
2. Edge Function busca `scheduled_interactions` (status=`pending`, `scheduled_at <= now`)
3. Para cada interação: envia payload para webhook n8n da organização
4. Atualiza status para `active` e lead para `conversation_started`

## ⚙️ Config n8n
**HTTP Request:**
- Method: `POST`
- URL: `https://lyqcsclmauwmzipjiazs.supabase.co/functions/v1/process-scheduled-interactions`
- Header: `Authorization: Bearer {SUPABASE_ANON_KEY}`
- Body: `{}`

**Schedule:** `*/1 * * * *`

## 📦 Payload Webhook
```json
{
  "event": "scheduled_interaction.trigger",
  "instance": "nome_instancia",
  "lead": {...},
  "organization": {...},
  "ai_config": {...},
  "agent_components": [...],
  "scheduledInteraction": {
    "id": "uuid",
    "scheduled_at": "2024-01-01T10:00:00Z",
    "remote_jid": "5511999999999@s.whatsapp.net"
  },
  "phoneNumber": "5511999999999",
  "remoteJid": "5511999999999@s.whatsapp.net"
}
```

## ⚠️ Requisitos
- Webhook n8n configurado em `settings.n8n_webhook_url`
- Instância WhatsApp com status `connected`
- Limite: 50 interações/execução

