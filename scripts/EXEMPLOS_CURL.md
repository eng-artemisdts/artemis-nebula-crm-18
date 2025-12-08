# Exemplos de cURL para Consumir Interações RabbitMQ

## Comando cURL Básico

```bash
curl -X POST \
  -H "Authorization: Bearer SUA_CHAVE_ANON_AQUI" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://lyqcsclmauwmzipjiazs.supabase.co/functions/v1/rabbitmq-consume-interactions
```

## Exemplo Completo com Variáveis de Ambiente

```bash
export SUPABASE_URL="https://lyqcsclmauwmzipjiazs.supabase.co"
export SUPABASE_ANON_KEY="sua-chave-anon-aqui"

curl -X POST \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${SUPABASE_URL}/functions/v1/rabbitmq-consume-interactions"
```

## Exemplo com Formatação JSON (jq)

```bash
curl -X POST \
  -H "Authorization: Bearer SUA_CHAVE_ANON_AQUI" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://lyqcsclmauwmzipjiazs.supabase.co/functions/v1/rabbitmq-consume-interactions \
  | jq '.'
```

## Exemplo com Tratamento de Erros

```bash
#!/bin/bash

SUPABASE_URL="https://lyqcsclmauwmzipjiazs.supabase.co"
SUPABASE_ANON_KEY="sua-chave-anon-aqui"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${SUPABASE_URL}/functions/v1/rabbitmq-consume-interactions")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ Sucesso!"
  echo "$BODY" | jq '.'
else
  echo "❌ Erro HTTP $HTTP_CODE"
  echo "$BODY"
  exit 1
fi
```

## Exemplo para Cron Job

Adicione ao crontab (`crontab -e`):

```bash
# Executa a cada minuto
* * * * * /usr/bin/curl -X POST -H "Authorization: Bearer SUA_CHAVE_ANON_AQUI" -H "Content-Type: application/json" -d '{}' https://lyqcsclmauwmzipjiazs.supabase.co/functions/v1/rabbitmq-consume-interactions > /dev/null 2>&1

# Executa a cada 5 minutos
*/5 * * * * /usr/bin/curl -X POST -H "Authorization: Bearer SUA_CHAVE_ANON_AQUI" -H "Content-Type: application/json" -d '{}' https://lyqcsclmauwmzipjiazs.supabase.co/functions/v1/rabbitmq-consume-interactions > /dev/null 2>&1
```

## Exemplo para n8n (Execute Command)

No nó "Execute Command" do n8n, use:

```bash
curl -X POST \
  -H "Authorization: Bearer {{ $env.SUPABASE_ANON_KEY }}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  {{ $env.SUPABASE_URL }}/functions/v1/rabbitmq-consume-interactions
```

## Exemplo com Logging

```bash
#!/bin/bash

SUPABASE_URL="https://lyqcsclmauwmzipjiazs.supabase.co"
SUPABASE_ANON_KEY="sua-chave-anon-aqui"
LOG_FILE="/var/log/rabbitmq-consume.log"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Iniciando consumo..." >> "$LOG_FILE"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${SUPABASE_URL}/functions/v1/rabbitmq-consume-interactions")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  PROCESSED=$(echo "$BODY" | jq -r '.processed // 0')
  SUCCESS=$(echo "$BODY" | jq -r '.success // 0')
  ERRORS=$(echo "$BODY" | jq -r '.errors // 0')
  
  echo "[$TIMESTAMP] ✅ Processadas: $PROCESSED | Sucesso: $SUCCESS | Erros: $ERRORS" >> "$LOG_FILE"
else
  echo "[$TIMESTAMP] ❌ Erro HTTP $HTTP_CODE: $BODY" >> "$LOG_FILE"
fi
```

## Exemplo com Timeout

```bash
curl --max-time 30 \
  -X POST \
  -H "Authorization: Bearer SUA_CHAVE_ANON_AQUI" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://lyqcsclmauwmzipjiazs.supabase.co/functions/v1/rabbitmq-consume-interactions
```

## Exemplo com Verbose (para debug)

```bash
curl -v \
  -X POST \
  -H "Authorization: Bearer SUA_CHAVE_ANON_AQUI" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://lyqcsclmauwmzipjiazs.supabase.co/functions/v1/rabbitmq-consume-interactions
```

## Resposta Esperada

### Sucesso (HTTP 200):
```json
{
  "message": "Processamento concluído",
  "processed": 5,
  "success": 5,
  "errors": 0
}
```

### Sem mensagens (HTTP 200):
```json
{
  "message": "Nenhuma mensagem para processar",
  "processed": 0
}
```

### Erro (HTTP 500):
```json
{
  "error": "Mensagem de erro aqui"
}
```

## Como Obter a Chave Anônima

1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Copie a **anon/public key**

## Troubleshooting

### Erro 401 Unauthorized
- Verifique se a chave `SUPABASE_ANON_KEY` está correta
- Verifique se o header `Authorization` está no formato: `Bearer SUA_CHAVE`

### Erro 404 Not Found
- Verifique se a URL está correta
- Verifique se a edge function `rabbitmq-consume-interactions` foi deployada

### Erro de conexão
- Verifique sua conexão com a internet
- Verifique se o Supabase está acessível

