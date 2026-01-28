import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { instanceName, remoteJid, message, mediaUrl, mediaType } = await req.json();

    if (!instanceName || !remoteJid || !mediaUrl || !mediaType) {
      throw new Error("Missing required parameters: instanceName, remoteJid, mediaUrl, and mediaType are required");
    }

    if (mediaType !== 'image' && mediaType !== 'video' && mediaType !== 'document') {
      throw new Error("mediaType must be 'image', 'video' or 'document'");
    }

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not configured");
    }

    let finalMediaUrl = mediaUrl;
    let mimetype = '';
    let fileName = '';

    if (mediaType === 'image') {
      if (!mediaUrl.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)) {
        if (mediaUrl.includes('?')) {
          const [base, query] = mediaUrl.split('?');
          finalMediaUrl = `${base}.png?${query}`;
        } else {
          finalMediaUrl = `${mediaUrl}.png`;
        }
        console.log("URL without extension detected, modified to:", finalMediaUrl);
      }

      const extension = finalMediaUrl.match(/\.(png|jpg|jpeg|gif|webp)/i)?.[1]?.toLowerCase();
      const mimetypeMap: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp'
      };
      mimetype = mimetypeMap[extension || 'png'] || 'image/png';
      fileName = `media.${extension || 'png'}`;
    } else if (mediaType === 'video') {
      if (!mediaUrl.match(/\.(mp4|mov|quicktime)(\?.*)?$/i)) {
        if (mediaUrl.includes('?')) {
          const [base, query] = mediaUrl.split('?');
          finalMediaUrl = `${base}.mp4?${query}`;
        } else {
          finalMediaUrl = `${mediaUrl}.mp4`;
        }
        console.log("URL without extension detected, modified to:", finalMediaUrl);
      }

      const extension = finalMediaUrl.match(/\.(mp4|mov|quicktime)/i)?.[1]?.toLowerCase();
      const mimetypeMap: Record<string, string> = {
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'quicktime': 'video/quicktime'
      };
      mimetype = mimetypeMap[extension || 'mp4'] || 'video/mp4';
      fileName = `media.${extension || 'mp4'}`;
    } else if (mediaType === 'document') {
      if (!mediaUrl.match(/\.pdf(\?.*)?$/i)) {
        if (mediaUrl.includes('?')) {
          const [base, query] = mediaUrl.split('?');
          finalMediaUrl = `${base}.pdf?${query}`;
        } else {
          finalMediaUrl = `${mediaUrl}.pdf`;
        }
        console.log("URL without PDF extension detected, modified to:", finalMediaUrl);
      }

      mimetype = 'application/pdf';
      fileName = 'document.pdf';
    }

    const hasMessage = message && typeof message === 'string' && message.trim().length > 0;
    
    console.log(`Preparing to send ${mediaType}:`, finalMediaUrl);
    console.log(`Mimetype: ${mimetype}, FileName: ${fileName}`);
    console.log(`Message provided: ${hasMessage ? 'Yes' : 'No'}`);
    if (hasMessage) {
      console.log(`Message content: "${message}"`);
    }

    const mediaPayload: {
      number: string;
      mediatype: string;
      mimetype: string;
      media: string;
      fileName: string;
      caption?: string;
    } = {
      number: remoteJid,
      mediatype: mediaType,
      mimetype: mimetype,
      media: finalMediaUrl,
      fileName: fileName
    };

    if (hasMessage) {
      mediaPayload.caption = message.trim();
    }

    const mediaResponse = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify(mediaPayload),
    });

    if (!mediaResponse.ok) {
      const errorData = await mediaResponse.text();
      console.error(`Error sending ${mediaType}:`, errorData);

      if (mediaResponse.status === 404) {
        throw new Error("A instância WhatsApp não está mais ativa. Por favor, reconecte no menu WhatsApp.");
      }

      throw new Error(`Failed to send ${mediaType}: ${mediaResponse.status} - ${errorData}`);
    }

    const mediaResult = await mediaResponse.json();
    console.log(`${mediaType} sent successfully:`, mediaResult);

    if (!hasMessage) {
      console.log("No message provided, skipping text message");
    }

    return new Response(
      JSON.stringify({ success: true, mediaResult }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in evolution-send-media:", error);
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





