-- Script para aplicar apenas a migração do nickname
-- Execute este script no SQL Editor do Supabase

-- Add nickname column to ai_interaction_settings table
-- This field allows agents to have a friendly nickname for display purposes

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_interaction_settings' 
    AND column_name = 'nickname'
  ) THEN
    ALTER TABLE public.ai_interaction_settings
    ADD COLUMN nickname TEXT;

    COMMENT ON COLUMN public.ai_interaction_settings.nickname IS 'Friendly nickname for the AI agent, used for display purposes';
    
    RAISE NOTICE 'Coluna nickname adicionada com sucesso!';
  ELSE
    RAISE NOTICE 'Coluna nickname já existe, pulando...';
  END IF;
END $$;

