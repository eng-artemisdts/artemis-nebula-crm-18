# Guia de Aplicação de Migrations no Supabase

Este guia explica como aplicar as migrations do banco de dados no seu projeto Supabase.

## Pré-requisitos

1. **Supabase CLI instalado** ✅ (já instalado)
2. **Acesso ao projeto Supabase** (você precisa estar logado)

## Método 1: Usando o Script Automatizado (Recomendado)

1. **Faça login no Supabase CLI:**
   ```bash
   supabase login
   ```
   Isso abrirá seu navegador para autenticação.

2. **Execute o script:**
   ```bash
   ./apply-migrations.sh
   ```

## Método 2: Aplicação Manual

1. **Faça login no Supabase CLI:**
   ```bash
   supabase login
   ```

2. **Link o projeto (se ainda não estiver linkado):**
   ```bash
   supabase link --project-ref lyqcsclmauwmzipjiazs
   ```

3. **Aplique as migrations:**
   ```bash
   supabase db push
   ```

## Método 3: Aplicação Manual via SQL Editor (Alternativa)

Se preferir aplicar manualmente via interface do Supabase:

1. Acesse o [SQL Editor no Supabase Dashboard](https://app.supabase.com/project/lyqcsclmauwmzipjiazs/sql)
2. Execute cada arquivo SQL na ordem cronológica (pela data no nome do arquivo):
   - `20251122182829_*.sql`
   - `20251122220501_*.sql`
   - `20251123040540_*.sql`
   - ... (e assim por diante)

## Verificação

Após aplicar as migrations, você pode verificar no Supabase Dashboard:
- **Database > Tables** - Deve mostrar todas as tabelas criadas
- **Database > Migrations** - Deve mostrar todas as migrations aplicadas

## Troubleshooting

### Erro: "Access token not provided"
- Execute `supabase login` novamente

### Erro: "Cannot connect to Docker"
- Isso é normal se você estiver usando o Supabase Cloud (remoto)
- O comando `supabase db push` funciona mesmo sem Docker local

### Erro: "Project not linked"
- Execute `supabase link --project-ref lyqcsclmauwmzipjiazs`

## Informações do Projeto

- **Project ID:** `lyqcsclmauwmzipjiazs`
- **Total de Migrations:** 17 arquivos
- **Localização:** `supabase/migrations/`

