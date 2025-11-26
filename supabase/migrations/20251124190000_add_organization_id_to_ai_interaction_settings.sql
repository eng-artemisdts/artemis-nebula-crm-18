-- Add organization_id column to ai_interaction_settings table
-- This makes AI interaction settings per-organization instead of global

ALTER TABLE public.ai_interaction_settings
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_interaction_settings_organization_id 
ON public.ai_interaction_settings(organization_id);

-- Update existing AI interaction settings to be linked to organizations (if any exist)
DO $$
DECLARE
  org_id UUID;
BEGIN
  -- If there are AI settings without organization_id, try to link them to the first organization
  -- This is a migration helper - in production, each organization should have its own settings
  SELECT id INTO org_id FROM public.organizations LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    UPDATE public.ai_interaction_settings
    SET organization_id = org_id
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- Drop old public policies that don't use organization_id
DROP POLICY IF EXISTS "Anyone can view AI interaction settings" ON public.ai_interaction_settings;
DROP POLICY IF EXISTS "Anyone can insert AI interaction settings" ON public.ai_interaction_settings;
DROP POLICY IF EXISTS "Anyone can update AI interaction settings" ON public.ai_interaction_settings;
DROP POLICY IF EXISTS "Anyone can delete AI interaction settings" ON public.ai_interaction_settings;

-- Create new RLS policies that use organization_id
CREATE POLICY "Users can view AI interaction settings in their organization"
  ON public.ai_interaction_settings
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert AI interaction settings in their organization"
  ON public.ai_interaction_settings
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update AI interaction settings in their organization"
  ON public.ai_interaction_settings
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete AI interaction settings in their organization"
  ON public.ai_interaction_settings
  FOR DELETE
  USING (organization_id = get_user_organization_id());


