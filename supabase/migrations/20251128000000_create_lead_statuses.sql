-- Create lead_statuses table for custom status per organization
CREATE TABLE IF NOT EXISTS public.lead_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status_key TEXT NOT NULL,
  label TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_organization_status_key UNIQUE (organization_id, status_key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lead_statuses_organization_id 
ON public.lead_statuses(organization_id);

CREATE INDEX IF NOT EXISTS idx_lead_statuses_display_order 
ON public.lead_statuses(organization_id, display_order);

-- Enable Row Level Security
ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view lead statuses in their organization"
  ON public.lead_statuses
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert lead statuses in their organization"
  ON public.lead_statuses
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update lead statuses in their organization"
  ON public.lead_statuses
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete lead statuses in their organization"
  ON public.lead_statuses
  FOR DELETE
  USING (organization_id = get_user_organization_id());

-- Create trigger for updated_at
CREATE TRIGGER update_lead_statuses_updated_at
  BEFORE UPDATE ON public.lead_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize default required statuses for an organization
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

-- Trigger to automatically create required statuses when an organization is created
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

CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();

-- Initialize statuses for existing organizations
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM public.organizations
  LOOP
    PERFORM public.initialize_organization_statuses(org_record.id);
  END LOOP;
END $$;


