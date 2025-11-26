-- Add organization_id column to settings table
-- This makes settings per-organization instead of global

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_organization_id ON public.settings(organization_id);

-- Update existing settings to be linked to organizations (if any exist)
-- This is a safety measure - in practice, settings should be created per organization
DO $$
DECLARE
  org_id UUID;
BEGIN
  -- If there are settings without organization_id, try to link them to the first organization
  -- This is a migration helper - in production, each organization should have its own settings
  SELECT id INTO org_id FROM public.organizations LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    UPDATE public.settings
    SET organization_id = org_id
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- Drop old public policies that don't use organization_id
DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;
DROP POLICY IF EXISTS "Anyone can update settings" ON public.settings;

-- Create new RLS policies that use organization_id
CREATE POLICY "Users can view settings in their organization"
  ON public.settings
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update settings in their organization"
  ON public.settings
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

