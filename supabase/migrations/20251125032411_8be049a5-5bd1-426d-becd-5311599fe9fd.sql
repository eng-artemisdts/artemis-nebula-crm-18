-- Add default message and image configuration to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS default_message TEXT,
ADD COLUMN IF NOT EXISTS default_image_url TEXT;

-- Set default message for existing settings
UPDATE public.settings 
SET default_message = '👋 Oi! Tudo bem?
Aqui é a equipe da Artemis Digital Solutions e temos uma oferta especial de Black Friday para impulsionar suas vendas e organizar seu atendimento nesse período de alta demanda.

🤖 O que é um chatbot?

É um assistente virtual que responde automaticamente seus clientes 24h por dia, mesmo quando você está ocupado, offline ou atendendo outras pessoas.
Ele responde dúvidas, coleta informações, organiza pedidos e direciona atendimentos — tudo sem você precisar tocar no celular.

🚀 Vantagens para o seu negócio

✔ Atendimento 24h
Nunca mais perca vendas por falta de resposta.

✔ Respostas instantâneas ⚡
Informações rápidas sobre preços, horários, serviços, catálogo, agenda e muito mais.

✔ Adeus acúmulo de mensagens 📥
O chatbot filtra, organiza e prioriza atendimentos.

✔ Mais profissionalismo 💼
Seu negócio transmite agilidade, organização e confiança.

✔ Perfeito para a Black Friday 🖤
Ele absorve o alto volume de mensagens e evita gargalos no atendimento.

✔ Captura e organiza leads 🔥
Coleta nome, WhatsApp, interesse e entrega tudo prontinho para você.

Se quiser saber mais, é só acessar:
🌐 www.artemisdigital.tech',
default_image_url = '/images/black-friday.png'
WHERE default_message IS NULL;