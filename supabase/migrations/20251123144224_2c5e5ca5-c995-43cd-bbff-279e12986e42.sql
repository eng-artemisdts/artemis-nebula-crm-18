-- Adiciona campo para identificar leads de teste
ALTER TABLE public.leads
ADD COLUMN is_test BOOLEAN DEFAULT false;

-- Cria índice para melhor performance nas queries
CREATE INDEX idx_leads_is_test ON public.leads(is_test);