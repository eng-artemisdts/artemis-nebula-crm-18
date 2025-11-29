-- Add organization_id column to leads table
-- This makes leads per-organization instead of global

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_organization_id 
ON public.leads(organization_id);

-- Update existing leads to be linked to organizations (if any exist)
DO $$
DECLARE
  org_id UUID;
BEGIN
  -- If there are leads without organization_id, try to link them to the first organization
  -- This is a migration helper - in production, each organization should have its own leads
  SELECT id INTO org_id FROM public.organizations LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    UPDATE public.leads
    SET organization_id = org_id
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- Drop old public policies that don't use organization_id
DROP POLICY IF EXISTS "Anyone can view leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can update leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can delete leads" ON public.leads;

-- Create new RLS policies that use organization_id
CREATE POLICY "Users can view leads in their organization"
  ON public.leads
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert leads in their organization"
  ON public.leads
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update leads in their organization"
  ON public.leads
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete leads in their organization"
  ON public.leads
  FOR DELETE
  USING (organization_id = get_user_organization_id());


