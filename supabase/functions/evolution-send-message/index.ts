import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { instanceName, remoteJid, message, imageUrl } = await req.json();

    if (!instanceName || !remoteJid || !message) {
      throw new Error("Missing required parameters");
    }

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not configured");
    }

    // Envia mensagem de texto
    const textResponse = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: remoteJid,
        text: message,
      }),
    });

    if (!textResponse.ok) {
      const errorData = await textResponse.text();
      console.error("Error sending text message:", errorData);
      
      // If instance doesn't exist (404), provide a clear error message
      if (textResponse.status === 404) {
        throw new Error("A instância WhatsApp não está mais ativa. Por favor, reconecte no menu WhatsApp.");
      }
      
      throw new Error(`Failed to send text message: ${textResponse.status}`);
    }

    // Se há URL de imagem, envia a imagem
    if (imageUrl) {
      // Aguarda um pouco para não enviar as duas mensagens ao mesmo tempo
      await new Promise(resolve => setTimeout(resolve, 1000));

      const imageResponse = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: remoteJid,
          mediatype: "image",
          media: imageUrl,
        }),
      });

      if (!imageResponse.ok) {
        const errorData = await imageResponse.text();
        console.error("Error sending image:", errorData);
        // Não falha a operação se a imagem não for enviada
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in evolution-send-message:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
