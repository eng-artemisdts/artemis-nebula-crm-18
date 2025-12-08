# Scripts de Consumo RabbitMQ

## consume-rabbitmq-interactions.js

Script Node.js para consumir interações agendadas do RabbitMQ através da edge function do Supabase.

### Uso

#### Via Node.js diretamente:
```bash
node scripts/consume-rabbitmq-interactions.js
```

#### Via script shell:
```bash
./scripts/consume-rabbitmq-interactions.sh
```

### Variáveis de Ambiente

Configure as seguintes variáveis de ambiente:

```bash
export SUPABASE_URL="https://seu-projeto.supabase.co"
export SUPABASE_ANON_KEY="sua-chave-anon"
```

Ou use as variáveis com prefixo `VITE_`:
```bash
export VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
export VITE_SUPABASE_PUBLISHABLE_KEY="sua-chave-anon"
```

### Configuração no n8n

#### Opção 1: Usando o nó "Execute Command"

1. Adicione um nó **"Execute Command"**
2. Configure o comando:
   ```bash
   node /caminho/para/scripts/consume-rabbitmq-interactions.js
   ```
3. Configure as variáveis de ambiente no n8n:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

#### Opção 2: Usando o nó "HTTP Request"

1. Adicione um nó **"HTTP Request"**
2. Configure:
   - **Method**: POST
   - **URL**: `https://seu-projeto.supabase.co/functions/v1/rabbitmq-consume-interactions`
   - **Authentication**: Generic Credential Type
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer sua-chave-anon`
   - **Content-Type**: `application/json`
   - **Body**: `{}`

#### Opção 3: Usando o nó "Code" (JavaScript)

1. Adicione um nó **"Code"**
2. Cole o seguinte código:

```javascript
const SUPABASE_URL = $env.SUPABASE_URL || $env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = $env.SUPABASE_ANON_KEY || $env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY não configuradas');
}

const response = await fetch(
  `${SUPABASE_URL}/functions/v1/rabbitmq-consume-interactions`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  }
);

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`HTTP ${response.status}: ${errorText}`);
}

const data = await response.json();

return {
  success: !data.error,
  processed: data.processed || 0,
  successCount: data.success || 0,
  errorCount: data.errors || 0,
  message: data.message || data.error,
  timestamp: new Date().toISOString(),
};
```

### Configuração de Cron no n8n

1. Adicione um nó **"Cron"** no início do workflow
2. Configure a frequência (recomendado: a cada minuto):
   - **Cron Expression**: `* * * * *` (a cada minuto)
   - Ou use intervalos maiores: `*/5 * * * *` (a cada 5 minutos)

### Exemplo de Workflow Completo

```
[Cron] → [HTTP Request ou Execute Command] → [IF Error] → [Send Email/Notification]
```

### Logs e Monitoramento

O script imprime logs no formato:
```
[2025-12-04T10:30:00.000Z] 🚀 Iniciando consumo de interações do RabbitMQ...
[2025-12-04T10:30:01.234Z] ✅ Processamento concluído em 1234ms
   📊 Processadas: 5
   ✅ Sucesso: 5
   ❌ Erros: 0
```

### Troubleshooting

#### Erro: Variáveis de ambiente não configuradas
- Verifique se as variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY` estão configuradas no n8n

#### Erro: HTTP 401 Unauthorized
- Verifique se a chave `SUPABASE_ANON_KEY` está correta
- Verifique se o header `Authorization` está sendo enviado corretamente

#### Erro: HTTP 404 Not Found
- Verifique se a URL do Supabase está correta
- Verifique se a edge function `rabbitmq-consume-interactions` foi deployada

#### Nenhuma mensagem sendo processada
- Verifique se há mensagens na fila `scheduled_interactions_queue` no RabbitMQ
- Verifique os logs da edge function no Supabase Dashboard
- Verifique se o cron está executando corretamente

