-- Migration: Create agent_component_configurations table
-- This migration creates a table to store agent-specific component configurations
-- For example, which WhatsApp instance to use for each agent

CREATE TABLE IF NOT EXISTS public.agent_component_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_interaction_settings(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agent_id, component_id)
);

-- Enable Row Level Security
ALTER TABLE public.agent_component_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_component_configurations
CREATE POLICY "Users can view agent component configurations for their organization agents"
  ON public.agent_component_configurations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_interaction_settings
      WHERE ai_interaction_settings.id = agent_component_configurations.agent_id
      AND ai_interaction_settings.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert agent component configurations for their organization agents"
  ON public.agent_component_configurations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_interaction_settings
      WHERE ai_interaction_settings.id = agent_component_configurations.agent_id
      AND ai_interaction_settings.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update agent component configurations for their organization agents"
  ON public.agent_component_configurations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_interaction_settings
      WHERE ai_interaction_settings.id = agent_component_configurations.agent_id
      AND ai_interaction_settings.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete agent component configurations for their organization agents"
  ON public.agent_component_configurations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_interaction_settings
      WHERE ai_interaction_settings.id = agent_component_configurations.agent_id
      AND ai_interaction_settings.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_component_configurations_agent_id ON public.agent_component_configurations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_component_configurations_component_id ON public.agent_component_configurations(component_id);

-- Add trigger for updated_at
CREATE TRIGGER update_agent_component_configurations_updated_at
BEFORE UPDATE ON public.agent_component_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.agent_component_configurations IS 'Stores agent-specific configuration data for components (e.g., which WhatsApp instance to use)';
COMMENT ON COLUMN public.agent_component_configurations.config IS 'JSON object containing agent-specific component configuration settings';

