-- Migration: Create component_configurations table
-- This migration creates a table to store component-specific configurations (API keys, secrets, etc.)

CREATE TABLE IF NOT EXISTS public.component_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(component_id)
);

-- Enable Row Level Security
ALTER TABLE public.component_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for component_configurations
CREATE POLICY "Users can view component configurations for their organization components"
  ON public.component_configurations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.components
      WHERE components.id = component_configurations.component_id
      AND EXISTS (
        SELECT 1 FROM public.organization_components
        WHERE organization_components.component_id = components.id
        AND organization_components.organization_id IN (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can insert component configurations for their organization components"
  ON public.component_configurations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.components
      WHERE components.id = component_configurations.component_id
      AND EXISTS (
        SELECT 1 FROM public.organization_components
        WHERE organization_components.component_id = components.id
        AND organization_components.organization_id IN (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update component configurations for their organization components"
  ON public.component_configurations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.components
      WHERE components.id = component_configurations.component_id
      AND EXISTS (
        SELECT 1 FROM public.organization_components
        WHERE organization_components.component_id = components.id
        AND organization_components.organization_id IN (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete component configurations for their organization components"
  ON public.component_configurations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.components
      WHERE components.id = component_configurations.component_id
      AND EXISTS (
        SELECT 1 FROM public.organization_components
        WHERE organization_components.component_id = components.id
        AND organization_components.organization_id IN (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
      )
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_component_configurations_component_id ON public.component_configurations(component_id);

-- Add trigger for updated_at
CREATE TRIGGER update_component_configurations_updated_at
BEFORE UPDATE ON public.component_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.component_configurations IS 'Stores configuration data (API keys, secrets, etc.) for each component';
COMMENT ON COLUMN public.component_configurations.config IS 'JSON object containing component-specific configuration settings';

