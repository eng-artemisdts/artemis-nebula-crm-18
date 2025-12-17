-- Migration: Add BANT Analysis component
-- BANT stands for Budget, Authority, Need, Timeline - a lead qualification framework

INSERT INTO public.components (name, description, identifier) VALUES
  ('Análise BANT', 'Permite ao agente realizar análise BANT (Budget, Authority, Need, Timeline) para qualificação de leads', 'bant_analysis')
ON CONFLICT (identifier) DO NOTHING;

