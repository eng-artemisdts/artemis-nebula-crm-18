-- Migration: Add agent scripts and routing fields
-- This migration adds fields for proactive and receptive conversation scripts

ALTER TABLE public.ai_interaction_settings
ADD COLUMN IF NOT EXISTS scenario_detection_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS proactive_opening_message TEXT,
ADD COLUMN IF NOT EXISTS proactive_hook_message TEXT,
ADD COLUMN IF NOT EXISTS proactive_development_paper TEXT,
ADD COLUMN IF NOT EXISTS proactive_development_system TEXT,
ADD COLUMN IF NOT EXISTS receptive_welcome_template TEXT,
ADD COLUMN IF NOT EXISTS receptive_qualification_question TEXT,
ADD COLUMN IF NOT EXISTS receptive_deepening_question TEXT,
ADD COLUMN IF NOT EXISTS receptive_value_proposition TEXT,
ADD COLUMN IF NOT EXISTS company_clients TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS total_clients TEXT;

COMMENT ON COLUMN public.ai_interaction_settings.scenario_detection_enabled IS 'Enable automatic scenario detection (proactive vs receptive)';
COMMENT ON COLUMN public.ai_interaction_settings.proactive_opening_message IS 'Opening message when bot initiates conversation (proactive scenario)';
COMMENT ON COLUMN public.ai_interaction_settings.proactive_hook_message IS 'Hook message after initial response in proactive scenario';
COMMENT ON COLUMN public.ai_interaction_settings.proactive_development_paper IS 'Development message when client uses paper/manual process';
COMMENT ON COLUMN public.ai_interaction_settings.proactive_development_system IS 'Development message when client already has a system';
COMMENT ON COLUMN public.ai_interaction_settings.receptive_welcome_template IS 'Welcome template when client initiates conversation';
COMMENT ON COLUMN public.ai_interaction_settings.receptive_qualification_question IS 'Qualification question for receptive scenario';
COMMENT ON COLUMN public.ai_interaction_settings.receptive_deepening_question IS 'Deepening question to understand current process';
COMMENT ON COLUMN public.ai_interaction_settings.receptive_value_proposition IS 'Value proposition template for receptive scenario';
COMMENT ON COLUMN public.ai_interaction_settings.company_clients IS 'Array of client names to mention when asked';
COMMENT ON COLUMN public.ai_interaction_settings.total_clients IS 'Total number of clients to mention when asked';
