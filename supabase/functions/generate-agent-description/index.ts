import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, conversation_focus, main_objective } = await req.json();

    if (!name && !conversation_focus && !main_objective) {
      return new Response(
        JSON.stringify({ error: "Pelo menos um campo deve ser fornecido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY não configurada" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const contextInfo = [
      name ? `Nome: ${name}` : "",
      conversation_focus ? `Foco: ${conversation_focus}` : "",
      main_objective ? `Objetivo: ${main_objective}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    const prompt = `Com base nas seguintes informações sobre um agente de IA: ${contextInfo}

Gere uma descrição breve e profissional (máximo de 2-3 frases) que descreva o propósito e função deste agente. A descrição deve ser clara, concisa e focada no que o agente faz.

Retorne apenas a descrição, sem explicações adicionais ou formatação especial.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente especializado em criar descrições profissionais e concisas para agentes de IA.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${errorData}`);
    }

    const data = await response.json();
    const description =
      data.choices?.[0]?.message?.content?.trim() || "";

    if (!description) {
      throw new Error("Nenhuma descrição foi gerada");
    }

    return new Response(
      JSON.stringify({ description }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

