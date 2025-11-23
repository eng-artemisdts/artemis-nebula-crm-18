-- Create table for AI interaction settings
CREATE TABLE public.ai_interaction_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  conversation_focus TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  rejection_action TEXT NOT NULL DEFAULT 'follow_up',
  tone TEXT NOT NULL DEFAULT 'professional',
  main_objective TEXT NOT NULL,
  additional_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_interaction_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view AI interaction settings" 
ON public.ai_interaction_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert AI interaction settings" 
ON public.ai_interaction_settings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update AI interaction settings" 
ON public.ai_interaction_settings 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete AI interaction settings" 
ON public.ai_interaction_settings 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_ai_interaction_settings_updated_at
BEFORE UPDATE ON public.ai_interaction_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();