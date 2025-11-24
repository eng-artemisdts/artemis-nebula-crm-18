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