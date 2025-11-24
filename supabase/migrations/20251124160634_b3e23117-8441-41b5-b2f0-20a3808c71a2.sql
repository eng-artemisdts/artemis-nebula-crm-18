-- Update organizations table to ensure plan structure is correct
-- The table already exists, just making sure we have proper constraints

-- Add check constraint for valid plans
ALTER TABLE public.organizations 
DROP CONSTRAINT IF EXISTS organizations_plan_check;

ALTER TABLE public.organizations 
ADD CONSTRAINT organizations_plan_check 
CHECK (plan IN ('free', 'pro'));

-- Create index for faster plan lookups
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON public.organizations(plan);
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends_at ON public.organizations(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON public.organizations(stripe_customer_id);

-- Update the handle_new_user function to ensure 7-day trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;