# Troubleshooting: Erro de Schema - auto_lead_status_update

## Erro
```
Received tool input did not match expected schema
```

## Diagnóstico

Este erro ocorre quando o formato dos parâmetros enviados para a tool não corresponde ao schema esperado pela configuração da tool no n8n.

## Passos para Resolver

### 1. Verificar o Schema da Tool no n8n

1. Acesse o workflow no n8n
2. Localize o node da tool `auto_lead_status_update`
3. Abra a configuração do node
4. Vá para a aba "Parameters" → "Workflow Inputs"
5. Observe quais campos estão configurados

### 2. Identificar o Formato Esperado

**Cenário A: Campo único `payload`**
- Se você ver apenas um campo chamado `payload` configurado com `{{ $fromAI('payload', '', 'string') }}`
- **Formato correto:** O `payload` deve ser uma string JSON serializada
- **Exemplo:**
  ```
  [TOOL:auto_lead_status_update]
  [PARAMS:{
    "payload": "{\"lead_id\":\"lead-123\",\"status_id\":\"status-456\",\"organizationId\":\"org-789\",\"reason\":\"Motivo\"}"
  }]
  ```

**Cenário B: Campos individuais**
- Se você ver campos individuais como `lead_id`, `status_id`, `organizationId` configurados separadamente
- **Formato correto:** Os campos devem ser passados diretamente como parâmetros
- **Exemplo:**
  ```
  [TOOL:auto_lead_status_update]
  [PARAMS:{
    "lead_id": "lead-123",
    "status_id": "status-456",
    "organizationId": "org-789",
    "reason": "Motivo"
  }]
  ```

### 3. Ajustar o Prompt

Com base no formato identificado, atualize o prompt de sistema para usar o formato correto.

### 4. Validações Adicionais

Certifique-se de que:
- Todos os campos obrigatórios estão presentes (`lead_id`, `status_id`, `organizationId`)
- Todos os valores são strings válidas (não null, undefined, ou tipos incorretos)
- O `status_id` é o campo `id` do objeto em `lead_statuses`, não o `status_key`
- O JSON está bem formado (se usando formato de string JSON)

## Exemplos de Erros Comuns

### Erro 1: Payload como objeto ao invés de string
```json
// ❌ INCORRETO (se schema esperar string)
{
  "payload": {
    "lead_id": "lead-123",
    "status_id": "status-456"
  }
}

// ✅ CORRETO
{
  "payload": "{\"lead_id\":\"lead-123\",\"status_id\":\"status-456\"}"
}
```

### Erro 2: Campos no nível raiz quando schema espera payload
```json
// ❌ INCORRETO (se schema esperar payload)
{
  "lead_id": "lead-123",
  "status_id": "status-456"
}

// ✅ CORRETO
{
  "payload": "{\"lead_id\":\"lead-123\",\"status_id\":\"status-456\"}"
}
```

### Erro 3: Usando status_key ao invés de status_id
```json
// ❌ INCORRETO
{
  "status_id": "conversation_started"  // Este é o status_key
}

// ✅ CORRETO
{
  "status_id": "8a9271d5-4f9b-4fdb-931e-a3a9224eabc1"  // Este é o id do objeto
}
```

### Erro 4: Usando nome do lead ao invés de lead_id
```json
// ❌ INCORRETO
{
  "lead_id": "Lead de Teste 03:09"  // Este é o nome do lead, não o ID
}

// ✅ CORRETO
{
  "lead_id": "lead-1766381136319-kibckt9px"  // Este é o campo id do objeto lead
}
```

**Solução:** Sempre use o campo `id` do objeto `lead` fornecido no contexto. O nome do lead está no campo `name`, mas você precisa usar o campo `id` para o `lead_id`.

## Solução Rápida

Se você não tiver acesso para verificar o schema no n8n, tente ambos os formatos:

1. **Primeiro, tente com payload como string JSON:**
   ```
   [TOOL:auto_lead_status_update]
   [PARAMS:{"payload": "{\"lead_id\":\"...\",\"status_id\":\"...\",\"organizationId\":\"...\",\"reason\":\"...\"}"}]
   ```

2. **Se falhar, tente com campos individuais:**
   ```
   [TOOL:auto_lead_status_update]
   [PARAMS:{"lead_id": "...", "status_id": "...", "organizationId": "...", "reason": "..."}]
   ```

## Contato

Se o problema persistir após tentar ambos os formatos, verifique:
- A configuração do schema da tool no n8n
- Os logs do n8n para ver exatamente qual formato está sendo recebido
- A documentação da tool no n8n para confirmar o schema esperado

