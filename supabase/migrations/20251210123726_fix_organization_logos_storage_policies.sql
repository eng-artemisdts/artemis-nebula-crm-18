-- Remover políticas antigas do storage que esperam auth.uid() como folder
DROP POLICY IF EXISTS "Users can upload their organization logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their organization logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their organization logo" ON storage.objects;

-- Garantir que apenas as políticas corretas (que esperam organization_id) estejam ativas
-- Estas políticas já devem existir da migration 20251126214527, mas vamos garantir que estão corretas

-- Política para INSERT (criar apenas se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload organization logos'
  ) THEN
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
  END IF;
END $$;

-- Política para UPDATE (criar apenas se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update organization logos'
  ) THEN
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
  END IF;
END $$;

-- Política para DELETE (criar apenas se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete organization logos'
  ) THEN
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
  END IF;
END $$;
