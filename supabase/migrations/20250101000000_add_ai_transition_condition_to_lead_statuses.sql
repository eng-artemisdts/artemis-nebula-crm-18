-- Add ai_transition_condition column to lead_statuses table
-- This field allows users to specify when the AI should transition a lead to this status

ALTER TABLE public.lead_statuses
ADD COLUMN IF NOT EXISTS ai_transition_condition TEXT;

COMMENT ON COLUMN public.lead_statuses.ai_transition_condition IS 'Texto livre que descreve quando a IA deve mudar o lead para esta etapa do funil';

