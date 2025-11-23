-- Adicionar campo de verificação de WhatsApp
ALTER TABLE public.leads 
ADD COLUMN whatsapp_verified boolean DEFAULT false;

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_leads_whatsapp_verified ON public.leads(whatsapp_verified) WHERE whatsapp_verified = true;

-- Comentário explicativo
COMMENT ON COLUMN public.leads.whatsapp_verified IS 'Indica se o número de WhatsApp foi verificado como válido';