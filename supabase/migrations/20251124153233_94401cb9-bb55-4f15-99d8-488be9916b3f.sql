-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add organization_id to profiles (create profiles if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add organization_id to existing tables
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.lead_categories ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.ai_interaction_settings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_categories_organization_id ON public.lead_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_settings_organization_id ON public.ai_interaction_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_settings_organization_id ON public.settings(organization_id);

-- Function to get user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization"
  ON public.organizations FOR SELECT
  USING (id = public.get_user_organization_id());

CREATE POLICY "Users can update their own organization"
  ON public.organizations FOR UPDATE
  USING (id = public.get_user_organization_id());

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Update RLS Policies for leads
DROP POLICY IF EXISTS "Anyone can view leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can update leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can delete leads" ON public.leads;

CREATE POLICY "Users can view leads in their organization"
  ON public.leads FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert leads in their organization"
  ON public.leads FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update leads in their organization"
  ON public.leads FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete leads in their organization"
  ON public.leads FOR DELETE
  USING (organization_id = public.get_user_organization_id());

-- Update RLS Policies for lead_categories
DROP POLICY IF EXISTS "Anyone can view lead categories" ON public.lead_categories;
DROP POLICY IF EXISTS "Anyone can insert lead categories" ON public.lead_categories;
DROP POLICY IF EXISTS "Anyone can update lead categories" ON public.lead_categories;
DROP POLICY IF EXISTS "Anyone can delete lead categories" ON public.lead_categories;

CREATE POLICY "Users can view lead categories in their organization"
  ON public.lead_categories FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert lead categories in their organization"
  ON public.lead_categories FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update lead categories in their organization"
  ON public.lead_categories FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete lead categories in their organization"
  ON public.lead_categories FOR DELETE
  USING (organization_id = public.get_user_organization_id());

-- Update RLS Policies for ai_interaction_settings
DROP POLICY IF EXISTS "Anyone can view AI interaction settings" ON public.ai_interaction_settings;
DROP POLICY IF EXISTS "Anyone can insert AI interaction settings" ON public.ai_interaction_settings;
DROP POLICY IF EXISTS "Anyone can update AI interaction settings" ON public.ai_interaction_settings;
DROP POLICY IF EXISTS "Anyone can delete AI interaction settings" ON public.ai_interaction_settings;

CREATE POLICY "Users can view AI settings in their organization"
  ON public.ai_interaction_settings FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert AI settings in their organization"
  ON public.ai_interaction_settings FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update AI settings in their organization"
  ON public.ai_interaction_settings FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete AI settings in their organization"
  ON public.ai_interaction_settings FOR DELETE
  USING (organization_id = public.get_user_organization_id());

-- Update RLS Policies for settings
DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;
DROP POLICY IF EXISTS "Anyone can update settings" ON public.settings;

CREATE POLICY "Users can view settings in their organization"
  ON public.settings FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update settings in their organization"
  ON public.settings FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

-- Trigger to create organization and profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
BEGIN
  -- Extract company name from metadata or use email domain
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 1) || '''s Company'
  );
  
  -- Create organization with 7-day trial
  INSERT INTO public.organizations (name, plan, trial_ends_at)
  VALUES (org_name, 'free', now() + interval '7 days')
  RETURNING id INTO new_org_id;
  
  -- Create profile linked to organization
  INSERT INTO public.profiles (id, organization_id, display_name)
  VALUES (
    NEW.id,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();