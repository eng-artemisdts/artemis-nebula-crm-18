-- Migration: Add media_sender component
-- This migration adds a component for sending media (images and videos) with usage instructions

-- Insert media_sender component
INSERT INTO public.components (name, description, identifier) VALUES
  ('Envio de Mídia', 'Permite ao agente enviar imagens e vídeos em ocasiões específicas durante as conversas', 'media_sender')
ON CONFLICT (identifier) DO NOTHING;

COMMENT ON TABLE public.components IS 'Available components/capabilities that agents can use';

