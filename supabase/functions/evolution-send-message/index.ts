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

    // Se há URL de imagem, envia a imagem PRIMEIRO
    if (imageUrl) {
      console.log("Preparing to send image:", imageUrl);
      
      try {
        // Download da imagem
        const imageDownloadResponse = await fetch(imageUrl);
        if (!imageDownloadResponse.ok) {
          throw new Error(`Failed to download image: ${imageDownloadResponse.status}`);
        }
        
        // Converte para base64 PURO (sem prefixo data:)
        const imageBuffer = await imageDownloadResponse.arrayBuffer();
        const base64Image = btoa(
          new Uint8Array(imageBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );
        
        console.log("Sending image as base64, size:", base64Image.length, "bytes");
        
        const imageResponse = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            number: remoteJid,
            mediatype: "image",
            media: base64Image,
            fileName: "promocao.png"
          }),
        });

        if (!imageResponse.ok) {
          const errorData = await imageResponse.text();
          console.error("Error sending image:", errorData);
          throw new Error(`Failed to send image: ${imageResponse.status}`);
        }
        
        const imageResult = await imageResponse.json();
        console.log("Image sent successfully:", imageResult);
        
        // Aguarda um pouco antes de enviar o texto
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (imageError) {
        console.error("Error processing image:", imageError);
        // Continua mesmo se a imagem falhar
      }
    }

    // Envia mensagem de texto DEPOIS da imagem
    console.log("Sending text message to:", remoteJid);
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
    
    const textResult = await textResponse.json();
    console.log("Text message sent successfully:", textResult);

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
