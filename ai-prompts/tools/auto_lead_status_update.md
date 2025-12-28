# Tool: auto_lead_status_update

## Identificador
`auto_lead_status_update`

## Descrição
Esta ferramenta atualiza o status de um lead no funil de vendas do sistema Nebula CRM. Quando for chamada, você deve receber exatamente um campo chamado `payload` que contém um objeto JSON com os parâmetros necessários.

## Quando Usar

Use esta tool sempre que identificar que o lead avançou para uma nova etapa do funil de vendas:

- **Quando iniciar a conversa:** Se o lead está com status "new" e você iniciou a conversa, atualize para "conversation_started"
- **Quando agendar reunião/serviço:** Após confirmar agendamento, atualize para "meeting_scheduled" (ou equivalente)
- **Quando enviar proposta/orçamento:** Após enviar proposta ou orçamento, atualize para "proposal_sent" (ou equivalente)
- **Quando fechar negócio:** Se o lead confirmar compra, fechamento ou contratação, atualize para "finished" ou "converted" (ou equivalente)
- **Qualquer avanço significativo:** Qualquer progresso claro no funil de vendas deve resultar em atualização de status

## Estrutura do Payload

A tool espera receber um objeto `payload` com a seguinte estrutura:

```json
{
  "payload": {
    "lead_id": "string (obrigatório)",
    "status_id": "string (obrigatório)",
    "organizationId": "string (obrigatório)",
    "reason": "string (opcional mas recomendado)",
    "metadata": "object (opcional)"
  }
}
```

## Parâmetros Obrigatórios

**`lead_id`** (string, obrigatório)
- **CRÍTICO:** ID do lead que será atualizado (NÃO o nome do lead)
- Deve ser o campo `id` do objeto `lead` fornecido no contexto do prompt
- **NUNCA use o nome do lead** - sempre use o campo `id` do objeto `lead`
- Para encontrar o `lead_id` correto:
  1. Consulte o objeto `lead` fornecido no contexto do prompt
  2. Use o campo `id` desse objeto (ex: `{{ $json.lead.id }}` ou o valor direto como "lead-1766381136319-kibckt9px")
  3. **NUNCA use o campo `name` ou qualquer outro campo - sempre use o campo `id`**
- Exemplo correto: `"lead-1766381136319-kibckt9px"`
- Exemplo incorreto: `"Lead de Teste 03:09"` (este é o nome, não o ID)

**`status_id`** (string, obrigatório)
- ID do status do lead
- **CRÍTICO:** Deve ser o campo `id` (não `status_key`) de um dos objetos de status disponíveis
- Para encontrar o `status_id` correto:
  1. Consulte a lista de `lead_statuses` fornecida no contexto do prompt
  2. Identifique qual status faz sentido baseado no `status_key` ou `label` (ex: "conversation_started", "meeting_scheduled", "proposal_sent", "finished")
  3. Use o campo `id` desse objeto (ex: "8a9271d5-4f9b-4fdb-931e-a3a9224eabc1")
  4. **NUNCA use o `status_key` diretamente - sempre use o `id` do objeto**
- Exemplo: `"8a9271d5-4f9b-4fdb-931e-a3a9224eabc1"`

**`organizationId`** (string, obrigatório)
- ID da organização
- Deve ser um UUID válido da organização
- Exemplo: `"8e57dada-bc65-42c9-8a96-1cb5b67ab95f"`

## Parâmetros Opcionais

**`reason`** (string, opcional mas recomendado)
- Motivo da mudança de status
- É altamente recomendado fornecer um motivo claro que explique o contexto da atualização
- Exemplos:
  - "Lead iniciou conversa e se apresentou"
  - "Lead confirmou agendamento de reunião para 22/12/2025 às 14h"
  - "Lead solicitou proposta comercial após demonstração"
  - "Lead fechou negócio e confirmou compra"

**`metadata`** (object, opcional)
- Informações adicionais sobre a atualização
- Pode incluir dados relevantes do contexto da conversa

## Formato de Chamada

**IMPORTANTE:** O n8n espera que o campo `payload` seja uma string JSON serializada, não um objeto. Você deve enviar o payload como uma string JSON válida.

```
[TOOL:auto_lead_status_update]
[PARAMS:{
  "payload": "{\"lead_id\":\"lead-1766381136319-kibckt9px\",\"status_id\":\"8a9271d5-4f9b-4fdb-931e-a3a9224eabc1\",\"organizationId\":\"8e57dada-bc65-42c9-8a96-1cb5b67ab95f\",\"reason\":\"Lead iniciou conversa e se apresentou\"}"
}]
```

**Formato alternativo (mais legível):**
O payload deve ser uma string JSON contendo o objeto com os parâmetros. Exemplo de como construir:

```json
{
  "payload": "{\"lead_id\":\"lead-1766381136319-kibckt9px\",\"status_id\":\"8a9271d5-4f9b-4fdb-931e-a3a9224eabc1\",\"organizationId\":\"8e57dada-bc65-42c9-8a96-1cb5b67ab95f\",\"reason\":\"Lead iniciou conversa e se apresentou\"}"
}
```

**Estrutura do objeto dentro da string JSON:**
```json
{
  "lead_id": "string",
  "status_id": "string",
  "organizationId": "string",
  "reason": "string (opcional)",
  "metadata": {} // opcional
}
```

## Exemplo Prático

Se o lead acabou de agendar uma reunião e você quer atualizar para "meeting_scheduled":

1. **Obtenha o `lead_id`:** Use o campo `id` do objeto `lead` fornecido no contexto (ex: `{{ $json.lead.id }}` ou o valor direto como "lead-1766381136319-kibckt9px")
   - **NUNCA use o nome do lead** - sempre use o campo `id`
2. **Obtenha o `status_id`:** Encontre o objeto em `lead_statuses` com `status_key: "meeting_scheduled"` ou `label: "Reunião Agendada"` e use o campo `id` desse objeto (ex: "824e8fe5-a889-4180-b1dd-a488a5d702bb")
3. **Obtenha o `organizationId`:** Use o campo `id` do objeto `organization` fornecido no contexto (ex: `{{ $json.organization.id }}`)
4. Chame a tool com o payload como string JSON:

```
[TOOL:auto_lead_status_update]
[PARAMS:{
  "payload": "{\"lead_id\":\"lead-1766381136319-kibckt9px\",\"status_id\":\"824e8fe5-a889-4180-b1dd-a488a5d702bb\",\"organizationId\":\"8e57dada-bc65-42c9-8a96-1cb5b67ab95f\",\"reason\":\"Lead confirmou agendamento de reunião para 22/12/2025 às 14h\"}"
}]
```

**IMPORTANTE:** 
- `lead_id` = campo `id` do objeto `lead` (NÃO o nome)
- `status_id` = campo `id` do objeto de status em `lead_statuses` (NÃO o `status_key`)
- `organizationId` = campo `id` do objeto `organization`

## Formato Esperado pelo n8n

O n8n está configurado para receber o campo `payload` como uma string JSON. Isso significa que você deve:

1. **Obter os valores corretos do contexto:**
   - `lead_id`: Use o campo `id` do objeto `lead` (NÃO o nome do lead)
   - `status_id`: Use o campo `id` do objeto de status em `lead_statuses` (NÃO o `status_key`)
   - `organizationId`: Use o campo `id` do objeto `organization`
   - `reason`: Texto explicando o motivo da atualização
2. Criar o objeto com os parâmetros: `{"lead_id": "...", "status_id": "...", "organizationId": "...", "reason": "..."}`
3. Serializar esse objeto como uma string JSON (escapar aspas internas)
4. Enviar essa string no campo `payload`

**Exemplo de construção:**
- Objeto: `{"lead_id":"lead-1766381136319-kibckt9px","status_id":"8a9271d5-4f9b-4fdb-931e-a3a9224eabc1","organizationId":"8e57dada-bc65-42c9-8a96-1cb5b67ab95f","reason":"Lead iniciou conversa"}`
- String JSON (com escape): `"{\"lead_id\":\"lead-1766381136319-kibckt9px\",\"status_id\":\"8a9271d5-4f9b-4fdb-931e-a3a9224eabc1\",\"organizationId\":\"8e57dada-bc65-42c9-8a96-1cb5b67ab95f\",\"reason\":\"Lead iniciou conversa\"}"`
- No PARAMS: `"payload": "{\"lead_id\":\"lead-1766381136319-kibckt9px\",\"status_id\":\"8a9271d5-4f9b-4fdb-931e-a3a9224eabc1\",\"organizationId\":\"8e57dada-bc65-42c9-8a96-1cb5b67ab95f\",\"reason\":\"Lead iniciou conversa\"}"`

**ERRO COMUM:** Não use o nome do lead no campo `lead_id`. Sempre use o campo `id` do objeto `lead`.

## Validação e Erros Comuns

**Erro: "Received tool input did not match expected schema"**

Este erro indica que o formato dos parâmetros não corresponde ao schema esperado pela tool no n8n. O schema é definido na configuração da tool no n8n e pode variar.

**IMPORTANTE:** Verifique a configuração da tool `auto_lead_status_update` no n8n para confirmar o schema esperado. O schema define quais campos são esperados e em que formato.

Possíveis causas e soluções:

1. **`payload` não é uma string JSON**
   - ❌ Incorreto: `{"payload": {"lead_id": "...", "status_id": "..."}}` (objeto)
   - ✅ Correto: `{"payload": "{\"lead_id\":\"...\",\"status_id\":\"...\"}"}` (string JSON)
   - O n8n espera que `payload` seja uma string JSON serializada, não um objeto

2. **Parâmetros não estão dentro do objeto dentro da string `payload`**
   - ❌ Incorreto: `{"payload": "{\"lead_id\":\"...\"}"}` (faltando campos obrigatórios)
   - ✅ Correto: `{"payload": "{\"lead_id\":\"...\",\"status_id\":\"...\",\"organizationId\":\"...\"}"}`

3. **Campo obrigatório faltando**
   - Verifique se `lead_id`, `status_id` e `organizationId` estão presentes dentro do objeto JSON dentro da string `payload`

4. **Tipo de dado incorreto**
   - Todos os IDs devem ser strings, não números ou objetos
   - ✅ Correto: `"lead_id": "lead-123"`
   - ❌ Incorreto: `"lead_id": 123` ou `"lead_id": null`

5. **Usando `status_key` ao invés de `status_id`**
   - ❌ Incorreto: `"status_id": "conversation_started"` (este é o `status_key`)
   - ✅ Correto: `"status_id": "8a9271d5-4f9b-4fdb-931e-a3a9224eabc1"` (este é o `id` do objeto)

6. **Usando nome do lead ao invés de `lead_id`**
   - ❌ Incorreto: `"lead_id": "Lead de Teste 03:09"` (este é o nome do lead, não o ID)
   - ✅ Correto: `"lead_id": "lead-1766381136319-kibckt9px"` (este é o campo `id` do objeto `lead`)
   - **Solução:** Sempre use o campo `id` do objeto `lead` fornecido no contexto, nunca use o campo `name` ou qualquer outro campo

6. **JSON malformado na string**
   - Certifique-se de que a string JSON dentro de `payload` está válida
   - Escape corretamente as aspas duplas: `\"`
   - Exemplo correto: `"{\"lead_id\":\"lead-123\"}"`
   - Exemplo incorreto: `"{'lead_id':'lead-123'}"` ou `"{\"lead_id\":\"lead-123\""` (faltando fechamento)

7. **Schema da tool no n8n espera campos individuais**
   - Se o schema da tool no n8n estiver configurado para receber campos individuais (não um objeto `payload`), você deve passar os parâmetros diretamente:
   - Formato alternativo (se o schema esperar campos individuais):
     ```
     [TOOL:auto_lead_status_update]
     [PARAMS:{
       "lead_id": "lead-1766381136319-kibckt9px",
       "status_id": "8a9271d5-4f9b-4fdb-931e-a3a9224eabc1",
       "organizationId": "8e57dada-bc65-42c9-8a96-1cb5b67ab95f",
       "reason": "Lead iniciou conversa e se apresentou"
     }]
     ```
   - **Como verificar:** Acesse a configuração da tool `auto_lead_status_update` no n8n e verifique o schema em "Workflow Inputs". Se houver campos individuais configurados (como `lead_id`, `status_id`, etc.), use o formato acima. Se houver apenas um campo `payload`, use o formato com string JSON.

## Como Verificar o Schema Esperado

Para identificar o formato correto:

1. Acesse o workflow no n8n
2. Abra a configuração da tool `auto_lead_status_update`
3. Vá para a aba "Parameters" → "Workflow Inputs"
4. Verifique quais campos estão configurados:
   - **Se houver apenas um campo `payload`:** Use o formato com string JSON: `"payload": "{\"lead_id\":\"...\",\"status_id\":\"...\"}"`
   - **Se houver campos individuais (`lead_id`, `status_id`, `organizationId`):** Use o formato com campos separados: `{"lead_id": "...", "status_id": "...", "organizationId": "..."}`

## Comportamento

- A tool verifica se o `status_id` fornecido é válido (deve ser o `id` de um dos status disponíveis em `lead_statuses`)
- Atualiza o status do lead no banco de dados do Nebula CRM usando o `status_id` fornecido
- Registra a mudança de status no histórico do lead
- Retorna confirmação da atualização com o novo status
- O status atualizado será refletido imediatamente no funil de vendas

## Notas Importantes

- **OBRIGATÓRIO:** Se o componente `auto_lead_status_update` estiver na lista de componentes disponíveis, você DEVE usar esta tool quando apropriado. Não é opcional.
- **Estrutura correta:** Todos os parâmetros devem estar dentro de um objeto `payload`
- **Nomenclatura:** Sempre use `lead_id` (não `leadId`) e `status_id` (não `status` ou `status_key`)
- **CRÍTICO - lead_id:** Sempre use o campo `id` do objeto `lead` fornecido no contexto. **NUNCA use o nome do lead** no campo `lead_id`. O nome do lead está no campo `name`, mas você precisa usar o campo `id`.
- **CRÍTICO - status_id:** Sempre use o campo `id` do objeto de status em `lead_statuses`. **NUNCA use o `status_key`** diretamente.
- **Atualização proativa:** Não espere - se o lead avançou no funil, atualize o status imediatamente
- **Forneça reason sempre:** Use o parâmetro `reason` para documentar claramente o motivo da atualização

