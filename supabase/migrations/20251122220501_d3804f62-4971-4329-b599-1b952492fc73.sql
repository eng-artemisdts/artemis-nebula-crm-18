-- Adicionar coluna para valor individual da proposta
ALTER TABLE leads ADD COLUMN payment_amount numeric;

-- Adicionar coluna para registrar data/hora do pagamento
ALTER TABLE leads ADD COLUMN paid_at timestamp with time zone;

-- Criar índice para melhorar performance em queries financeiras
CREATE INDEX idx_leads_payment_amount ON leads(payment_amount);

-- Adicionar comentários para documentação
COMMENT ON COLUMN leads.payment_amount IS 'Valor da proposta em Reais (ex: 1500.50)';
COMMENT ON COLUMN leads.paid_at IS 'Data e hora em que o pagamento foi confirmado';