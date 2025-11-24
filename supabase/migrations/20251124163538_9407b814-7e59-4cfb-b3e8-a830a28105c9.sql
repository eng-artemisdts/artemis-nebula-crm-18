-- Update handle_new_user function to save company information
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
  user_cnpj TEXT;
  user_phone TEXT;
  user_logo_url TEXT;
BEGIN
  -- Extract company information from metadata
  user_company_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 1) || '''s Company'
  );
  
  user_cnpj := NEW.raw_user_meta_data->>'cnpj';
  user_phone := NEW.raw_user_meta_data->>'phone';
  user_logo_url := NEW.raw_user_meta_data->>'logo_url';
  
  -- Get selected plan from metadata, default to 'free'
  user_plan := COALESCE(
    NEW.raw_user_meta_data->>'selected_plan',
    'free'
  );
  
  -- Create organization with all information
  INSERT INTO public.organizations (
    name, 
    company_name,
    cnpj,
    phone,
    logo_url,
    plan, 
    trial_ends_at
  )
  VALUES (
    user_company_name,
    user_company_name,
    user_cnpj,
    user_phone,
    user_logo_url,
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