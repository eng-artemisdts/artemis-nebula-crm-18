// Este nó deve ser colocado APÓS o Merge
// Ele combina os dados do GET_ORG_TOKEN (item 0) com os dados do MAP_DATA (item 1)

const items = $input.all();

// Encontrar o item com access_token (resultado do GET_ORG_TOKEN)
const tokenItem = items.find(item => item.json.access_token || item.json.success);

// Encontrar o item com processed (resultado do MAP_DATA)
const dataItem = items.find(item => item.json.processed || item.json.ai_config);

if (!dataItem) {
  throw new Error('Item com dados processados não encontrado após o Merge');
}

// Combinar os dados: usar o dataItem como base e adicionar o access_token
const combinedData = {
  ...dataItem.json,
};

// Se encontrou o token, adicionar ao combinedData
if (tokenItem && tokenItem.json.access_token) {
  combinedData.access_token = tokenItem.json.access_token;
  combinedData.token_type = tokenItem.json.token_type || 'bearer';
  combinedData.organization_id = tokenItem.json.organization_id || combinedData.organization?.id;
}

// Garantir que processed existe
if (!combinedData.processed) {
  combinedData.processed = {
    personality_traits_text: 'Nenhum traço específico configurado.',
    introduction_text: 'Siga as instruções padrão de apresentação.',
    user_prompt_header: 'Você recebeu uma nova mensagem do lead.',
    user_prompt_attention: '**Mensagem recebida:**\nNenhuma mensagem disponível.',
    user_prompt_context: '- Enviada por: Lead',
    user_prompt_task: 'Analise a mensagem recebida e gere uma resposta apropriada que:',
  };
}

return {
  json: combinedData
};

