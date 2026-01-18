const payload = $('Payload').item.json.payload;

// Processar personality traits
const personalityTraits = Array.isArray(payload.ai_config?.personality_traits) 
  ? payload.ai_config.personality_traits 
  : [];
const personalityTraitsText = personalityTraits.length > 0
  ? personalityTraits.map(t => `- ${t}`).join('\n')
  : 'Nenhum traço específico configurado.';

// Verificar se isScheduledInteraction existe e é true (usando optional chaining)
const isScheduledInteraction = payload.isScheduledInteraction === true;

// Determinar texto de introdução baseado no tipo de interação
let introductionText = '';

if (isScheduledInteraction) {
  // Interação agendada - agente DEVE iniciar a conversa proativamente
  const nickname = payload.ai_config?.nickname || null;
  const agentName = payload.ai_config?.name || 'Assistente';
  const companyName = payload.organization?.company_name || 'nossa empresa';
  
  if (nickname) {
    introductionText = `Esta é uma INTERAÇÃO AGENDADA. Você DEVE iniciar a conversa proativamente com o lead. Apresente-se como "${nickname}" e explique o motivo do contato baseado no objetivo principal da configuração do agente. Seja natural, amigável e profissional.`;
  } else {
    introductionText = `Esta é uma INTERAÇÃO AGENDADA. Você DEVE iniciar a conversa proativamente com o lead. Apresente-se como o assistente "${agentName}" da ${companyName} e explique o motivo do contato baseado no objetivo principal da configuração do agente. Seja natural, amigável e profissional.`;
  }
} else {
  // Interação normal - seguir lógica padrão de should_introduce_itself
  if (payload.ai_config?.should_introduce_itself) {
    introductionText = `Você DEVE se apresentar no início de cada nova conversa, utilize o campo 'Apelido' (nickname) para saber seu nome, SEMPRE diga seu nome ao se apresentar. Se não houver nickname configurado, use o nome do agente.`;
  } else {
    introductionText = 'Você NÃO deve se apresentar automaticamente. Apenas responda às mensagens do lead de forma natural.';
  }
}

// Processar campos para o user prompt (evitar ternários no template)
const isScheduled = isScheduledInteraction;

// Garantir que sempre temos valores válidos (nunca vazios ou undefined)
let userPromptHeader = '';
let userPromptAttention = '';
let userPromptContext = '';
let userPromptTask = '';

if (isScheduled) {
  // Interação agendada
  userPromptHeader = '## INTERAÇÃO AGENDADA - INÍCIO PROATIVO';
  userPromptAttention = '**ATENÇÃO:** Esta é uma interação agendada. Você DEVE iniciar a conversa proativamente com o lead, não espere uma mensagem dele.';
  userPromptContext = '- **Interação Agendada:** Sim - Você deve iniciar a conversa';
  userPromptTask = '**Para interações agendadas:** Inicie a conversa proativamente com o lead. Apresente-se usando o nickname (se configurado) ou nome do agente, e explique o motivo do contato baseado no objetivo principal da configuração do agente. Seja natural, amigável e profissional, respeitando o tom e estilo configurados.\n\nAnalise todo o contexto fornecido (configurações do agente, histórico da conversa, informações do lead, status atual, componentes disponíveis) e gere uma mensagem inicial apropriada que:';
} else {
  // Interação normal
  const contactName = payload.contactName || 'Lead';
  const phoneNumber = payload.phoneNumber || 'N/A';
  const messageContent = payload.msg_content || payload.conversation || payload.message?.conversation || 'Nenhuma mensagem disponível';
  const sender = payload.fromMe === true ? 'Você' : 'Lead';
  
  userPromptHeader = `Você recebeu uma nova mensagem do lead **${contactName}** (${phoneNumber}):`;
  userPromptAttention = `**Mensagem recebida:**\n${messageContent}`;
  userPromptContext = `- Enviada por: ${sender}`;
  userPromptTask = 'Analise a mensagem recebida, considere todo o contexto fornecido (configurações do agente, histórico da conversa, informações do lead, status atual, componentes disponíveis) e gere uma resposta apropriada que:';
}

// Garantir que todos os campos processados sempre existam e sejam strings válidas
const processed = {
  personality_traits_text: personalityTraitsText || 'Nenhum traço específico configurado.',
  introduction_text: introductionText || 'Siga as instruções padrão de apresentação.',
  user_prompt_header: userPromptHeader || 'Você recebeu uma nova mensagem do lead.',
  user_prompt_attention: userPromptAttention || '**Mensagem recebida:**\nNenhuma mensagem disponível.',
  user_prompt_context: userPromptContext || '- Enviada por: Lead',
  user_prompt_task: userPromptTask || 'Analise a mensagem recebida e gere uma resposta apropriada que:',
};

return {
  json: {
    ...payload,
    processed: processed
  }
};

