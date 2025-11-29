# 🔧 Correção: Erro "Could not find the 'organization_id' column of 'leads'"

## ❌ Problema

Ao tentar acessar a tabela `leads`, você recebe o erro:
```
Could not find the 'organization_id' column of 'leads' in the schema cache
```

## ✅ Solução

A tabela `leads` não tinha a coluna `organization_id`, mas o código TypeScript esperava que ela existisse. Foi criada uma migration para adicionar essa coluna.

### O que foi feito:

1. **Criada migration** (`20251124190200_add_organization_id_to_leads.sql`):
   - Adiciona coluna `organization_id` à tabela `leads`
   - Cria índice para melhor performance
   - Atualiza registros existentes (se houver) para vincular à primeira organização
   - Remove policies antigas que permitiam acesso público
   - Cria novas RLS policies que filtram por organização

2. **Código já estava correto**:
   - `LeadForm.tsx` já estava usando `organization_id` ao inserir leads
   - Edge Function `evolution-webhook` já estava usando `organization_id` para filtrar leads
   - Nenhuma alteração necessária no código

## 🚀 Como Aplicar a Correção

### Opção 1: Via SQL Editor (Recomendado)

1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/sql
2. Execute a migration:
   ```sql
   -- Add organization_id column to leads table
   ALTER TABLE public.leads
   ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

   -- Create index
   CREATE INDEX IF NOT EXISTS idx_leads_organization_id 
   ON public.leads(organization_id);

   -- Update existing records
   DO $$
   DECLARE
     org_id UUID;
   BEGIN
     SELECT id INTO org_id FROM public.organizations LIMIT 1;
     IF org_id IS NOT NULL THEN
       UPDATE public.leads
       SET organization_id = org_id
       WHERE organization_id IS NULL;
     END IF;
   END $$;

   -- Drop old policies
   DROP POLICY IF EXISTS "Anyone can view leads" ON public.leads;
   DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
   DROP POLICY IF EXISTS "Anyone can update leads" ON public.leads;
   DROP POLICY IF EXISTS "Anyone can delete leads" ON public.leads;

   -- Create new RLS policies
   CREATE POLICY "Users can view leads in their organization"
     ON public.leads FOR SELECT
     USING (organization_id = get_user_organization_id());

   CREATE POLICY "Users can insert leads in their organization"
     ON public.leads FOR INSERT
     WITH CHECK (organization_id = get_user_organization_id());

   CREATE POLICY "Users can update leads in their organization"
     ON public.leads FOR UPDATE
     USING (organization_id = get_user_organization_id());

   CREATE POLICY "Users can delete leads in their organization"
     ON public.leads FOR DELETE
     USING (organization_id = get_user_organization_id());
   ```

### Opção 2: Via Arquivo Consolidado

1. O arquivo `all-migrations.sql` já foi atualizado com a nova migration
2. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/sql
3. Execute apenas a nova migration do arquivo `all-migrations.sql`

### Opção 3: Via CLI

```bash
supabase db push
```

## 📝 O que Mudou

### Antes:
- Tabela `leads` era global (sem `organization_id`)
- Qualquer usuário podia ver/criar/editar/deletar qualquer lead
- Não havia isolamento entre organizações

### Depois:
- Tabela `leads` é por organização (com `organization_id`)
- Usuários só veem/criam/editam/deletam leads da sua organização
- Isolamento completo entre organizações via RLS

## ✅ Verificação

Após aplicar a migration, verifique:

1. A coluna foi adicionada:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'leads' 
   AND column_name = 'organization_id';
   ```

2. As policies foram criadas:
   ```sql
   SELECT policyname 
   FROM pg_policies 
   WHERE tablename = 'leads';
   ```

3. O código funciona:
   - Tente criar um novo lead
   - Verifique se ele aparece apenas para sua organização
   - Tente editar um lead existente

## 🔍 Troubleshooting

**Erro persiste após aplicar a migration:**
- Limpe o cache do schema: Recarregue a página do Supabase Dashboard
- Verifique se a migration foi aplicada: `SELECT * FROM supabase_migrations.schema_migrations;`

**Novos registros não aparecem:**
- Verifique se o `organization_id` está sendo incluído ao inserir
- Verifique se as RLS policies estão ativas

**Erro ao inserir:**
- Certifique-se de que o usuário tem uma organização vinculada
- Verifique se a função `get_user_organization_id()` existe

## 📊 Resumo das Correções de organization_id

Foram corrigidas 4 tabelas que precisavam de `organization_id`:

1. ✅ `settings` - Corrigido anteriormente
2. ✅ `ai_interaction_settings` - Corrigido anteriormente
3. ✅ `lead_categories` - Corrigido anteriormente
4. ✅ `leads` - Corrigido agora

Todas as tabelas principais agora têm isolamento por organização!


