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