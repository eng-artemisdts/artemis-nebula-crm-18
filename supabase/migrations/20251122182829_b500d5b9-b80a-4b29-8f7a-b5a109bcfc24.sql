-- Create lead_categories table
CREATE TABLE IF NOT EXISTS public.lead_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leads table with all required fields
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  contact_email TEXT,
  contact_whatsapp TEXT,
  source TEXT,
  integration_start_time TIME WITH TIME ZONE,
  payment_link_url TEXT,
  payment_stripe_id TEXT,
  payment_status TEXT DEFAULT 'nao_criado',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('novo', 'conversa_iniciada', 'proposta_enviada', 'link_pagamento_enviado', 'pago', 'perdido')),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('nao_criado', 'link_gerado', 'pago', 'expirado'))
);

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_integration_start_time TIME WITH TIME ZONE,
  n8n_webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO public.settings (default_integration_start_time, n8n_webhook_url)
VALUES ('09:00:00+00', '')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.lead_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lead_categories (public read, no auth required for now)
CREATE POLICY "Anyone can view lead categories"
  ON public.lead_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert lead categories"
  ON public.lead_categories
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update lead categories"
  ON public.lead_categories
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete lead categories"
  ON public.lead_categories
  FOR DELETE
  USING (true);

-- Create RLS policies for leads (public access for now)
CREATE POLICY "Anyone can view leads"
  ON public.leads
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert leads"
  ON public.leads
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update leads"
  ON public.leads
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete leads"
  ON public.leads
  FOR DELETE
  USING (true);

-- Create RLS policies for settings (public access for now)
CREATE POLICY "Anyone can view settings"
  ON public.settings
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update settings"
  ON public.settings
  FOR UPDATE
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_lead_categories_updated_at
  BEFORE UPDATE ON public.lead_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default categories
INSERT INTO public.lead_categories (name, description) VALUES
  ('Desenvolvimento Web', 'Projetos de sites e aplicações web'),
  ('E-commerce', 'Lojas virtuais e marketplaces'),
  ('Consultoria', 'Consultoria em tecnologia e digital'),
  ('Marketing Digital', 'Campanhas e estratégias de marketing')
ON CONFLICT DO NOTHING;