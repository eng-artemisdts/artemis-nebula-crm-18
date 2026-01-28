import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const { selectedTraits = [], agentContext } = await req.json();

    if (!Array.isArray(selectedTraits)) {
      return new Response(
        JSON.stringify({ error: 'selectedTraits deve ser um array' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const contextInfo = agentContext ? 
      `Contexto do agente: ${agentContext.name ? `Nome: ${agentContext.name}` : ''}${agentContext.conversation_focus ? `, Foco: ${agentContext.conversation_focus}` : ''}${agentContext.main_objective ? `, Objetivo: ${agentContext.main_objective}` : ''}. ` : 
      '';

    const traitsInfo = selectedTraits.length > 0 
      ? `O usuário já selecionou os seguintes traços: ${selectedTraits.join(', ')}. ` 
      : '';

    const prompt = `${contextInfo}${traitsInfo}Gere de 5 a 8 traços de personalidade relevantes para este agente de IA. 
    Os traços devem ser adjetivos em português, no masculino, e devem ser apropriados para o contexto do agente. 
    ${selectedTraits.length > 0 ? 'Os novos traços devem complementar os já selecionados.' : ''}
    Retorne apenas os traços, um por linha, sem numeração, marcadores ou explicações adicionais.`;

    console.log('Generating traits for:', selectedTraits);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em personalidade e comportamento de agentes de IA. Gere traços de personalidade complementares baseados nos traços fornecidos pelo usuário. Retorne apenas uma lista de traços, um por linha, sem numeração ou marcadores.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);

    const generatedText = data.choices[0].message.content.trim();
    const traits = generatedText
      .split('\n')
      .map(line => line.trim().replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter(trait => trait.length > 0 && trait.length < 30)
      .slice(0, 8);

    console.log('Parsed traits:', traits);

    return new Response(JSON.stringify({ traits }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-personality-traits function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

