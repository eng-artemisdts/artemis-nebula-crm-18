-- ============================================
-- Migrations de Status Personalizados
-- ============================================
-- Execute este arquivo no SQL Editor do Supabase Dashboard
-- https://app.supabase.com/project/lyqcsclmauwmzipjiazs/sql
-- ============================================

-- Migration 1: Create lead_statuses table
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_lead_statuses_organization_id 
ON public.lead_statuses(organization_id);

CREATE INDEX IF NOT EXISTS idx_lead_statuses_display_order 
ON public.lead_statuses(organization_id, display_order);

ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lead_statuses' 
    AND policyname = 'Users can view lead statuses in their organization'
  ) THEN
    CREATE POLICY "Users can view lead statuses in their organization"
      ON public.lead_statuses
      FOR SELECT
      USING (organization_id = get_user_organization_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lead_statuses' 
    AND policyname = 'Users can insert lead statuses in their organization'
  ) THEN
    CREATE POLICY "Users can insert lead statuses in their organization"
      ON public.lead_statuses
      FOR INSERT
      WITH CHECK (organization_id = get_user_organization_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lead_statuses' 
    AND policyname = 'Users can update lead statuses in their organization'
  ) THEN
    CREATE POLICY "Users can update lead statuses in their organization"
      ON public.lead_statuses
      FOR UPDATE
      USING (organization_id = get_user_organization_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lead_statuses' 
    AND policyname = 'Users can delete lead statuses in their organization'
  ) THEN
    CREATE POLICY "Users can delete lead statuses in their organization"
      ON public.lead_statuses
      FOR DELETE
      USING (organization_id = get_user_organization_id());
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_lead_statuses_updated_at ON public.lead_statuses;
CREATE TRIGGER update_lead_statuses_updated_at
  BEFORE UPDATE ON public.lead_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration 2: Remove status constraint from leads
-- ============================================
ALTER TABLE public.leads
DROP CONSTRAINT IF EXISTS valid_status;

-- Migration 3: Add finished status and update function
-- ============================================
CREATE OR REPLACE FUNCTION public.initialize_organization_statuses(org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(display_order), 0) INTO max_order
  FROM public.lead_statuses
  WHERE organization_id = org_id AND is_required = false;
  
  INSERT INTO public.lead_statuses (organization_id, status_key, label, is_required, display_order)
  VALUES 
    (org_id, 'new', 'Novo', true, 1),
    (org_id, 'conversation_started', 'Conversa Iniciada', true, 2),
    (org_id, 'finished', 'Finalizado', true, max_order + 1000)
  ON CONFLICT (organization_id, status_key) DO NOTHING;
  
  UPDATE public.lead_statuses
  SET display_order = (
    SELECT COALESCE(MAX(display_order), 0) + 1
    FROM public.lead_statuses
    WHERE organization_id = org_id AND status_key != 'finished'
  )
  WHERE organization_id = org_id AND status_key = 'finished';
END;
$$;

-- Migration 4: Update existing data to use English keys
-- ============================================
UPDATE public.leads
SET status = CASE
  WHEN status = 'novo' THEN 'new'
  WHEN status = 'conversa_iniciada' THEN 'conversation_started'
  WHEN status = 'finalizado' THEN 'finished'
  ELSE status
END
WHERE status IN ('novo', 'conversa_iniciada', 'finalizado');

UPDATE public.lead_statuses
SET status_key = CASE
  WHEN status_key = 'novo' THEN 'new'
  WHEN status_key = 'conversa_iniciada' THEN 'conversation_started'
  WHEN status_key = 'finalizado' THEN 'finished'
  ELSE status_key
END
WHERE status_key IN ('novo', 'conversa_iniciada', 'finalizado');

-- Initialize statuses for all existing organizations
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM public.organizations
  LOOP
    PERFORM public.initialize_organization_statuses(org_record.id);
  END LOOP;
END $$;

-- Fix finished status to always be the last one
DO $$
DECLARE
  org_record RECORD;
  max_order INTEGER;
  finished_order INTEGER;
BEGIN
  FOR org_record IN SELECT id FROM public.organizations
  LOOP
    SELECT COALESCE(MAX(display_order), 0) INTO max_order
    FROM public.lead_statuses
    WHERE organization_id = org_record.id 
      AND status_key != 'finished';
    
    SELECT display_order INTO finished_order
    FROM public.lead_statuses
    WHERE organization_id = org_record.id 
      AND status_key = 'finished';
    
    IF finished_order IS NOT NULL AND finished_order <= max_order THEN
      UPDATE public.lead_statuses
      SET display_order = max_order + 1
      WHERE organization_id = org_record.id 
        AND status_key = 'finished';
    END IF;
  END LOOP;
END $$;
