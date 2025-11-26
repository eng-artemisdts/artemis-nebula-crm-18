-- ============================================
-- Migrations Consolidadas
-- ============================================
-- Este arquivo contém todas as migrations do projeto
-- Aplique este arquivo no SQL Editor do Supabase Dashboard
-- https://app.supabase.com/project/lyqcsclmauwmzipjiazs/sql
-- ============================================
-- IMPORTANTE: Execute este arquivo apenas se o banco estiver vazio
-- ou se você tiver certeza de que as migrations ainda não foram aplicadas
-- ============================================

-- Migration: 20251122182829_b500d5b9-b80a-4b29-8f7a-b5a109bcfc24.sql
-- ============================================
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
-- ============================================

-- Migration: 20251122220501_d3804f62-4971-4329-b599-1b952492fc73.sql
-- ============================================
-- Adicionar coluna para valor individual da proposta
ALTER TABLE leads ADD COLUMN payment_amount numeric;

-- Adicionar coluna para registrar data/hora do pagamento
ALTER TABLE leads ADD COLUMN paid_at timestamp with time zone;

-- Criar índice para melhorar performance em queries financeiras
CREATE INDEX idx_leads_payment_amount ON leads(payment_amount);

-- Adicionar comentários para documentação
COMMENT ON COLUMN leads.payment_amount IS 'Valor da proposta em Reais (ex: 1500.50)';
COMMENT ON COLUMN leads.paid_at IS 'Data e hora em que o pagamento foi confirmado';
-- ============================================

-- Migration: 20251123040540_8fb7d667-29f4-4ef9-a257-8760f140ab98.sql
-- ============================================
-- Create table for AI interaction settings
CREATE TABLE public.ai_interaction_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  conversation_focus TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  rejection_action TEXT NOT NULL DEFAULT 'follow_up',
  tone TEXT NOT NULL DEFAULT 'professional',
  main_objective TEXT NOT NULL,
  additional_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_interaction_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view AI interaction settings" 
ON public.ai_interaction_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert AI interaction settings" 
ON public.ai_interaction_settings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update AI interaction settings" 
ON public.ai_interaction_settings 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete AI interaction settings" 
ON public.ai_interaction_settings 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_ai_interaction_settings_updated_at
BEFORE UPDATE ON public.ai_interaction_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- ============================================

-- Migration: 20251123042846_d225327e-0e90-4780-9d5c-8d3a5d137484.sql
-- ============================================
-- Add closing_instructions field to ai_interaction_settings table
ALTER TABLE public.ai_interaction_settings
ADD COLUMN closing_instructions TEXT;

COMMENT ON COLUMN public.ai_interaction_settings.closing_instructions IS 'Instructions on how to close the conversation when the lead does not convert';
-- ============================================

-- Migration: 20251123070406_22387794-c84e-45b2-b741-65ceb9c73d75.sql
-- ============================================
-- Adicionar campo de verificação de WhatsApp
ALTER TABLE public.leads 
ADD COLUMN whatsapp_verified boolean DEFAULT false;

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_leads_whatsapp_verified ON public.leads(whatsapp_verified) WHERE whatsapp_verified = true;

-- Comentário explicativo
COMMENT ON COLUMN public.leads.whatsapp_verified IS 'Indica se o número de WhatsApp foi verificado como válido';
-- ============================================

-- Migration: 20251124160000_create_organizations_and_profiles.sql
-- ============================================
-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT organizations_plan_check CHECK (plan IN ('free', 'pro'))
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organizations
CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization"
  ON public.organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON public.organizations(plan);
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends_at ON public.organizations(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON public.organizations(stripe_customer_id);

-- Add trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get user's organization ID (used in RLS policies)
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN org_id;
END;
$$;

-- Create trigger function for new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  new_org_id UUID;
  org_name TEXT;
BEGIN
  -- Extract company name from metadata or use email domain
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 1) || '''s Company'
  );
  
  -- Create organization with 7-day trial
  INSERT INTO public.organizations (name, plan, trial_ends_at)
  VALUES (org_name, 'free', now() + interval '7 days')
  RETURNING id INTO new_org_id;
  
  -- Create profile linked to organization
  INSERT INTO public.profiles (id, organization_id, display_name)
  VALUES (
    NEW.id,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================

-- Migration: 20251124160634_b3e23117-8441-41b5-b2f0-20a3808c71a2.sql
-- ============================================
-- Update organizations table to ensure plan structure is correct
-- The table already exists, just making sure we have proper constraints

-- Add check constraint for valid plans (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    ALTER TABLE public.organizations 
    DROP CONSTRAINT IF EXISTS organizations_plan_check;

    ALTER TABLE public.organizations 
    ADD CONSTRAINT organizations_plan_check 
    CHECK (plan IN ('free', 'pro'));
  END IF;
END $$;

-- Create index for faster plan lookups
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON public.organizations(plan);
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends_at ON public.organizations(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON public.organizations(stripe_customer_id);

-- Update the handle_new_user function to ensure 7-day trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  org_name TEXT;
BEGIN
  -- Extract company name from metadata or use email domain
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 1) || '''s Company'
  );
  
  -- Create organization with 7-day trial
  INSERT INTO public.organizations (name, plan, trial_ends_at)
  VALUES (org_name, 'free', now() + interval '7 days')
  RETURNING id INTO new_org_id;
  
  -- Create profile linked to organization
  INSERT INTO public.profiles (id, organization_id, display_name)
  VALUES (
    NEW.id,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  RETURN NEW;
END;
$function$;
-- ============================================

-- Migration: 20251124161447_5ba566f0-0b67-41ff-94e3-cbc04edc10eb.sql
-- ============================================
-- Update handle_new_user function to use selected plan from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  user_plan TEXT;
BEGIN
  -- Extract company name from metadata or use email domain
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 1) || '''s Company'
  );
  
  -- Get selected plan from metadata, default to 'free'
  user_plan := COALESCE(
    NEW.raw_user_meta_data->>'selected_plan',
    'free'
  );
  
  -- Create organization with 7-day trial and selected plan
  INSERT INTO public.organizations (name, plan, trial_ends_at)
  VALUES (org_name, user_plan, now() + interval '7 days')
  RETURNING id INTO new_org_id;
  
  -- Create profile linked to organization
  INSERT INTO public.profiles (id, organization_id, display_name)
  VALUES (
    NEW.id,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  RETURN NEW;
END;
$function$;
-- ============================================

-- Migration: 20251124161711_381470bc-ae02-4d03-b8a6-532a998720d8.sql
-- ============================================
-- Create whatsapp_instances table
CREATE TABLE public.whatsapp_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL UNIQUE,
  instance_id TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  qr_code TEXT,
  api_key TEXT,
  webhook_url TEXT,
  phone_number TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view instances in their organization" 
ON public.whatsapp_instances 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert instances in their organization" 
ON public.whatsapp_instances 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update instances in their organization" 
ON public.whatsapp_instances 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete instances in their organization" 
ON public.whatsapp_instances 
FOR DELETE 
USING (organization_id = get_user_organization_id());

-- Add trigger for updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at
BEFORE UPDATE ON public.whatsapp_instances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for organization lookups
CREATE INDEX idx_whatsapp_instances_organization_id ON public.whatsapp_instances(organization_id);
CREATE INDEX idx_whatsapp_instances_status ON public.whatsapp_instances(status);
-- ============================================

-- Migration: 20251124163458_1872a158-29a4-4a6a-8cec-fa9599bba048.sql
-- ============================================
-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-logos', 'organization-logos', true);

-- Create RLS policies for organization logos
CREATE POLICY "Anyone can view organization logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-logos');

CREATE POLICY "Users can upload their organization logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'organization-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their organization logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'organization-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their organization logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'organization-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add company information fields to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

-- Update existing organizations to use name as company_name
UPDATE public.organizations
SET company_name = name
WHERE company_name IS NULL;
-- ============================================

-- Migration: 20251124163538_9407b814-7e59-4cfb-b3e8-a830a28105c9.sql
-- ============================================
-- Update handle_new_user function to save company information
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  user_plan TEXT;
  user_company_name TEXT;
  user_cnpj TEXT;
  user_phone TEXT;
  user_logo_url TEXT;
BEGIN
  -- Extract company information from metadata
  user_company_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 1) || '''s Company'
  );
  
  user_cnpj := NEW.raw_user_meta_data->>'cnpj';
  user_phone := NEW.raw_user_meta_data->>'phone';
  user_logo_url := NEW.raw_user_meta_data->>'logo_url';
  
  -- Get selected plan from metadata, default to 'free'
  user_plan := COALESCE(
    NEW.raw_user_meta_data->>'selected_plan',
    'free'
  );
  
  -- Create organization with all information
  INSERT INTO public.organizations (
    name, 
    company_name,
    cnpj,
    phone,
    logo_url,
    plan, 
    trial_ends_at
  )
  VALUES (
    user_company_name,
    user_company_name,
    user_cnpj,
    user_phone,
    user_logo_url,
    user_plan, 
    now() + interval '7 days'
  )
  RETURNING id INTO new_org_id;
  
  -- Create profile linked to organization
  INSERT INTO public.profiles (id, organization_id, display_name)
  VALUES (
    NEW.id,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  RETURN NEW;
END;
$function$;
-- ============================================

-- Migration: 20251124172238_404c9f09-cf38-4d8d-8a3f-252e0472fe14.sql
-- ============================================
-- Update handle_new_user trigger to not use logo_url from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  user_plan TEXT;
  user_company_name TEXT;
  user_phone TEXT;
BEGIN
  -- Extract company information from metadata
  user_company_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 1) || '''s Company'
  );
  
  user_phone := NEW.raw_user_meta_data->>'phone';
  
  -- Get selected plan from metadata, default to 'free'
  user_plan := COALESCE(
    NEW.raw_user_meta_data->>'selected_plan',
    'free'
  );
  
  -- Create organization without logo (will be updated later if provided)
  INSERT INTO public.organizations (
    name, 
    company_name,
    phone,
    plan, 
    trial_ends_at
  )
  VALUES (
    user_company_name,
    user_company_name,
    user_phone,
    user_plan, 
    now() + interval '7 days'
  )
  RETURNING id INTO new_org_id;
  
  -- Create profile linked to organization
  INSERT INTO public.profiles (id, organization_id, display_name)
  VALUES (
    NEW.id,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  RETURN NEW;
END;
$function$;
-- ============================================

-- Migration: 20251124175303_05561275-7962-43fd-b726-e9e9942e504b.sql
-- ============================================
-- Adicionar campo para armazenar a configuração de IA padrão
ALTER TABLE public.settings 
ADD COLUMN default_ai_interaction_id UUID REFERENCES public.ai_interaction_settings(id) ON DELETE SET NULL;

-- Adicionar campo para armazenar a configuração de IA específica de cada lead
ALTER TABLE public.leads 
ADD COLUMN ai_interaction_id UUID REFERENCES public.ai_interaction_settings(id) ON DELETE SET NULL;
-- ============================================

-- Migration: 20251124180000_add_organization_id_to_settings.sql
-- ============================================
-- Add organization_id column to settings table
-- This makes settings per-organization instead of global

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_organization_id ON public.settings(organization_id);

-- Update existing settings to be linked to organizations (if any exist)
-- This is a safety measure - in practice, settings should be created per organization
DO $$
DECLARE
  org_id UUID;
BEGIN
  -- If there are settings without organization_id, try to link them to the first organization
  -- This is a migration helper - in production, each organization should have its own settings
  SELECT id INTO org_id FROM public.organizations LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    UPDATE public.settings
    SET organization_id = org_id
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- Drop old public policies that don't use organization_id
DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;
DROP POLICY IF EXISTS "Anyone can update settings" ON public.settings;

-- Create new RLS policies that use organization_id
CREATE POLICY "Users can view settings in their organization"
  ON public.settings
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update settings in their organization"
  ON public.settings
  FOR UPDATE
  USING (organization_id = get_user_organization_id());


-- ============================================

-- Migration: 20251124181741_77c66a41-c977-4d86-813e-229dc92947e3.sql
-- ============================================
-- Add INSERT policy for settings table
CREATE POLICY "Users can insert settings in their organization"
ON public.settings
FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());
-- ============================================

-- Migration: 20251124184735_0e62deb9-9d2c-47d6-8f0c-b077459d9c79.sql
-- ============================================
-- Add remote_jid column to leads table for internal tracking
ALTER TABLE public.leads 
ADD COLUMN remote_jid text;
-- ============================================

-- Migration: 20251124190000_add_organization_id_to_ai_interaction_settings.sql
-- ============================================
-- Add organization_id column to ai_interaction_settings table
-- This makes AI interaction settings per-organization instead of global

ALTER TABLE public.ai_interaction_settings
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_interaction_settings_organization_id 
ON public.ai_interaction_settings(organization_id);

-- Update existing AI interaction settings to be linked to organizations (if any exist)
DO $$
DECLARE
  org_id UUID;
BEGIN
  -- If there are AI settings without organization_id, try to link them to the first organization
  -- This is a migration helper - in production, each organization should have its own settings
  SELECT id INTO org_id FROM public.organizations LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    UPDATE public.ai_interaction_settings
    SET organization_id = org_id
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- Drop old public policies that don't use organization_id
DROP POLICY IF EXISTS "Anyone can view AI interaction settings" ON public.ai_interaction_settings;
DROP POLICY IF EXISTS "Anyone can insert AI interaction settings" ON public.ai_interaction_settings;
DROP POLICY IF EXISTS "Anyone can update AI interaction settings" ON public.ai_interaction_settings;
DROP POLICY IF EXISTS "Anyone can delete AI interaction settings" ON public.ai_interaction_settings;

-- Create new RLS policies that use organization_id
CREATE POLICY "Users can view AI interaction settings in their organization"
  ON public.ai_interaction_settings
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert AI interaction settings in their organization"
  ON public.ai_interaction_settings
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update AI interaction settings in their organization"
  ON public.ai_interaction_settings
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete AI interaction settings in their organization"
  ON public.ai_interaction_settings
  FOR DELETE
  USING (organization_id = get_user_organization_id());



-- ============================================

-- Migration: 20251124190500_add_organization_id_to_lead_categories.sql
-- ============================================
-- Add organization_id column to lead_categories table
-- This makes lead categories per-organization instead of global

ALTER TABLE public.lead_categories
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lead_categories_organization_id 
ON public.lead_categories(organization_id);

-- Update existing lead categories to be linked to organizations (if any exist)
DO $$
DECLARE
  org_id UUID;
BEGIN
  -- If there are categories without organization_id, try to link them to the first organization
  -- This is a migration helper - in production, each organization should have its own categories
  SELECT id INTO org_id FROM public.organizations LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    UPDATE public.lead_categories
    SET organization_id = org_id
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- Drop old public policies that don't use organization_id
DROP POLICY IF EXISTS "Anyone can view lead categories" ON public.lead_categories;
DROP POLICY IF EXISTS "Anyone can insert lead categories" ON public.lead_categories;
DROP POLICY IF EXISTS "Anyone can update lead categories" ON public.lead_categories;
DROP POLICY IF EXISTS "Anyone can delete lead categories" ON public.lead_categories;

-- Create new RLS policies that use organization_id
CREATE POLICY "Users can view lead categories in their organization"
  ON public.lead_categories
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert lead categories in their organization"
  ON public.lead_categories
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update lead categories in their organization"
  ON public.lead_categories
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete lead categories in their organization"
  ON public.lead_categories
  FOR DELETE
  USING (organization_id = get_user_organization_id());


-- ============================================

-- Migration: 20251124191026_49a3ebcd-258b-43aa-aa78-f5686f87d014.sql
-- ============================================
-- Create table for storing company documents
CREATE TABLE public.company_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  google_drive_file_id TEXT NOT NULL,
  google_drive_folder_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT company_documents_organization_id_fkey 
    FOREIGN KEY (organization_id) 
    REFERENCES public.organizations(id) 
    ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view documents in their organization" 
  ON public.company_documents 
  FOR SELECT 
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert documents in their organization" 
  ON public.company_documents 
  FOR INSERT 
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update documents in their organization" 
  ON public.company_documents 
  FOR UPDATE 
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete documents in their organization" 
  ON public.company_documents 
  FOR DELETE 
  USING (organization_id = get_user_organization_id());

-- Create trigger for updated_at
CREATE TRIGGER update_company_documents_updated_at
  BEFORE UPDATE ON public.company_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- ============================================

-- Migration: 20251125032411_8be049a5-5bd1-426d-becd-5311599fe9fd.sql
-- ============================================
-- Add default message and image configuration to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS default_message TEXT,
ADD COLUMN IF NOT EXISTS default_image_url TEXT;

-- Set default message for existing settings
UPDATE public.settings 
SET default_message = '👋 Oi! Tudo bem?
Aqui é a equipe da Artemis Digital Solutions e temos uma oferta especial de Black Friday para impulsionar suas vendas e organizar seu atendimento nesse período de alta demanda.

🤖 O que é um chatbot?

É um assistente virtual que responde automaticamente seus clientes 24h por dia, mesmo quando você está ocupado, offline ou atendendo outras pessoas.
Ele responde dúvidas, coleta informações, organiza pedidos e direciona atendimentos — tudo sem você precisar tocar no celular.

🚀 Vantagens para o seu negócio

✔ Atendimento 24h
Nunca mais perca vendas por falta de resposta.

✔ Respostas instantâneas ⚡
Informações rápidas sobre preços, horários, serviços, catálogo, agenda e muito mais.

✔ Adeus acúmulo de mensagens 📥
O chatbot filtra, organiza e prioriza atendimentos.

✔ Mais profissionalismo 💼
Seu negócio transmite agilidade, organização e confiança.

✔ Perfeito para a Black Friday 🖤
Ele absorve o alto volume de mensagens e evita gargalos no atendimento.

✔ Captura e organiza leads 🔥
Coleta nome, WhatsApp, interesse e entrega tudo prontinho para você.

Se quiser saber mais, é só acessar:
🌐 www.artemisdigital.tech',
default_image_url = '/images/black-friday.png'
WHERE default_message IS NULL;
-- ============================================

-- Migration: 20251125040040_062b7ba0-6492-4c1f-98b6-0b3a4594b2ab.sql
-- ============================================
-- Cria bucket para imagens de mensagens promocionais
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true);

-- Políticas RLS para o bucket message-images
CREATE POLICY "Usuários autenticados podem fazer upload de imagens"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-images');

CREATE POLICY "Imagens são publicamente acessíveis"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message-images');

CREATE POLICY "Usuários autenticados podem atualizar suas imagens"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'message-images');

CREATE POLICY "Usuários autenticados podem deletar suas imagens"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-images');
-- ============================================

