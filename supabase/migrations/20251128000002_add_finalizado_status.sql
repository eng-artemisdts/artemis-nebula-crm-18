-- Add 'finalizado' status to existing organizations
-- This migration ensures all organizations have the 'finalizado' status as the last status

DO $$
DECLARE
  org_record RECORD;
  max_order INTEGER;
BEGIN
  FOR org_record IN SELECT id FROM public.organizations
  LOOP
    -- Get the maximum display_order for custom statuses (excluding finalizado)
    SELECT COALESCE(MAX(display_order), 0) INTO max_order
    FROM public.lead_statuses
    WHERE organization_id = org_record.id AND status_key != 'finalizado';
    
    -- Insert finished status if it doesn't exist
    INSERT INTO public.lead_statuses (organization_id, status_key, label, is_required, display_order)
    VALUES (org_record.id, 'finished', 'Finalizado', true, max_order + 1)
    ON CONFLICT (organization_id, status_key) DO NOTHING;
    
    -- Update finished to be the last status if it already exists
    UPDATE public.lead_statuses
    SET display_order = max_order + 1
    WHERE organization_id = org_record.id 
      AND status_key = 'finished'
      AND display_order <= max_order;
  END LOOP;
END $$;

-- Update the initialize function to include finalizado
CREATE OR REPLACE FUNCTION public.initialize_organization_statuses(org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_order INTEGER;
BEGIN
  -- Get the maximum display_order for custom statuses
  SELECT COALESCE(MAX(display_order), 0) INTO max_order
  FROM public.lead_statuses
  WHERE organization_id = org_id AND is_required = false;
  
  -- Insert required statuses if they don't exist (using English keys, Portuguese labels)
  INSERT INTO public.lead_statuses (organization_id, status_key, label, is_required, display_order)
  VALUES 
    (org_id, 'new', 'Novo', true, 1),
    (org_id, 'conversation_started', 'Conversa Iniciada', true, 2),
    (org_id, 'finished', 'Finalizado', true, max_order + 1000)
  ON CONFLICT (organization_id, status_key) DO NOTHING;
  
  -- Ensure finished is always the last status
  UPDATE public.lead_statuses
  SET display_order = (
    SELECT COALESCE(MAX(display_order), 0) + 1
    FROM public.lead_statuses
    WHERE organization_id = org_id AND status_key != 'finished'
  )
  WHERE organization_id = org_id AND status_key = 'finished';
END;
$$;




