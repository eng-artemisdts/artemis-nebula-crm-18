-- Migration: Update existing agent with new script configurations
-- This migration updates the "Gestor De Relacionamento" agent with the new routing fields
-- Based on the exported agent JSON example

UPDATE public.ai_interaction_settings
SET 
  scenario_detection_enabled = true,
  proactive_opening_message = 'Oi, tudo bem? Tenho algumas dúvidas e queria esclarecer com vocês.',
  proactive_hook_message = 'É que eu estava olhando o perfil de vocês e vi que a empresa já está bem posicionada. Minha dúvida é pontual: Hoje a equipe de campo de vocês já roda 100% digitalizada ou vocês ainda acabam dependendo de papel e prancheta pra fazer os relatórios?',
  proactive_development_paper = 'A maioria fala que o pior é o tempo perdido passando pro computador depois, né? 😅 Por isso entrei em contato. Nossa solução elimina essa digitação. Quantos técnicos vocês têm na rua hoje?',
  proactive_development_system = 'Ótimo! Que tal eu te mostrar um vídeo rápido de como nossa solução pode complementar o que vocês já têm?',
  receptive_welcome_template = 'Olá! Claro, posso te explicar como funciona a Smart-Insp. Mas pra eu te passar a informação certa pro seu caso: hoje a sua operação é focada em qual área?',
  receptive_qualification_question = 'Entendi, para (nicho do cliente) temos um módulo específico. E hoje, como seus colaboradores fazem o checklist? É no papelzinho, WhatsApp ou já usam algum app?',
  receptive_deepening_question = NULL,
  receptive_value_proposition = 'Saquei. Muita gente nos procura justamente pra sair desse controle manual do WhatsApp. Com a Smart-Insp, você vai ter as fotos e a localização em tempo real. Pelo tamanho da sua frota, acho que vale a pena você ver funcionando. Posso agendar uma demonstração rápida com um especialista?',
  company_clients = ARRAY['Grupo Taua', 'VLI', 'Multitex', 'Volvo', 'Tora'],
  total_clients = 'Mais de 50 clientes ativos'
WHERE name = 'Gestor De Relacionamento';

-- Alternative: Update by ID if you know the agent ID
-- Uncomment and replace the UUID with the actual agent ID:
-- UPDATE public.ai_interaction_settings
-- SET 
--   scenario_detection_enabled = true,
--   proactive_opening_message = 'Oi, tudo bem? Tenho algumas dúvidas e queria esclarecer com vocês.',
--   proactive_hook_message = 'É que eu estava olhando o perfil de vocês e vi que a empresa já está bem posicionada. Minha dúvida é pontual: Hoje a equipe de campo de vocês já roda 100% digitalizada ou vocês ainda acabam dependendo de papel e prancheta pra fazer os relatórios?',
--   proactive_development_paper = 'A maioria fala que o pior é o tempo perdido passando pro computador depois, né? 😅 Por isso entrei em contato. Nossa solução elimina essa digitação. Quantos técnicos vocês têm na rua hoje?',
--   proactive_development_system = 'Ótimo! Que tal eu te mostrar um vídeo rápido de como nossa solução pode complementar o que vocês já têm?',
--   receptive_welcome_template = 'Olá! Claro, posso te explicar como funciona a Smart-Insp. Mas pra eu te passar a informação certa pro seu caso: hoje a sua operação é focada em qual área?',
--   receptive_qualification_question = 'Entendi, para (nicho do cliente) temos um módulo específico. E hoje, como seus colaboradores fazem o checklist? É no papelzinho, WhatsApp ou já usam algum app?',
--   receptive_deepening_question = NULL,
--   receptive_value_proposition = 'Saquei. Muita gente nos procura justamente pra sair desse controle manual do WhatsApp. Com a Smart-Insp, você vai ter as fotos e a localização em tempo real. Pelo tamanho da sua frota, acho que vale a pena você ver funcionando. Posso agendar uma demonstração rápida com um especialista?',
--   company_clients = ARRAY['Grupo Taua', 'VLI', 'Multitex', 'Volvo', 'Tora'],
--   total_clients = 'Mais de 50 clientes ativos'
-- WHERE id = 'SEU-UUID-AQUI';
