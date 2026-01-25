-- Migration: Create agent_scripts table
-- This migration creates a table to store reusable conversation scripts/routing templates

CREATE TABLE IF NOT EXISTS public.agent_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scenario_detection_enabled BOOLEAN DEFAULT false,
  proactive_opening_message TEXT,
  proactive_hook_message TEXT,
  proactive_development_paper TEXT,
  proactive_development_system TEXT,
  receptive_welcome_template TEXT,
  receptive_qualification_question TEXT,
  receptive_deepening_question TEXT,
  receptive_value_proposition TEXT,
  company_clients TEXT[] DEFAULT ARRAY[]::TEXT[],
  total_clients TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_scripts_organization_id 
ON public.agent_scripts(organization_id);

-- Enable Row Level Security
ALTER TABLE public.agent_scripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_scripts
CREATE POLICY "Users can view agent scripts in their organization"
  ON public.agent_scripts
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert agent scripts in their organization"
  ON public.agent_scripts
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update agent scripts in their organization"
  ON public.agent_scripts
  FOR UPDATE
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete agent scripts in their organization"
  ON public.agent_scripts
  FOR DELETE
  USING (organization_id = get_user_organization_id());

-- Add trigger for updated_at
CREATE TRIGGER update_agent_scripts_updated_at
BEFORE UPDATE ON public.agent_scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.agent_scripts IS 'Reusable conversation scripts/routing templates for agents';
COMMENT ON COLUMN public.agent_scripts.scenario_detection_enabled IS 'Enable automatic scenario detection (proactive vs receptive)';
COMMENT ON COLUMN public.agent_scripts.proactive_opening_message IS 'Opening message when bot initiates conversation (proactive scenario)';
COMMENT ON COLUMN public.agent_scripts.proactive_hook_message IS 'Hook message after initial response in proactive scenario';
COMMENT ON COLUMN public.agent_scripts.proactive_development_paper IS 'Development message when client uses paper/manual process';
COMMENT ON COLUMN public.agent_scripts.proactive_development_system IS 'Development message when client already has a system';
COMMENT ON COLUMN public.agent_scripts.receptive_welcome_template IS 'Welcome template when client initiates conversation';
COMMENT ON COLUMN public.agent_scripts.receptive_qualification_question IS 'Qualification question for receptive scenario';
COMMENT ON COLUMN public.agent_scripts.receptive_deepening_question IS 'Deepening question to understand current process';
COMMENT ON COLUMN public.agent_scripts.receptive_value_proposition IS 'Value proposition template for receptive scenario';
COMMENT ON COLUMN public.agent_scripts.company_clients IS 'Array of client names to mention when asked';
COMMENT ON COLUMN public.agent_scripts.total_clients IS 'Total number of clients to mention when asked';

-- Add script_id to ai_interaction_settings to link agents to scripts
ALTER TABLE public.ai_interaction_settings
ADD COLUMN IF NOT EXISTS script_id UUID REFERENCES public.agent_scripts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_interaction_settings_script_id 
ON public.ai_interaction_settings(script_id);
