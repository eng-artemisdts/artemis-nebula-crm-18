# Tool: psql_chat_message

## Identificador
`psql_chat_message`

## Descrição
Obter o histórico completo da conversa e informações sobre interações anteriores armazenadas no banco de dados.

## Quando Usar

- ANTES de processar o prompt de sistema, para verificar se existem mensagens anteriores na tool PSQL_CHAT_MESSAGE
- Para verificar se o agente deve se apresentar (apenas se NÃO houver mensagens na PSQL_CHAT_MESSAGE)
- Para acessar o histórico completo da conversa (o campo `message.conversation` contém apenas a mensagem atual, não o histórico)

## Retorno Esperado

- Lista de mensagens anteriores (array ou string): Se houver mensagens, significa que já houve interação com o lead
- `has_introduced` (boolean): Indica se o agente já se apresentou anteriormente (pode ser derivado da existência de mensagens)
- `conversation_history` (string ou array): Histórico completo da conversa com todas as mensagens anteriores
- Outras informações contextuais relevantes da conversa

## Importante

- Esta tool deve ser chamada no workflow do n8n ANTES do processamento do prompt de sistema
- O histórico completo da conversa está disponível apenas através desta tool, não no campo `message.conversation` do payload
- **Regra de Apresentação:** Se a tool PSQL_CHAT_MESSAGE retornar qualquer mensagem (mesmo que seja apenas uma), você NÃO deve se apresentar, pois já houve interação anterior com o lead
- Use o histórico completo para entender o contexto e evitar repetir informações já mencionadas

