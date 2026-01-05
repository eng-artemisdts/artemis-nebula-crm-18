-- Adicionar campos comuns de CRM ao cadastro de leads
-- Estes campos padronizam o cadastro com outros CRMs populares

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil',
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS annual_revenue NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS number_of_employees INTEGER;

-- Criar índices para campos que serão frequentemente usados em buscas
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON public.leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_city ON public.leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_state ON public.leads(state);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON public.leads(industry);

-- Comentários para documentação
COMMENT ON COLUMN public.leads.company_name IS 'Nome da empresa do lead';
COMMENT ON COLUMN public.leads.job_title IS 'Cargo do lead na empresa';
COMMENT ON COLUMN public.leads.phone IS 'Telefone fixo do lead (além do WhatsApp)';
COMMENT ON COLUMN public.leads.address IS 'Endereço completo do lead';
COMMENT ON COLUMN public.leads.city IS 'Cidade do lead';
COMMENT ON COLUMN public.leads.state IS 'Estado do lead';
COMMENT ON COLUMN public.leads.zip_code IS 'CEP do lead';
COMMENT ON COLUMN public.leads.country IS 'País do lead (padrão: Brasil)';
COMMENT ON COLUMN public.leads.website IS 'Website da empresa do lead';
COMMENT ON COLUMN public.leads.linkedin_url IS 'URL do perfil LinkedIn do lead';
COMMENT ON COLUMN public.leads.notes IS 'Notas adicionais sobre o lead';
COMMENT ON COLUMN public.leads.industry IS 'Setor/indústria da empresa do lead';
COMMENT ON COLUMN public.leads.annual_revenue IS 'Receita anual da empresa em R$';
COMMENT ON COLUMN public.leads.number_of_employees IS 'Número de funcionários da empresa';




