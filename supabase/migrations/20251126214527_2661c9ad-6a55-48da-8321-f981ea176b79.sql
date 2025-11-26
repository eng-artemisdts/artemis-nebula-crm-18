-- Políticas RLS para o bucket organization-logos (criar apenas as que faltam)

-- Permitir que usuários façam upload de logos de suas organizações
CREATE POLICY "Users can upload organization logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Permitir que usuários atualizem logos de suas organizações
CREATE POLICY "Users can update organization logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Permitir que usuários deletem logos de suas organizações
CREATE POLICY "Users can delete organization logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);