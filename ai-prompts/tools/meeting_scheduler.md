# Tool: meeting_scheduler

## Identificador
`meeting_scheduler`

## Descrição
Use para agendar reuniões quando o lead solicitar. Sempre confirme data, hora e duração antes de agendar.

## Quando Usar

Quando o lead solicitar agendamento de reunião, demonstração, consulta ou qualquer compromisso que precise ser marcado no calendário.

## Parâmetros Obrigatórios

- **`title`** (string): Título do evento/reunião. Exemplo: "Demonstração de Produto", "Consulta Comercial", "Reunião de Follow-up"
- **`startDateTime`** (string): Data e hora de início no formato ISO 8601 (ex: "2025-12-22T14:00:00-03:00"). Deve incluir timezone
- **`endDateTime`** (string): Data e hora de término no formato ISO 8601 (ex: "2025-12-22T15:00:00-03:00"). Deve incluir timezone
- **`organizationId`** (string): ID da organização. Use o campo `id` do objeto `organization` fornecido no contexto (ex: `{{ $json.organization.id }}`)

## Parâmetros Opcionais

- **`description`** (string): Descrição detalhada do evento. Pode incluir agenda, pontos a discutir, preparação necessária, etc.
- **`location`** (string): Localização física do evento. Pode ser endereço completo, sala de reunião, link de videoconferência, etc.
- **`attendees`** (array de strings): Lista de emails dos participantes que devem receber convite. **CRÍTICO:** Apenas emails válidos, NÃO use WhatsApp IDs (ex: NÃO use "553182936068@whatsapp"). Exemplo: ["cliente@email.com", "vendedor@empresa.com"]

## Formato de Chamada

```
[TOOL:meeting_scheduler]
[PARAMS:{
  "title": "Demonstração de Produto",
  "description": "Apresentação completa das funcionalidades do produto para o cliente",
  "startDateTime": "2025-12-22T14:00:00-03:00",
  "endDateTime": "2025-12-22T15:00:00-03:00",
  "location": "Sala de Reuniões A ou Link: https://meet.google.com/xxx-yyyy-zzz",
  "attendees": ["cliente@email.com"],
  "organizationId": "8e57dada-bc65-42c9-8a96-1cb5b67ab95f"
}]
```

## Comportamento

- A tool verifica automaticamente a disponibilidade no calendário antes de criar o evento
- Cria o evento no calendário conectado (Google Calendar ou Outlook Calendar)
- Envia convites automaticamente para os participantes listados em `attendees`
- Retorna `eventId` e `eventUrl` (link para visualizar o evento no calendário)
- Suporta múltiplos calendários e gestão de conflitos de horário

## Exemplos de Uso

- Agendar demonstração de produto: Use quando o lead demonstrar interesse em conhecer o produto
- Marcar consulta comercial: Use quando o lead quiser uma reunião para discutir necessidades
- Organizar follow-up: Use para agendar reuniões de acompanhamento
- Gerenciar agenda de vendas: Use para organizar compromissos comerciais

## Importante

- **CRÍTICO - Validação de Email em `attendees`:** NUNCA use emails no formato WhatsApp ID (ex: "553182936068@whatsapp", "553182936068@lid", etc.) no array `attendees`. Estes NÃO são emails válidos e não podem receber convites de calendário.
- **Solicite o email ao lead:** Se o email do lead não estiver disponível no perfil ou se o único email disponível for um WhatsApp ID, você DEVE solicitar o email válido ao lead antes de agendar. Pergunte educadamente: "Para enviar o convite da reunião por email, preciso do seu endereço de email. Pode me informar?"
- **Sempre inclua o `organizationId`** - Use o campo `id` do objeto `organization` fornecido no contexto
- Sempre confirme data, hora e duração com o lead antes de agendar
- Verifique se há preferência de horário ou dia da semana
- Se o lead mencionar um horário específico, use exatamente esse horário
- Se não houver horário específico, sugira opções e aguarde confirmação
- Sempre inclua o email do lead em `attendees` se disponível e válido (não WhatsApp ID)
- Use `description` para incluir contexto relevante da conversa
- Verifique disponibilidade e prefira horários comerciais quando não especificado pelo lead

