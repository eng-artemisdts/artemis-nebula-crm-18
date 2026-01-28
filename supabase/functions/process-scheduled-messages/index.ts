import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not configured");
    }

    const now = new Date();
    const nowISO = now.toISOString();

    const { data: scheduledMessages, error: fetchError } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", nowISO)
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    if (!scheduledMessages || scheduledMessages.length === 0) {
      return new Response(
        JSON.stringify({ message: "No messages to process", processed: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    let successCount = 0;
    let errorCount = 0;

    for (const scheduled of scheduledMessages) {
      try {
        if (scheduled.image_url) {
          let finalImageUrl = scheduled.image_url;

          if (!scheduled.image_url.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)) {
            if (scheduled.image_url.includes('?')) {
              const [base, query] = scheduled.image_url.split('?');
              finalImageUrl = `${base}.png?${query}`;
            } else {
              finalImageUrl = `${scheduled.image_url}.png`;
            }
          }

          const extension = finalImageUrl.match(/\.(png|jpg|jpeg|gif|webp)/i)?.[1]?.toLowerCase();
          const mimetypeMap: Record<string, string> = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp'
          };
          const mimetype = mimetypeMap[extension || 'png'] || 'image/png';

          const imageResponse = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${scheduled.instance_name}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": EVOLUTION_API_KEY,
            },
            body: JSON.stringify({
              number: scheduled.remote_jid,
              mediatype: "image",
              mimetype: mimetype,
              media: finalImageUrl,
              fileName: "promocao.png"
            }),
          });

          if (!imageResponse.ok) {
            throw new Error(`Failed to send image: ${imageResponse.status}`);
          }

          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const textResponse = await fetch(`${EVOLUTION_API_URL}/message/sendText/${scheduled.instance_name}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            number: scheduled.remote_jid,
            text: scheduled.message,
          }),
        });

        if (!textResponse.ok) {
          throw new Error(`Failed to send text message: ${textResponse.status}`);
        }

        await supabase
          .from("scheduled_messages")
          .update({ status: "sent", updated_at: new Date().toISOString() })
          .eq("id", scheduled.id);

        await supabase
          .from("leads")
          .update({
            status: "conversation_started",
            whatsapp_verified: true
          })
          .eq("id", scheduled.lead_id);

        successCount++;
      } catch (error) {
        console.error(`Error processing scheduled message ${scheduled.id}:`, error);

        await supabase
          .from("scheduled_messages")
          .update({
            status: "failed",
            updated_at: new Date().toISOString()
          })
          .eq("id", scheduled.id);

        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Processing completed",
        processed: scheduledMessages.length,
        success: successCount,
        errors: errorCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in process-scheduled-messages:", error);
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



