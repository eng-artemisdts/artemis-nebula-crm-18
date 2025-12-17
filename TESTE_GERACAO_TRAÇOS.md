# 🧪 Guia de Teste - Geração Automática de Traços de Personalidade

## 📋 Pré-requisitos

1. **API Key da OpenAI configurada no Supabase**
2. **Edge function deployada** (ou fazer deploy agora)
3. **Servidor de desenvolvimento rodando**

## 🚀 Passo 1: Configurar a API Key da OpenAI

### Via Dashboard (Recomendado):
1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/settings/functions
2. Vá em **Secrets**
3. Clique em **Add new secret**
4. Nome: `OPENAI_API_KEY`
5. Valor: Sua chave da OpenAI (ex: `sk-...`)
6. Clique em **Save**

**Como obter a API Key:**
1. Acesse: https://platform.openai.com/api-keys
2. Faça login na sua conta OpenAI
3. Clique em **Create new secret key**
4. Copie a chave (ela só aparece uma vez!)

## 📦 Passo 2: Fazer Deploy da Edge Function

### Opção A - Via Dashboard (Mais fácil):
1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/functions
2. Clique em **Create a new function**
3. Nome: `generate-personality-traits`
4. Cole o código do arquivo: `supabase/functions/generate-personality-traits/index.ts`
5. Clique em **Deploy**

### Opção B - Via CLI (se tiver instalado):
```bash
# Verificar se está logado
supabase login

# Linkar projeto (se necessário)
supabase link --project-ref lyqcsclmauwmzipjiazs

# Fazer deploy
supabase functions deploy generate-personality-traits
```

### Opção C - Verificar se já está deployada:
1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/functions
2. Procure por `generate-personality-traits` na lista
3. Se não estiver, faça o deploy

## 🧪 Passo 3: Testar no Frontend

### Teste Manual:

1. **Inicie o servidor de desenvolvimento:**
   ```bash
   yarn dev
   ```

2. **Acesse a página de criação de agente:**
   - Navegue para `/agent/create` ou clique em "Criar Novo Agente"

3. **Preencha informações básicas do agente:**
   - **Nome do Agente**: Ex: "Vendedor Consultivo"
   - **Foco da Conversa**: Ex: "vendas de soluções de automação"
   - **Objetivo Principal**: Ex: "Identificar necessidades e agendar reunião comercial"

4. **Aguarde a geração automática:**
   - Após preencher as informações, aguarde ~1.5 segundos
   - Você verá o indicador: "Gerando traços personalizados com IA..."
   - Os traços serão adicionados automaticamente na área de arrastar

5. **Verifique os traços gerados:**
   - Os traços devem aparecer na área de drag and drop
   - Devem ser relevantes ao contexto do agente
   - Devem estar em português, no masculino

### Teste do Drag and Drop:

1. **Arraste os traços:**
   - Clique e segure no ícone de grip (⋮⋮) ao lado de um traço
   - Arraste para cima ou para baixo para reordenar
   - Solte para confirmar a nova posição

2. **Remova traços:**
   - Clique no X ao lado de um traço para removê-lo

3. **Adicione traços manualmente:**
   - Use os traços disponíveis clicando neles
   - Ou digite um novo traço no campo de input

## 🔍 Passo 4: Verificar Logs (se houver problemas)

### Via CLI:
```bash
supabase functions logs generate-personality-traits
```

### Via Dashboard:
1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/logs/edge-functions
2. Filtre por `generate-personality-traits`
3. Verifique os logs de erro ou sucesso

## ✅ Checklist de Teste

- [ ] API Key da OpenAI configurada
- [ ] Edge function deployada
- [ ] Servidor de desenvolvimento rodando
- [ ] Preencheu nome, foco e objetivo do agente
- [ ] Traços foram gerados automaticamente (~1.5s após preencher)
- [ ] Traços são relevantes ao contexto
- [ ] Drag and drop funciona corretamente
- [ ] Pode adicionar/remover traços manualmente

## 🐛 Troubleshooting

### Problema: Traços não são gerados automaticamente

**Possíveis causas:**
1. Edge function não está deployada
   - Solução: `supabase functions deploy generate-personality-traits`

2. API Key não configurada
   - Solução: Configure `OPENAI_API_KEY` nos secrets do Supabase

3. Informações do agente não preenchidas
   - Solução: Preencha pelo menos nome, foco ou objetivo

4. Verifique o console do navegador
   - Abra DevTools (F12) → Console
   - Procure por erros relacionados à função

### Problema: Erro "Function not found"

**Solução:**
```bash
supabase functions deploy generate-personality-traits
```

### Problema: Erro "OPENAI_API_KEY não configurada"

**Solução:**
```bash
supabase secrets set OPENAI_API_KEY=sk-sua-chave
```

### Problema: Drag and drop não funciona

**Possíveis causas:**
1. Conflito com outros eventos de clique
   - Solução: Já corrigido com `activationConstraint: { distance: 8 }`

2. Verifique se está clicando no ícone de grip (⋮⋮)
   - Não clique diretamente no badge, mas no ícone ao lado

## 📊 Teste de Performance

1. **Tempo de resposta:**
   - A geração deve levar entre 2-5 segundos
   - Se demorar muito, verifique a conexão e a API da OpenAI

2. **Qualidade dos traços:**
   - Devem ser relevantes ao contexto
   - Devem estar em português
   - Devem ser adjetivos no masculino
   - Devem ter entre 1-30 caracteres

## 🎯 Cenários de Teste

### Cenário 1: Agente Vendedor
- **Nome**: "Vendedor Consultivo"
- **Foco**: "vendas de soluções de automação"
- **Objetivo**: "Identificar necessidades e agendar reunião comercial"
- **Traços esperados**: persuasivo, consultivo, proativo, etc.

### Cenário 2: Agente Suporte
- **Nome**: "Atendimento ao Cliente"
- **Foco**: "suporte e resolução de dúvidas"
- **Objetivo**: "Resolver problemas rapidamente"
- **Traços esperados**: empático, paciente, resolutivo, etc.

### Cenário 3: Agente com poucas informações
- **Nome**: "Agente Teste"
- **Foco**: (vazio)
- **Objetivo**: (vazio)
- **Comportamento esperado**: Não deve gerar traços (falta contexto)

## 🔗 Links Úteis

- **Dashboard Supabase**: https://app.supabase.com/project/lyqcsclmauwmzipjiazs
- **Logs das Functions**: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/logs/edge-functions
- **Secrets**: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/settings/functions
- **OpenAI API Keys**: https://platform.openai.com/api-keys

