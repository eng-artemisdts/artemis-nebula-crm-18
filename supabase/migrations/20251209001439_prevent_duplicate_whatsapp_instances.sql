-- Prevent duplicate WhatsApp instances with the same phone number or JID
-- Create unique partial indexes that only apply when values are not NULL

-- Unique index for phone_number (only when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_instances_unique_phone_number 
ON public.whatsapp_instances(phone_number) 
WHERE phone_number IS NOT NULL;

-- Unique index for whatsapp_jid (only when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_instances_unique_whatsapp_jid 
ON public.whatsapp_instances(whatsapp_jid) 
WHERE whatsapp_jid IS NOT NULL;

