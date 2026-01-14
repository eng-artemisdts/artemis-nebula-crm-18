-- Migration: Add user_id to component_configurations
-- This allows each user to have their own configuration for each component

-- Step 1: Add user_id column
ALTER TABLE public.component_configurations
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Remove the old unique constraint
ALTER TABLE public.component_configurations
DROP CONSTRAINT IF EXISTS component_configurations_component_id_key;

-- Step 3: Add new unique constraint for component_id + user_id
ALTER TABLE public.component_configurations
ADD CONSTRAINT component_configurations_component_id_user_id_key 
UNIQUE(component_id, user_id);

-- Step 4: Create index for user_id
CREATE INDEX IF NOT EXISTS idx_component_configurations_user_id 
ON public.component_configurations(user_id);

-- Step 5: Create composite index for faster lookups
CREATE INDEX IF NOT EXISTS idx_component_configurations_component_user 
ON public.component_configurations(component_id, user_id);

-- Step 6: Update RLS policies to include user_id filter
DROP POLICY IF EXISTS "Users can view component configurations for their organization components" 
ON public.component_configurations;

CREATE POLICY "Users can view their own component configurations"
  ON public.component_configurations
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.components
      WHERE components.id = component_configurations.component_id
      AND EXISTS (
        SELECT 1 FROM public.organization_components
        WHERE organization_components.component_id = components.id
        AND organization_components.organization_id IN (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert component configurations for their organization components" 
ON public.component_configurations;

CREATE POLICY "Users can insert their own component configurations"
  ON public.component_configurations
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.components
      WHERE components.id = component_configurations.component_id
      AND EXISTS (
        SELECT 1 FROM public.organization_components
        WHERE organization_components.component_id = components.id
        AND organization_components.organization_id IN (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update component configurations for their organization components" 
ON public.component_configurations;

CREATE POLICY "Users can update their own component configurations"
  ON public.component_configurations
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.components
      WHERE components.id = component_configurations.component_id
      AND EXISTS (
        SELECT 1 FROM public.organization_components
        WHERE organization_components.component_id = components.id
        AND organization_components.organization_id IN (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete component configurations for their organization components" 
ON public.component_configurations;

CREATE POLICY "Users can delete their own component configurations"
  ON public.component_configurations
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.components
      WHERE components.id = component_configurations.component_id
      AND EXISTS (
        SELECT 1 FROM public.organization_components
        WHERE organization_components.component_id = components.id
        AND organization_components.organization_id IN (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
      )
    )
  );

COMMENT ON COLUMN public.component_configurations.user_id IS 'ID do usuário que possui esta configuração. Permite que cada usuário tenha sua própria configuração para cada componente.';

