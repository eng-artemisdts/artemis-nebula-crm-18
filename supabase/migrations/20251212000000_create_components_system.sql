-- Migration: Create components system for agents
-- This migration creates tables for managing agent components/capabilities

-- Create components table
CREATE TABLE IF NOT EXISTS public.components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  identifier TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_components junction table (many-to-many)
CREATE TABLE IF NOT EXISTS public.agent_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_interaction_settings(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agent_id, component_id)
);

-- Create organization_components table (controls which components are available to organizations)
CREATE TABLE IF NOT EXISTS public.organization_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, component_id)
);

-- Enable Row Level Security
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_components ENABLE ROW LEVEL SECURITY;

-- RLS Policies for components (all authenticated users can view)
CREATE POLICY "Authenticated users can view components"
  ON public.components
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policies for agent_components
CREATE POLICY "Users can view agent components for their organization agents"
  ON public.agent_components
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_interaction_settings
      WHERE ai_interaction_settings.id = agent_components.agent_id
      AND ai_interaction_settings.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert agent components for their organization agents"
  ON public.agent_components
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_interaction_settings
      WHERE ai_interaction_settings.id = agent_components.agent_id
      AND ai_interaction_settings.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete agent components for their organization agents"
  ON public.agent_components
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_interaction_settings
      WHERE ai_interaction_settings.id = agent_components.agent_id
      AND ai_interaction_settings.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for organization_components
CREATE POLICY "Users can view organization components for their organization"
  ON public.organization_components
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert organization components for their organization"
  ON public.organization_components
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete organization components for their organization"
  ON public.organization_components
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_components_agent_id ON public.agent_components(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_components_component_id ON public.agent_components(component_id);
CREATE INDEX IF NOT EXISTS idx_organization_components_organization_id ON public.organization_components(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_components_component_id ON public.organization_components(component_id);
CREATE INDEX IF NOT EXISTS idx_components_identifier ON public.components(identifier);

-- Add trigger for updated_at
CREATE TRIGGER update_components_updated_at
BEFORE UPDATE ON public.components
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default components
INSERT INTO public.components (name, description, identifier) VALUES
  ('Envio de Emails', 'Permite ao agente enviar emails para clientes e leads', 'email_sender'),
  ('Agendamento de Reuniões', 'Permite ao agente agendar reuniões e consultas', 'meeting_scheduler'),
  ('Consulta de Informações', 'Permite ao agente consultar informações do CRM', 'crm_query'),
  ('Criação de Propostas', 'Permite ao agente criar e enviar propostas comerciais', 'proposal_creator'),
  ('Follow-up Automático', 'Permite ao agente realizar follow-ups automáticos', 'auto_followup'),
  ('Integração com WhatsApp', 'Permite ao agente interagir via WhatsApp', 'whatsapp_integration'),
  ('Análise de Sentimento', 'Permite ao agente analisar o sentimento das conversas', 'sentiment_analysis'),
  ('Geração de Relatórios', 'Permite ao agente gerar relatórios de interações', 'report_generator')
ON CONFLICT (identifier) DO NOTHING;

COMMENT ON TABLE public.components IS 'Available components/capabilities that agents can use';
COMMENT ON TABLE public.agent_components IS 'Junction table linking agents to their enabled components';
COMMENT ON TABLE public.organization_components IS 'Controls which components are available to each organization';











