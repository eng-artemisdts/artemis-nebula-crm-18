import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EVOLUTION-CONNECT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;

    const { instanceName } = await req.json();
    if (!instanceName) throw new Error("Instance name is required");

    logStep("Connecting instance", { instanceName });

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not configured");
    }

    // Get QR code from Evolution API
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": EVOLUTION_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Evolution API error", { status: response.status, error: errorText });
      throw new Error(`Evolution API error: ${errorText}`);
    }

    const qrData = await response.json();
    logStep("QR code received", { hasQR: !!qrData.base64 });

    // Set webhook to receive messages
    const projectId = Deno.env.get("SUPABASE_PROJECT_ID") || "trwgnmtmynxifwctlfvb";
    const webhookUrl = `https://${projectId}.supabase.co/functions/v1/evolution-webhook`;
    
    logStep("Configuring webhook", { webhookUrl });
    
    const webhookResponse = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        webhook: {
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: false,
          events: [
            "QRCODE_UPDATED",
            "CONNECTION_UPDATE",
            "MESSAGES_UPSERT",
          ],
        },
      }),
    });

    if (!webhookResponse.ok) {
      const webhookError = await webhookResponse.text();
      logStep("Webhook configuration warning", { error: webhookError });
      // Continue even if webhook fails - we can set it up later
    } else {
      logStep("Webhook configured successfully");
    }

    // Update instance with QR code
    const { error: updateError } = await supabaseClient
      .from("whatsapp_instances")
      .update({
        qr_code: qrData.base64 || null,
        status: "connecting",
      })
      .eq("instance_name", instanceName);

    if (updateError) {
      logStep("Database update error", { error: updateError });
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        qrcode: qrData.base64,
        pairingCode: qrData.pairingCode,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});