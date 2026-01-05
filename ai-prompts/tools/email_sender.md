# Tool: email_sender

## Identificador
`email_sender`

## Descrição
Use para enviar emails quando necessário. Sempre confirme o conteúdo antes de enviar.

## Quando Usar

Quando precisar enviar emails ao lead ou cliente, como:
- Confirmações de agendamento
- Propostas comerciais
- Informações adicionais
- Follow-ups
- Documentos ou materiais

## Parâmetros Obrigatórios

- **`to`** (string): Email do destinatário. **CRÍTICO:** Deve ser um email válido, não um WhatsApp ID (ex: NÃO use "553182936068@whatsapp")
- **`subject`** (string): Assunto do email
- **`body`** (string): Corpo/conteúdo do email
- **`organizationId`** (string): ID da organização. Use o campo `id` do objeto `organization` fornecido no contexto (ex: `{{ $json.organization.id }}`)

## Parâmetros Opcionais

- **`cc`** (array de strings): Lista de emails em cópia
- **`bcc`** (array de strings): Lista de emails em cópia oculta
- **`attachments`** (array de strings): URLs ou caminhos de arquivos anexos

## Formato de Chamada

```
[TOOL:email_sender]
[PARAMS:{
  "to": "cliente@email.com",
  "subject": "Confirmação de Agendamento",
  "body": "Olá! Confirmamos seu agendamento...",
  "organizationId": "8e57dada-bc65-42c9-8a96-1cb5b67ab95f"
}]
```

## Importante

- **CRÍTICO - Validação de Email:** NUNCA use emails no formato WhatsApp ID (ex: "553182936068@whatsapp", "553182936068@lid", etc.). Estes NÃO são emails válidos.
- **Solicite o email ao lead:** Se o email do lead não estiver disponível no perfil ou se o único email disponível for um WhatsApp ID, você DEVE solicitar o email válido ao lead antes de enviar. Pergunte educadamente: "Para enviar o email, preciso do seu endereço de email. Pode me informar?"
- **Sempre confirme o conteúdo antes de enviar**
- **Sempre inclua o `organizationId`** - Use o campo `id` do objeto `organization` fornecido no contexto
- Adapte o tom e estilo do email às configurações do agente
- Certifique-se de que o conteúdo está correto e completo antes de enviar
- Verifique se o email fornecido pelo lead é válido antes de usar na tool

