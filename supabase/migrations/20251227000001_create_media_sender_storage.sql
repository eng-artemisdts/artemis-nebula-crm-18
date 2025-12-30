-- Migration: Create storage bucket for media sender component
-- This migration creates a bucket for storing images and videos used by the media_sender component

-- Create bucket for media sender
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-sender', 'media-sender', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for media-sender bucket
-- Allow authenticated users to upload media for their organization
CREATE POLICY "Users can upload media for their organization"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-sender'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Allow public access to media (for WhatsApp and other integrations)
CREATE POLICY "Media is publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media-sender');

-- Allow authenticated users to view media from their organization
CREATE POLICY "Users can view media from their organization"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'media-sender'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Allow authenticated users to update media for their organization
CREATE POLICY "Users can update media for their organization"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media-sender'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Allow authenticated users to delete media for their organization
CREATE POLICY "Users can delete media for their organization"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media-sender'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

