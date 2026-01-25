-- Migration: Revert agent scripts and routing fields
-- This migration removes the fields added for proactive and receptive conversation scripts
-- Reverses: 20260124000000_add_agent_scripts_and_routing.sql

ALTER TABLE public.ai_interaction_settings
DROP COLUMN IF EXISTS scenario_detection_enabled,
DROP COLUMN IF EXISTS proactive_opening_message,
DROP COLUMN IF EXISTS proactive_hook_message,
DROP COLUMN IF EXISTS proactive_development_paper,
DROP COLUMN IF EXISTS proactive_development_system,
DROP COLUMN IF EXISTS receptive_welcome_template,
DROP COLUMN IF EXISTS receptive_qualification_question,
DROP COLUMN IF EXISTS receptive_deepening_question,
DROP COLUMN IF EXISTS receptive_value_proposition,
DROP COLUMN IF EXISTS company_clients,
DROP COLUMN IF EXISTS total_clients;
