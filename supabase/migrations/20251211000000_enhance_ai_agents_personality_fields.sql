-- Migration: Enhance AI Agents with better personality fields
-- This migration adds new fields to better define agent personality and behavior

ALTER TABLE public.ai_interaction_settings
ADD COLUMN IF NOT EXISTS personality_traits TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS communication_style TEXT DEFAULT 'balanced',
ADD COLUMN IF NOT EXISTS expertise_level TEXT DEFAULT 'intermediate',
ADD COLUMN IF NOT EXISTS response_length TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS empathy_level TEXT DEFAULT 'moderate',
ADD COLUMN IF NOT EXISTS formality_level TEXT DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS humor_level TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS proactivity_level TEXT DEFAULT 'moderate',
ADD COLUMN IF NOT EXISTS agent_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS agent_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS agent_description TEXT;

COMMENT ON COLUMN public.ai_interaction_settings.personality_traits IS 'Array of personality traits (e.g., friendly, analytical, creative, empathetic)';
COMMENT ON COLUMN public.ai_interaction_settings.communication_style IS 'Communication style: direct, consultative, supportive, or balanced';
COMMENT ON COLUMN public.ai_interaction_settings.expertise_level IS 'Expertise level: beginner, intermediate, advanced, or expert';
COMMENT ON COLUMN public.ai_interaction_settings.response_length IS 'Response length preference: short, medium, or long';
COMMENT ON COLUMN public.ai_interaction_settings.empathy_level IS 'Empathy level: low, moderate, or high';
COMMENT ON COLUMN public.ai_interaction_settings.formality_level IS 'Formality level: casual, professional, or formal';
COMMENT ON COLUMN public.ai_interaction_settings.humor_level IS 'Humor level: none, subtle, moderate, or high';
COMMENT ON COLUMN public.ai_interaction_settings.proactivity_level IS 'Proactivity level: passive, moderate, or high';
COMMENT ON COLUMN public.ai_interaction_settings.agent_avatar_url IS 'URL for agent avatar image';
COMMENT ON COLUMN public.ai_interaction_settings.agent_color IS 'Primary color for agent branding';
COMMENT ON COLUMN public.ai_interaction_settings.agent_description IS 'Brief description of the agent';







