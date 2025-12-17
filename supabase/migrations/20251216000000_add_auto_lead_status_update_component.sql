-- Migration: Add Auto Lead Status Update component
-- This component allows agents to automatically update lead status based on conversation context

INSERT INTO public.components (name, description, identifier) VALUES
  ('Atualização Automática de Status', 'Permite ao agente atualizar automaticamente o status do lead conforme o contexto da conversa e os status definidos no painel', 'auto_lead_status_update')
ON CONFLICT (identifier) DO NOTHING;

