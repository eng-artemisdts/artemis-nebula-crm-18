# 🔧 Correção: Erro "Could not find the 'organization_id' column of 'lead_categories'"

## ❌ Problema

Ao tentar acessar a tabela `lead_categories`, você recebe o erro:
```
Could not find the 'organization_id' column of 'lead_categories' in the schema cache
```

## ✅ Solução

A tabela `lead_categories` não tinha a coluna `organization_id`, mas o código TypeScript esperava que ela existisse. Foi criada uma migration para adicionar essa coluna.

### O que foi feito:

1. **Criada migration** (`20251124190500_add_organization_id_to_lead_categories.sql`):
   - Adiciona coluna `organization_id` à tabela `lead_categories`
   - Cria índice para melhor performance
   - Atualiza registros existentes (se houver) para vincular à primeira organização
   - Remove policies antigas que permitiam acesso público
   - Cria novas RLS policies que filtram por organização

2. **Código já estava correto** (`src/pages/CategoryManager.tsx`):
   - O código já estava usando `organization_id` ao inserir categorias
   - Nenhuma alteração necessária no código

## 🚀 Como Aplicar a Correção

### Opção 1: Via SQL Editor (Recomendado)

1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/sql
2. Execute a migration:
   ```sql
   -- Add organization_id column to lead_categories table
   ALTER TABLE public.lead_categories
   ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

   -- Create index
   CREATE INDEX IF NOT EXISTS idx_lead_categories_organization_id 
   ON public.lead_categories(organization_id);

   -- Update existing records
   DO $$
   DECLARE
     org_id UUID;
   BEGIN
     SELECT id INTO org_id FROM public.organizations LIMIT 1;
     IF org_id IS NOT NULL THEN
       UPDATE public.lead_categories
       SET organization_id = org_id
       WHERE organization_id IS NULL;
     END IF;
   END $$;

   -- Drop old policies
   DROP POLICY IF EXISTS "Anyone can view lead categories" ON public.lead_categories;
   DROP POLICY IF EXISTS "Anyone can insert lead categories" ON public.lead_categories;
   DROP POLICY IF EXISTS "Anyone can update lead categories" ON public.lead_categories;
   DROP POLICY IF EXISTS "Anyone can delete lead categories" ON public.lead_categories;

   -- Create new RLS policies
   CREATE POLICY "Users can view lead categories in their organization"
     ON public.lead_categories FOR SELECT
     USING (organization_id = get_user_organization_id());

   CREATE POLICY "Users can insert lead categories in their organization"
     ON public.lead_categories FOR INSERT
     WITH CHECK (organization_id = get_user_organization_id());

   CREATE POLICY "Users can update lead categories in their organization"
     ON public.lead_categories FOR UPDATE
     USING (organization_id = get_user_organization_id());

   CREATE POLICY "Users can delete lead categories in their organization"
     ON public.lead_categories FOR DELETE
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
- Tabela `lead_categories` era global (sem `organization_id`)
- Qualquer usuário podia ver/criar/editar/deletar qualquer categoria
- Não havia isolamento entre organizações

### Depois:
- Tabela `lead_categories` é por organização (com `organization_id`)
- Usuários só veem/criam/editam/deletam categorias da sua organização
- Isolamento completo entre organizações via RLS

## ✅ Verificação

Após aplicar a migration, verifique:

1. A coluna foi adicionada:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'lead_categories' 
   AND column_name = 'organization_id';
   ```

2. As policies foram criadas:
   ```sql
   SELECT policyname 
   FROM pg_policies 
   WHERE tablename = 'lead_categories';
   ```

3. O código funciona:
   - Tente criar uma nova categoria
   - Verifique se ela aparece apenas para sua organização

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

