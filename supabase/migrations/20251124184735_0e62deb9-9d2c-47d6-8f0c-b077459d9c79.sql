-- Add remote_jid column to leads table for internal tracking
ALTER TABLE public.leads 
ADD COLUMN remote_jid text;