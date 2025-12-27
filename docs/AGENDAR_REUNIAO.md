# Guia de Agendamento de Reuniões

Este documento descreve como agendar reuniões através da API, incluindo configuração necessária e exemplos de uso.

## Endpoint

**POST** `/functions/v1/create-calendar-event`

## Autenticação

O endpoint requer autenticação via Bearer Token do Supabase.

## Request Body

```json
{
  "title": "Reunião de Alinhamento",
  "description": "Discussão sobre próximos passos do projeto",
  "startDateTime": "2025-12-23T10:00:00-03:00",
  "endDateTime": "2025-12-23T11:00:00-03:00",
  "location": "Sala de Reuniões A",
  "attendees": ["participante1@email.com", "participante2@email.com"]
}
```

### Campos

- **title** (obrigatório): Título do evento
- **description** (opcional): Descrição do evento
- **startDateTime** (obrigatório): Data/hora de início no formato ISO 8601 com timezone
- **endDateTime** (obrigatório): Data/hora de fim no formato ISO 8601 com timezone
- **location** (opcional): Localização do evento
- **attendees** (opcional): Array de emails dos participantes

## Response

### Sucesso (200)

```json
{
  "success": true,
  "eventId": "event_id_123",
  "eventUrl": "https://calendar.google.com/calendar/event?eid=..."
}
```

### Erro (500)

```json
{
  "success": false,
  "error": "Mensagem de erro"
}
```

## Exemplo de cURL

### Obter Token de Autenticação

Primeiro, você precisa obter o token de autenticação do Supabase. Isso pode ser feito através do login na aplicação ou via API:

#### Opção 1: Via API do Supabase

```bash
# Substitua com suas credenciais
SUPABASE_URL="https://lyqcsclmauwmzipjiazs.supabase.co"
SUPABASE_ANON_KEY="sua-anon-key-aqui"

curl -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu@email.com",
    "password": "sua-senha"
  }'
```

A resposta conterá um `access_token` que você usará nas próximas requisições.

#### Opção 2: Via Interface Web

1. Acesse sua aplicação web
2. Faça login
3. Abra o console do navegador (F12)
4. Execute:
```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log('Access Token:', session?.access_token);
```

### Criar Evento - Exemplo Básico

```bash
SUPABASE_URL="https://lyqcsclmauwmzipjiazs.supabase.co"
ACCESS_TOKEN="seu-access-token-aqui"

curl -X POST "${SUPABASE_URL}/functions/v1/create-calendar-event" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Reunião de Alinhamento",
    "description": "Discussão sobre próximos passos do projeto",
    "startDateTime": "2025-12-23T10:00:00-03:00",
    "endDateTime": "2025-12-23T11:00:00-03:00",
    "location": "Sala de Reuniões A",
    "attendees": ["participante1@email.com", "participante2@email.com"]
  }'
```

### Exemplo Completo com Script

Crie um arquivo `test-create-event.sh`:

```bash
#!/bin/bash

# Configurações
SUPABASE_URL="https://lyqcsclmauwmzipjiazs.supabase.co"
ACCESS_TOKEN="seu-access-token-aqui"

# Data/hora da reunião (próximas 2 horas)
START_TIME=$(date -u -v+2H +"%Y-%m-%dT%H:00:00-03:00" 2>/dev/null || date -u -d "+2 hours" +"%Y-%m-%dT%H:00:00-03:00" 2>/dev/null || date -u +"%Y-%m-%dT%H:00:00-03:00")
END_TIME=$(date -u -v+3H +"%Y-%m-%dT%H:00:00-03:00" 2>/dev/null || date -u -d "+3 hours" +"%Y-%m-%dT%H:00:00-03:00" 2>/dev/null || date -u +"%Y-%m-%dT%H:00:00-03:00")

echo "Criando evento de teste..."
echo "Início: $START_TIME"
echo "Fim: $END_TIME"
echo ""

RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/create-calendar-event" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Reunião de Teste - $(date +%Y-%m-%d)\",
    \"description\": \"Esta é uma reunião de teste criada via API em $(date)\",
    \"startDateTime\": \"${START_TIME}\",
    \"endDateTime\": \"${END_TIME}\",
    \"location\": \"Online - Teste API\",
    \"attendees\": []
  }")

echo "Resposta:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
```

Torne o script executável e execute:

```bash
chmod +x test-create-event.sh
./test-create-event.sh
```

### Exemplo com cURL e Formatação JSON

```bash
SUPABASE_URL="https://lyqcsclmauwmzipjiazs.supabase.co"
ACCESS_TOKEN="seu-access-token-aqui"

curl -X POST "${SUPABASE_URL}/functions/v1/create-calendar-event" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "title": "Reunião de Teste",
  "description": "Esta é uma reunião de teste criada via API",
  "startDateTime": "2025-12-23T14:00:00-03:00",
  "endDateTime": "2025-12-23T15:00:00-03:00",
  "location": "Online",
  "attendees": []
}
EOF
```

### Exemplo com Participantes

```bash
SUPABASE_URL="https://lyqcsclmauwmzipjiazs.supabase.co"
ACCESS_TOKEN="seu-access-token-aqui"

curl -X POST "${SUPABASE_URL}/functions/v1/create-calendar-event" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Reunião com Equipe",
    "description": "Reunião de planejamento semanal",
    "startDateTime": "2025-12-23T09:00:00-03:00",
    "endDateTime": "2025-12-23T10:30:00-03:00",
    "location": "Sala de Reuniões Principal",
    "attendees": [
      "colaborador1@empresa.com",
      "colaborador2@empresa.com",
      "gerente@empresa.com"
    ]
  }'
```

## Configuração Necessária

### Pré-requisitos

1. O usuário deve ter conectado seu calendário (Google Calendar ou Outlook Calendar)
2. A conexão deve estar ativa e válida
3. O componente `meeting_scheduler` deve estar configurado

## Permissões Necessárias

### Google Calendar

A aplicação precisa das seguintes permissões no Google Cloud Console:

- `https://www.googleapis.com/auth/calendar` - Para criar eventos

#### Verificar/Adicionar Permissões no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione seu projeto
3. Vá em **APIs & Services** > **Credentials**
4. Clique no OAuth 2.0 Client ID que você está usando
5. Verifique se as seguintes **Scopes** estão configuradas:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
6. Se não estiverem, você precisará:
   - Ir em **APIs & Services** > **OAuth consent screen**
   - Adicionar os scopes necessários
   - Fazer uma nova autorização do usuário (eles precisarão reconectar)

#### Passo a Passo para Adicionar Permissões

1. **Acesse OAuth Consent Screen**:
   - Vá para [Google Cloud Console](https://console.cloud.google.com/)
   - Navegue até **APIs & Services** > **OAuth consent screen**

2. **Adicione Scopes**:
   - Clique em **EDIT APP**
   - Role até a seção **Scopes**
   - Clique em **ADD OR REMOVE SCOPES**
   - Procure e adicione:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Clique em **UPDATE**

3. **Reautorizar Usuários**:
   - Após adicionar novos scopes, os usuários precisarão reconectar suas contas
   - Eles verão uma tela de consentimento solicitando as novas permissões

### Outlook Calendar (Microsoft)

A aplicação precisa das seguintes permissões no Azure Portal:

- `Calendars.ReadWrite` - Para criar eventos no calendário

#### Verificar/Adicionar Permissões no Azure Portal

1. Acesse [Azure Portal](https://portal.azure.com/)
2. Vá em **Microsoft Entra ID** > **App registrations**
3. Selecione seu aplicativo
4. Vá em **API permissions**
5. Verifique se a permissão `Calendars.ReadWrite` está presente
6. Se não estiver:
   - Clique em **Add a permission**
   - Selecione **Microsoft Graph**
   - Escolha **Delegated permissions**
   - Procure por `Calendars.ReadWrite`
   - Adicione a permissão
   - Clique em **Grant admin consent** (se você for admin)

#### Passo a Passo para Adicionar Permissões

1. **Acesse Azure Portal**:
   - Vá para [Azure Portal](https://portal.azure.com/)
   - Navegue até **Microsoft Entra ID** > **App registrations**

2. **Selecione seu App**:
   - Clique no registro da aplicação que você criou para o Outlook Calendar

3. **Adicione Permissões**:
   - No menu lateral, clique em **API permissions**
   - Clique em **Add a permission**
   - Selecione **Microsoft Graph**
   - Escolha **Delegated permissions**
   - Na busca, digite `Calendars.ReadWrite`
   - Marque a permissão `Calendars.ReadWrite`
   - Clique em **Add permissions**

4. **Conceder Consentimento Admin** (se necessário):
   - Se você for administrador do tenant
   - Clique em **Grant admin consent for [seu-tenant]**
   - Confirme a ação

5. **Reautorizar Usuários**:
   - Após adicionar novas permissões, os usuários podem precisar reconectar
   - Eles verão uma tela solicitando as novas permissões

## Troubleshooting

### Erro: "Calendário não conectado para este usuário"

- Verifique se o usuário conectou seu calendário na página de configuração
- Verifique se a conexão está ativa (token não expirado)

### Erro: "Token OAuth inválido"

- O token pode ter expirado
- O usuário precisa reconectar seu calendário
- Verifique se o refresh token está funcionando

### Erro: "Provedor não suportado"

- Verifique se o provedor está configurado como `google_calendar` ou `outlook_calendar`
- Verifique a configuração na tabela `component_configurations`

### Erro: "Erro ao criar evento no Google Calendar: 403"

- Verifique se as permissões `calendar` e `calendar.events` estão configuradas
- Verifique se o usuário concedeu as permissões necessárias
- Pode ser necessário reconectar a conta

### Erro: "Erro ao criar evento no Outlook Calendar: 403"

- Verifique se a permissão `Calendars.ReadWrite` está configurada
- Verifique se o admin concedeu consentimento (se necessário)
- Verifique se o usuário concedeu as permissões necessárias

## Exemplo de Integração no Frontend

```typescript
import { CalendarEventCreator } from "@/services/calendar/CalendarEventCreator";

const eventCreator = new CalendarEventCreator();

const createMeeting = async () => {
  const result = await eventCreator.createEvent({
    title: "Reunião de Alinhamento",
    description: "Discussão sobre próximos passos",
    startDateTime: "2025-12-23T10:00:00-03:00",
    endDateTime: "2025-12-23T11:00:00-03:00",
    location: "Sala de Reuniões A",
    attendees: ["participante@email.com"],
  });

  if (result.success) {
    console.log("Evento criado:", result.eventId);
    console.log("URL do evento:", result.eventUrl);
  } else {
    console.error("Erro:", result.error);
  }
};
```

## Formato de Data/Hora

Use o formato ISO 8601 com timezone:

- Formato: `YYYY-MM-DDTHH:mm:ss±HH:mm`
- Exemplo: `2025-12-23T10:00:00-03:00` (23 de dezembro de 2025, 10:00 AM, timezone -03:00)

### Timezones Comuns no Brasil

- `America/Sao_Paulo` (UTC-3) - Horário de Brasília
- `America/Manaus` (UTC-4) - Horário do Amazonas
- `America/Fortaleza` (UTC-3) - Horário do Nordeste

## Limitações

- O evento é criado no calendário primário do usuário conectado
- Participantes receberão convites automaticamente (se configurado)
- O evento segue o timezone configurado (padrão: America/Sao_Paulo)

