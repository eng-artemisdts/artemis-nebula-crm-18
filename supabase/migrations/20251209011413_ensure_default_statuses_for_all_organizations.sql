-- Ensure default statuses are created for all organizations
-- This migration fixes the issue where default statuses are not being created automatically

-- Update the function to ensure finished is always last when initializing
CREATE OR REPLACE FUNCTION public.initialize_organization_statuses(org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_order INTEGER;
BEGIN
  -- Get the maximum display_order for custom statuses (excluding finished)
  SELECT COALESCE(MAX(display_order), 0) INTO max_order
  FROM public.lead_statuses
  WHERE organization_id = org_id 
    AND is_required = false 
    AND status_key != 'finished';
  
  -- Insert required statuses if they don't exist (using English keys, Portuguese labels)
  INSERT INTO public.lead_statuses (organization_id, status_key, label, is_required, display_order)
  VALUES 
    (org_id, 'new', 'Novo', true, 1),
    (org_id, 'conversation_started', 'Conversa Iniciada', true, 2),
    (org_id, 'finished', 'Finalizado', true, max_order + 1000)
  ON CONFLICT (organization_id, status_key) DO NOTHING;
  
  -- Always ensure finished is the last status
  UPDATE public.lead_statuses
  SET display_order = (
    SELECT COALESCE(MAX(display_order), 0) + 1
    FROM public.lead_statuses
    WHERE organization_id = org_id 
      AND status_key != 'finished'
  )
  WHERE organization_id = org_id 
    AND status_key = 'finished';
END;
$$;

-- Ensure the trigger function exists and is correct
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.initialize_organization_statuses(NEW.id);
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger to ensure it exists
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();

-- Initialize statuses for all existing organizations that don't have them
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN 
    SELECT o.id 
    FROM public.organizations o
    WHERE NOT EXISTS (
      SELECT 1 
      FROM public.lead_statuses ls 
      WHERE ls.organization_id = o.id 
      AND ls.status_key = 'new'
    )
  LOOP
    PERFORM public.initialize_organization_statuses(org_record.id);
  END LOOP;
END $$;

