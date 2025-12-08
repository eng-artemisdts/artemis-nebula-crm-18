-- Fix finished status to always be the last one
-- This migration ensures that the 'finished' status always has the highest display_order

DO $$
DECLARE
  org_record RECORD;
  max_order INTEGER;
  finished_order INTEGER;
BEGIN
  FOR org_record IN SELECT id FROM public.organizations
  LOOP
    -- Get the maximum display_order excluding finished
    SELECT COALESCE(MAX(display_order), 0) INTO max_order
    FROM public.lead_statuses
    WHERE organization_id = org_record.id 
      AND status_key != 'finished';
    
    -- Get current finished order
    SELECT display_order INTO finished_order
    FROM public.lead_statuses
    WHERE organization_id = org_record.id 
      AND status_key = 'finished';
    
    -- Update finished to be the last if it exists and is not already last
    IF finished_order IS NOT NULL AND finished_order <= max_order THEN
      UPDATE public.lead_statuses
      SET display_order = max_order + 1
      WHERE organization_id = org_record.id 
        AND status_key = 'finished';
    END IF;
  END LOOP;
END $$;

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
