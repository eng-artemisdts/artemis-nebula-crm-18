# 🔄 Agendamento de Reuniões

Fluxo responsável por criar eventos em calendários externos (Google Calendar ou Outlook Calendar) para agendar reuniões com clientes.

## Como funciona

1. **Payload:** Recebe `title`, `startDateTime`, `endDateTime`, `description`, `location` e `attendees`.
2. **VALIDAÇÃO:** Verifica autenticação do usuário e se possui calendário conectado.
3. **IDENTIFICAÇÃO:** Identifica o provedor configurado (`google_calendar` ou `outlook_calendar`).
4. **HTTP Request:** Envia POST para a API do provedor (Google Calendar API ou Microsoft Graph API).
5. **Retorno:** Retorna `eventId` e `eventUrl` do evento criado.

## Quando é chamado

- Agendamento manual pelo usuário
- Após envio de proposta → `meeting_scheduled`
- Quando lead solicita agendamento via formulário/chat
- Workflow de vendas que requer reunião

## Resultado

Cria evento no calendário do usuário conectado, envia convites aos participantes e mantém sincronização em todos os dispositivos.

