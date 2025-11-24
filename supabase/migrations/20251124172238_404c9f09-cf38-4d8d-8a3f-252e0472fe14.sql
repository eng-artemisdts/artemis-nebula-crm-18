-- Update handle_new_user trigger to not use logo_url from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  user_plan TEXT;
  user_company_name TEXT;
  user_phone TEXT;
BEGIN
  -- Extract company information from metadata
  user_company_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 1) || '''s Company'
  );
  
  user_phone := NEW.raw_user_meta_data->>'phone';
  
  -- Get selected plan from metadata, default to 'free'
  user_plan := COALESCE(
    NEW.raw_user_meta_data->>'selected_plan',
    'free'
  );
  
  -- Create organization without logo (will be updated later if provided)
  INSERT INTO public.organizations (
    name, 
    company_name,
    phone,
    plan, 
    trial_ends_at
  )
  VALUES (
    user_company_name,
    user_company_name,
    user_phone,
    user_plan, 
    now() + interval '7 days'
  )
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