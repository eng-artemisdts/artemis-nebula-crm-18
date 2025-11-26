-- Add organization_id column to lead_categories table
-- This makes lead categories per-organization instead of global

ALTER TABLE public.lead_categories
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lead_categories_organization_id 
ON public.lead_categories(organization_id);

-- Update existing lead categories to be linked to organizations (if any exist)
DO $$
DECLARE
  org_id UUID;
BEGIN
  -- If there are categories without organization_id, try to link them to the first organization
  -- This is a migration helper - in production, each organization should have its own categories
  SELECT id INTO org_id FROM public.organizations LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    UPDATE public.lead_categories
    SET organization_id = org_id
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- Drop old public policies that don't use organization_id
DROP POLICY IF EXISTS "Anyone can view lead categories" ON public.lead_categories;
DROP POLICY IF EXISTS "Anyone can insert lead categories" ON public.lead_categories;
DROP POLICY IF EXISTS "Anyone can update lead categories" ON public.lead_categories;
DROP POLICY IF EXISTS "Anyone can delete lead categories" ON public.lead_categories;

-- Create new RLS policies that use organization_id
CREATE POLICY "Users can view lead categories in their organization"
  ON public.lead_categories
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert lead categories in their organization"
  ON public.lead_categories
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update lead categories in their organization"
  ON public.lead_categories
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete lead categories in their organization"
  ON public.lead_categories
  FOR DELETE
  USING (organization_id = get_user_organization_id());

