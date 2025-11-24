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