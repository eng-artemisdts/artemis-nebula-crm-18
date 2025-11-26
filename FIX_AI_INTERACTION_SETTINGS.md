# 🔧 Correção: Erro "Could not find the 'organization_id' column"

## ❌ Problema

Ao tentar acessar a tabela `ai_interaction_settings`, você recebe o erro:
```
Could not find the 'organization_id' column of 'ai_interaction_settings' in the schema cache
```

## ✅ Solução

A tabela `ai_interaction_settings` não tinha a coluna `organization_id`, mas o código TypeScript esperava que ela existisse. Foi criada uma migration para adicionar essa coluna.

### O que foi feito:

1. **Criada migration** (`20251124190000_add_organization_id_to_ai_interaction_settings.sql`):
   - Adiciona coluna `organization_id` à tabela `ai_interaction_settings`
   - Cria índice para melhor performance
   - Atualiza registros existentes (se houver) para vincular à primeira organização
   - Remove policies antigas que permitiam acesso público
   - Cria novas RLS policies que filtram por organização

2. **Atualizado código** (`src/pages/AIInteraction.tsx`):
   - Adicionado hook `useOrganization` para obter a organização do usuário
   - Incluído `organization_id` ao inserir novos registros de AI interaction settings

## 🚀 Como Aplicar a Correção

### Opção 1: Via SQL Editor (Recomendado)

1. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/sql
2. Execute a migration:
   ```sql
   -- Add organization_id column to ai_interaction_settings table
   ALTER TABLE public.ai_interaction_settings
   ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

   -- Create index
   CREATE INDEX IF NOT EXISTS idx_ai_interaction_settings_organization_id 
   ON public.ai_interaction_settings(organization_id);

   -- Update existing records
   DO $$
   DECLARE
     org_id UUID;
   BEGIN
     SELECT id INTO org_id FROM public.organizations LIMIT 1;
     IF org_id IS NOT NULL THEN
       UPDATE public.ai_interaction_settings
       SET organization_id = org_id
       WHERE organization_id IS NULL;
     END IF;
   END $$;

   -- Drop old policies
   DROP POLICY IF EXISTS "Anyone can view AI interaction settings" ON public.ai_interaction_settings;
   DROP POLICY IF EXISTS "Anyone can insert AI interaction settings" ON public.ai_interaction_settings;
   DROP POLICY IF EXISTS "Anyone can update AI interaction settings" ON public.ai_interaction_settings;
   DROP POLICY IF EXISTS "Anyone can delete AI interaction settings" ON public.ai_interaction_settings;

   -- Create new RLS policies
   CREATE POLICY "Users can view AI interaction settings in their organization"
     ON public.ai_interaction_settings FOR SELECT
     USING (organization_id = get_user_organization_id());

   CREATE POLICY "Users can insert AI interaction settings in their organization"
     ON public.ai_interaction_settings FOR INSERT
     WITH CHECK (organization_id = get_user_organization_id());

   CREATE POLICY "Users can update AI interaction settings in their organization"
     ON public.ai_interaction_settings FOR UPDATE
     USING (organization_id = get_user_organization_id());

   CREATE POLICY "Users can delete AI interaction settings in their organization"
     ON public.ai_interaction_settings FOR DELETE
     USING (organization_id = get_user_organization_id());
   ```

### Opção 2: Via Arquivo Consolidado

1. Regenere o arquivo consolidado (já foi feito):
   ```bash
   ./consolidate-migrations.sh
   ```

2. Acesse: https://app.supabase.com/project/lyqcsclmauwmzipjiazs/sql
3. Execute apenas a nova migration do arquivo `all-migrations.sql`

### Opção 3: Via CLI

```bash
supabase db push
```

## 📝 O que Mudou

### Antes:
- Tabela `ai_interaction_settings` era global (sem `organization_id`)
- Qualquer usuário podia ver/criar/editar/deletar qualquer configuração
- Não havia isolamento entre organizações

### Depois:
- Tabela `ai_interaction_settings` é por organização (com `organization_id`)
- Usuários só veem/criam/editam/deletam configurações da sua organização
- Isolamento completo entre organizações via RLS

## ✅ Verificação

Após aplicar a migration, verifique:

1. A coluna foi adicionada:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'ai_interaction_settings' 
   AND column_name = 'organization_id';
   ```

2. As policies foram criadas:
   ```sql
   SELECT policyname 
   FROM pg_policies 
   WHERE tablename = 'ai_interaction_settings';
   ```

3. O código funciona:
   - Tente criar uma nova configuração de AI interaction
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


