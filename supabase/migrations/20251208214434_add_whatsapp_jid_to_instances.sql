-- Add whatsapp_jid column to whatsapp_instances table
ALTER TABLE public.whatsapp_instances
ADD COLUMN IF NOT EXISTS whatsapp_jid TEXT;

-- Add index for whatsapp_jid lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_jid ON public.whatsapp_instances(whatsapp_jid);

