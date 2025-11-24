-- Adicionar campo para armazenar a configuração de IA padrão
ALTER TABLE public.settings 
ADD COLUMN default_ai_interaction_id UUID REFERENCES public.ai_interaction_settings(id) ON DELETE SET NULL;

-- Adicionar campo para armazenar a configuração de IA específica de cada lead
ALTER TABLE public.leads 
ADD COLUMN ai_interaction_id UUID REFERENCES public.ai_interaction_settings(id) ON DELETE SET NULL;