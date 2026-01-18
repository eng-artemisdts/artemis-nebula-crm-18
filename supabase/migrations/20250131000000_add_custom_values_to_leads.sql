-- Adicionar campo custom_values para armazenar valores personalizados com descrições
-- Estrutura: JSONB array de objetos { "value": "1000.00", "description": "Descrição personalizada" }

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS custom_values JSONB DEFAULT '[]'::jsonb;

-- Criar índice GIN para buscas eficientes em JSONB
CREATE INDEX IF NOT EXISTS idx_leads_custom_values ON public.leads USING GIN (custom_values);

-- Comentário para documentação
COMMENT ON COLUMN public.leads.custom_values IS 'Array JSONB de valores personalizados com descrições. Formato: [{"value": "1000.00", "description": "Descrição"}]';
