-- Update status keys to English while keeping labels in Portuguese
-- This migration updates the required status keys from Portuguese to English

-- First, update any leads that use the old status keys
UPDATE public.leads
SET status = CASE
  WHEN status = 'novo' THEN 'new'
  WHEN status = 'conversa_iniciada' THEN 'conversation_started'
  WHEN status = 'finalizado' THEN 'finished'
  ELSE status
END
WHERE status IN ('novo', 'conversa_iniciada', 'finalizado');

-- Update the status_keys in lead_statuses table
UPDATE public.lead_statuses
SET status_key = CASE
  WHEN status_key = 'novo' THEN 'new'
  WHEN status_key = 'conversa_iniciada' THEN 'conversation_started'
  WHEN status_key = 'finalizado' THEN 'finished'
  ELSE status_key
END
WHERE status_key IN ('novo', 'conversa_iniciada', 'finalizado');

-- Update the initialize function to use English keys
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


