import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EVOLUTION-STATUS] ${step}${detailsStr}`);
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

    logStep("Checking instance status", { instanceName });

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not configured");
    }

    // Get instance status from Evolution API
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
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

    const statusData = await response.json();
    logStep("Status received", { statusData });

    const isConnected = statusData.instance?.state === "open";

    // Update instance status in database
    const updateData: any = {
      status: isConnected ? "connected" : statusData.instance?.state || "disconnected",
    };

    if (isConnected && !statusData.connected_at) {
      updateData.connected_at = new Date().toISOString();
      updateData.qr_code = null; // Clear QR code once connected
    }

    const { error: updateError } = await supabaseClient
      .from("whatsapp_instances")
      .update(updateData)
      .eq("instance_name", instanceName);

    if (updateError) {
      logStep("Database update error", { error: updateError });
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: statusData.instance?.state || "unknown",
        connected: isConnected,
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