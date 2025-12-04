-- Create table for scheduled messages
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'))
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status_scheduled_at 
ON public.scheduled_messages(status, scheduled_at);

-- Enable RLS
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view scheduled messages" 
ON public.scheduled_messages 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert scheduled messages" 
ON public.scheduled_messages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update scheduled messages" 
ON public.scheduled_messages 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete scheduled messages" 
ON public.scheduled_messages 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_scheduled_messages_updated_at
BEFORE UPDATE ON public.scheduled_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

