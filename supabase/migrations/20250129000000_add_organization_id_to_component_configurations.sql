-- Migration: Add organization_id to component_configurations
-- This allows component configurations to be separated by organization

-- Step 1: Add organization_id column
ALTER TABLE public.component_configurations
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Step 2: Update existing records to set organization_id from user's profile
UPDATE public.component_configurations cc
SET organization_id = p.organization_id
FROM public.profiles p
WHERE cc.user_id = p.id
  AND cc.organization_id IS NULL
  AND p.organization_id IS NOT NULL;

-- Step 3: Remove the old unique constraint if it exists
ALTER TABLE public.component_configurations
DROP CONSTRAINT IF EXISTS component_configurations_component_id_user_id_key;

-- Step 4: Add unique constraint for organization-level configs (user_id IS NULL)
-- This ensures only one organization-level config per component per organization
CREATE UNIQUE INDEX IF NOT EXISTS component_configurations_component_org_key 
ON public.component_configurations(component_id, organization_id) 
WHERE user_id IS NULL;

-- Step 4b: Add unique constraint for user-level configs (user_id IS NOT NULL)
-- This ensures only one user-level config per component per organization per user
CREATE UNIQUE INDEX IF NOT EXISTS component_configurations_component_org_user_key 
ON public.component_configurations(component_id, organization_id, user_id) 
WHERE user_id IS NOT NULL;

-- Step 5: Create index for organization_id
CREATE INDEX IF NOT EXISTS idx_component_configurations_organization_id 
ON public.component_configurations(organization_id);

-- Step 6: Create composite index for faster lookups by organization
CREATE INDEX IF NOT EXISTS idx_component_configurations_component_org 
ON public.component_configurations(component_id, organization_id);

-- Step 7: Update RLS policies to include organization_id filter
DROP POLICY IF EXISTS "Users can view their own component configurations" 
ON public.component_configurations;

CREATE POLICY "Users can view component configurations for their organization"
  ON public.component_configurations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      user_id IS NULL 
      OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own component configurations" 
ON public.component_configurations;

CREATE POLICY "Users can insert component configurations for their organization"
  ON public.component_configurations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      user_id IS NULL 
      OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own component configurations" 
ON public.component_configurations;

CREATE POLICY "Users can update component configurations for their organization"
  ON public.component_configurations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      user_id IS NULL 
      OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own component configurations" 
ON public.component_configurations;

CREATE POLICY "Users can delete component configurations for their organization"
  ON public.component_configurations
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      user_id IS NULL 
      OR user_id = auth.uid()
    )
  );

COMMENT ON COLUMN public.component_configurations.organization_id IS 'ID da organização que possui esta configuração. Permite que cada organização tenha sua própria configuração para cada componente.';
