-- Add closing_instructions field to ai_interaction_settings table
ALTER TABLE public.ai_interaction_settings
ADD COLUMN closing_instructions TEXT;

COMMENT ON COLUMN public.ai_interaction_settings.closing_instructions IS 'Instructions on how to close the conversation when the lead does not convert';