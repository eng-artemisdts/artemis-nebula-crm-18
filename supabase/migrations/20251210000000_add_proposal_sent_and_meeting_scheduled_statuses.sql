-- Add "Proposta Enviada" and "Reunião Agendada" as default required statuses
-- This migration adds two new required statuses to all organizations

-- Update the function to include the new required statuses
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
    (org_id, 'proposal_sent', 'Proposta Enviada', true, 3),
    (org_id, 'meeting_scheduled', 'Reunião Agendada', true, 4),
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

-- Add the new statuses to all existing organizations
DO $$
DECLARE
  org_record RECORD;
  max_order INTEGER;
BEGIN
  FOR org_record IN SELECT id FROM public.organizations
  LOOP
    -- Get the maximum display_order for custom statuses (excluding finished)
    SELECT COALESCE(MAX(display_order), 0) INTO max_order
    FROM public.lead_statuses
    WHERE organization_id = org_record.id 
      AND is_required = false 
      AND status_key != 'finished';
    
    -- Insert the new required statuses if they don't exist
    INSERT INTO public.lead_statuses (organization_id, status_key, label, is_required, display_order)
    VALUES 
      (org_record.id, 'proposal_sent', 'Proposta Enviada', true, 3),
      (org_record.id, 'meeting_scheduled', 'Reunião Agendada', true, 4)
    ON CONFLICT (organization_id, status_key) DO NOTHING;
    
    -- Ensure finished is always the last status
    UPDATE public.lead_statuses
    SET display_order = (
      SELECT COALESCE(MAX(display_order), 0) + 1
      FROM public.lead_statuses
      WHERE organization_id = org_record.id 
        AND status_key != 'finished'
    )
    WHERE organization_id = org_record.id 
      AND status_key = 'finished';
  END LOOP;
END $$;
