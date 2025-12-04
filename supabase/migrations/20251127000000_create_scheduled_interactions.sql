-- Create table for scheduled interactions
CREATE TABLE IF NOT EXISTS public.scheduled_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  ai_interaction_id UUID NOT NULL REFERENCES public.ai_interaction_settings(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'completed', 'cancelled'))
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_scheduled_interactions_status_scheduled_at 
ON public.scheduled_interactions(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_interactions_lead_id 
ON public.scheduled_interactions(lead_id);

-- Enable RLS
ALTER TABLE public.scheduled_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view scheduled interactions" 
ON public.scheduled_interactions 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert scheduled interactions" 
ON public.scheduled_interactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update scheduled interactions" 
ON public.scheduled_interactions 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete scheduled interactions" 
ON public.scheduled_interactions 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_scheduled_interactions_updated_at
BEFORE UPDATE ON public.scheduled_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

