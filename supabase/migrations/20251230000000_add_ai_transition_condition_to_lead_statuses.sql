-- Add ai_transition_condition column to lead_statuses table
-- This field allows users to specify when the AI should transition a lead to this status

ALTER TABLE public.lead_statuses
ADD COLUMN IF NOT EXISTS ai_transition_condition TEXT;

COMMENT ON COLUMN public.lead_statuses.ai_transition_condition IS 'Texto livre que descreve quando a IA deve mudar o lead para esta etapa do funil';

-- Add default descriptions for required statuses
UPDATE public.lead_statuses
SET ai_transition_condition = 'Esta é a etapa inicial do funil. Todos os novos leads começam nesta etapa automaticamente.'
WHERE status_key = 'new' 
  AND is_required = true 
  AND (ai_transition_condition IS NULL OR ai_transition_condition = '');

UPDATE public.lead_statuses
SET ai_transition_condition = 'Quando a primeira mensagem é enviada ou recebida do lead, iniciando a conversa. Quando o lead responde pela primeira vez ou quando enviamos a primeira mensagem para ele.'
WHERE status_key = 'conversation_started' 
  AND is_required = true 
  AND (ai_transition_condition IS NULL OR ai_transition_condition = '');

UPDATE public.lead_statuses
SET ai_transition_condition = 'Quando uma proposta comercial, orçamento ou cotação é enviada ao lead. Quando o lead demonstra interesse em receber uma proposta, quando pergunta sobre preços, ou quando menciona que precisa de um orçamento.'
WHERE status_key = 'proposal_sent' 
  AND is_required = true 
  AND (ai_transition_condition IS NULL OR ai_transition_condition = '');

UPDATE public.lead_statuses
SET ai_transition_condition = 'Quando uma reunião, call ou encontro é agendado com o lead. Quando o lead aceita agendar uma reunião, quando confirma uma data e horário, ou quando demonstra interesse em uma apresentação ou demonstração.'
WHERE status_key = 'meeting_scheduled' 
  AND is_required = true 
  AND (ai_transition_condition IS NULL OR ai_transition_condition = '');

UPDATE public.lead_statuses
SET ai_transition_condition = 'Quando o lead é finalizado, seja por venda concluída, negócio fechado, ou quando o lead é marcado como perdido/descartado. Quando o lead confirma a compra, quando o pagamento é confirmado, ou quando fica claro que não há mais interesse.'
WHERE status_key = 'finished' 
  AND is_required = true 
  AND (ai_transition_condition IS NULL OR ai_transition_condition = '');

-- Update the initialize_organization_statuses function to include ai_transition_condition
CREATE OR REPLACE FUNCTION public.initialize_organization_statuses(org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_order INTEGER;
BEGIN
  -- Get the maximum display_order for custom statuses (excluding finished)
  SELECT COALESCE(MAX(display_order), 0) INTO max_order
  FROM public.lead_statuses
  WHERE organization_id = org_id 
    AND is_required = false 
    AND status_key != 'finished';
  
  -- Insert required statuses if they don't exist (using English keys, Portuguese labels)
  INSERT INTO public.lead_statuses (organization_id, status_key, label, is_required, display_order, ai_transition_condition)
  VALUES 
    (org_id, 'new', 'Novo', true, 1, 'Esta é a etapa inicial do funil. Todos os novos leads começam nesta etapa automaticamente.'),
    (org_id, 'conversation_started', 'Conversa Iniciada', true, 2, 'Quando a primeira mensagem é enviada ou recebida do lead, iniciando a conversa. Quando o lead responde pela primeira vez ou quando enviamos a primeira mensagem para ele.'),
    (org_id, 'proposal_sent', 'Proposta Enviada', true, 3, 'Quando uma proposta comercial, orçamento ou cotação é enviada ao lead. Quando o lead demonstra interesse em receber uma proposta, quando pergunta sobre preços, ou quando menciona que precisa de um orçamento.'),
    (org_id, 'meeting_scheduled', 'Reunião Agendada', true, 4, 'Quando uma reunião, call ou encontro é agendado com o lead. Quando o lead aceita agendar uma reunião, quando confirma uma data e horário, ou quando demonstra interesse em uma apresentação ou demonstração.'),
    (org_id, 'finished', 'Finalizado', true, max_order + 1000, 'Quando o lead é finalizado, seja por venda concluída, negócio fechado, ou quando o lead é marcado como perdido/descartado. Quando o lead confirma a compra, quando o pagamento é confirmado, ou quando fica claro que não há mais interesse.')
  ON CONFLICT (organization_id, status_key) DO NOTHING;
  
  -- Always ensure finished is the last status
  UPDATE public.lead_statuses
  SET display_order = (
    SELECT COALESCE(MAX(display_order), 0) + 1
    FROM public.lead_statuses
    WHERE organization_id = org_id 
      AND status_key != 'finished'
  )
  WHERE organization_id = org_id 
    AND status_key = 'finished';
END;
$$;

