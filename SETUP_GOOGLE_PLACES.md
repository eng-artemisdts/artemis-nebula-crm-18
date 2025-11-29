# 🔧 Configuração do Google Places API

## ❌ Erro

```
"error": "GOOGLE_PLACES_API_KEY not configured"
```

## ✅ Solução

A Edge Function `search-nearby-businesses` precisa da chave da Google Places API para funcionar. Siga os passos abaixo:

## 📋 Passo 1: Obter a API Key do Google

### 1.1 Criar/Selecionar Projeto no Google Cloud

1. Acesse: https://console.cloud.google.com/
2. Selecione um projeto existente ou crie um novo
3. Se criar novo, dê um nome ao projeto (ex: "Artemis CRM")

### 1.2 Ativar as APIs Necessárias

1. Acesse: https://console.cloud.google.com/apis/library
2. Ative as seguintes APIs:
   - **Geocoding API** - Para converter endereços em coordenadas
   - **Places API (New)** - Para buscar lugares
   - **Places API** - API antiga (pode ser necessária)
   - **Place Details API** - Para obter detalhes dos lugares

### 1.3 Criar Credenciais (API Key)

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Clique em **"+ CREATE CREDENTIALS"**
3. Selecione **"API key"**
4. Copie a chave gerada (ela aparecerá apenas uma vez!)

### 1.4 (Opcional) Restringir a API Key

Para segurança, você pode restringir a chave:

1. Clique na chave criada para editar
2. Em **"API restrictions"**, selecione **"Restrict key"**
3. Selecione apenas as APIs que você ativou:
   - Geocoding API
   - Places API (New)
   - Place Details API
4. Em **"Application restrictions"**, você pode restringir por:
   - HTTP referrers (para uso no frontend)
   - IP addresses (para uso em servidores)
   - Para Edge Functions, você pode deixar sem restrição ou usar IP do Supabase

### 1.5 Configurar Faturamento (Obrigatório)

⚠️ **IMPORTANTE:** O Google Places API requer faturamento ativo!

1. Acesse: https://console.cloud.google.com/billing
2. Crie uma conta de faturamento ou vincule uma existente
3. Configure limites de gastos se desejar

**Custos aproximados:**
- Geocoding: $5 por 1.000 requisições
- Text Search: $32 por 1.000 requisições
- Place Details: $17 por 1.000 requisições

**Crédito gratuito:** O Google oferece $200 em créditos mensais gratuitos para novos usuários.

## 📋 Passo 2: Configurar no Supabase

### Opção A: Via Dashboard (Recomendado)

1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/settings/functions
2. Vá em **Secrets**
3. Clique em **"Add new secret"**
4. Nome: `GOOGLE_PLACES_API_KEY`
5. Valor: Cole a API key que você copiou
6. Clique em **"Save"**

### Opção B: Via CLI

```bash
supabase secrets set GOOGLE_PLACES_API_KEY=sua-chave-aqui
```

### Verificar se foi configurado:

```bash
supabase secrets list
```

**Nota:** A variável `GOOGLE_PLACES_API_KEY` aparecerá na lista (diferente das variáveis `SUPABASE_*` que são automáticas).

## ✅ Testar

Após configurar:

1. Acesse a página de busca de leads: http://localhost:8080/lead-search
2. Selecione uma categoria
3. Digite uma localização (ex: "São Paulo, SP")
4. Clique em "Buscar"
5. Se funcionar, você verá os negócios encontrados!

## 🔍 Troubleshooting

### Erro: "REQUEST_DENIED"

**Causas possíveis:**
- API key incorreta
- APIs não foram ativadas
- Faturamento não configurado
- Restrições na API key muito restritivas

**Solução:**
1. Verifique se todas as APIs estão ativadas
2. Verifique se o faturamento está ativo
3. Tente remover restrições temporariamente para testar

### Erro: "ZERO_RESULTS"

**Causa:** Localização não encontrada

**Solução:**
- Tente uma localização mais específica
- Use formato: "Cidade, Estado" ou "Endereço completo"

### Erro: "OVER_QUERY_LIMIT"

**Causa:** Limite de requisições excedido

**Solução:**
- Verifique os limites no Google Cloud Console
- Configure limites de gastos se necessário
- Aguarde alguns minutos e tente novamente

### A API key não funciona

**Verificações:**
1. ✅ APIs ativadas?
2. ✅ Faturamento configurado?
3. ✅ API key copiada corretamente?
4. ✅ Secret configurado no Supabase?
5. ✅ Edge Function deployada?

## 📚 Recursos

- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Pricing Information](https://developers.google.com/maps/billing-and-pricing/pricing)

## 💡 Dica

Se você não quiser usar o Google Places API agora, pode:
1. Comentar o código que chama a função `search-nearby-businesses`
2. Ou criar uma versão mock da função para desenvolvimento
3. Ou simplesmente não usar a funcionalidade de busca de leads até configurar a API


