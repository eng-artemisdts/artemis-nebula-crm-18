-- Migration: Fix component_configurations RLS policies
-- This migration adjusts RLS policies to allow authenticated users to configure
-- components that exist, without requiring the component to be in organization_components

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view component configurations for their organization components" ON public.component_configurations;
DROP POLICY IF EXISTS "Users can insert component configurations for their organization components" ON public.component_configurations;
DROP POLICY IF EXISTS "Users can update component configurations for their organization components" ON public.component_configurations;
DROP POLICY IF EXISTS "Users can delete component configurations for their organization components" ON public.component_configurations;

-- Create new, more permissive policies
-- Users can view component configurations if:
-- 1. The component exists
-- 2. The user is authenticated and belongs to an organization
CREATE POLICY "Authenticated users can view component configurations"
  ON public.component_configurations
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.components
      WHERE components.id = component_configurations.component_id
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND organization_id IS NOT NULL
    )
  );

-- Users can insert component configurations if:
-- 1. The component exists
-- 2. The user is authenticated and belongs to an organization
CREATE POLICY "Authenticated users can insert component configurations"
  ON public.component_configurations
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.components
      WHERE components.id = component_configurations.component_id
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND organization_id IS NOT NULL
    )
  );

-- Users can update component configurations if:
-- 1. The component exists
-- 2. The user is authenticated and belongs to an organization
CREATE POLICY "Authenticated users can update component configurations"
  ON public.component_configurations
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.components
      WHERE components.id = component_configurations.component_id
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND organization_id IS NOT NULL
    )
  );

-- Users can delete component configurations if:
-- 1. The component exists
-- 2. The user is authenticated and belongs to an organization
CREATE POLICY "Authenticated users can delete component configurations"
  ON public.component_configurations
  FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.components
      WHERE components.id = component_configurations.component_id
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND organization_id IS NOT NULL
    )
  );

