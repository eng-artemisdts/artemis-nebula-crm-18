import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent",
  "Access-Control-Max-Age": "86400",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EVOLUTION-CREATE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
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
    if (!userData?.user) throw new Error("User not found");

    logStep("User authenticated", { userId: userData.user.id });


    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", userData.user.id)
      .single();

    if (!profile?.organization_id) throw new Error("Organization not found");


    const { data: existingInstances, error: countError } = await supabaseClient
      .from("whatsapp_instances")
      .select("id")
      .eq("organization_id", profile.organization_id);

    if (countError) throw countError;

    if (existingInstances && existingInstances.length >= 3) {
      throw new Error("Limite máximo de 3 instâncias atingido. Delete uma instância existente para criar uma nova.");
    }

    const { instanceName } = await req.json();
    if (!instanceName) throw new Error("Instance name is required");

    logStep("Creating instance", { instanceName });

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not configured");
    }


    const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        rejectCall: false,
        groupsIgnore: false,
        alwaysOnline: true,
        readMessages: false,
        readStatus: false,
        syncFullHistory: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Evolution API error", { status: response.status, error: errorText });

      let errorMessage = `Evolution API error: ${errorText}`;

      try {
        const errorData = JSON.parse(errorText);
        if (response.status === 403 && errorData?.response?.message) {
          const message = Array.isArray(errorData.response.message)
            ? errorData.response.message[0]
            : errorData.response.message;

          if (message?.includes("is already in use")) {
            errorMessage = `O nome da instância "${instanceName}" já está em uso. Escolha outro nome.`;
          }
        }
      } catch (parseError) {
      }

      return new Response(
        JSON.stringify({ error: errorMessage, success: false }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const evolutionData = await response.json();
    logStep("Instance created in Evolution API", { evolutionData });


    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;

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
          enabled: true,
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

    } else {
      logStep("Webhook configured successfully");
    }


    const { data: instance, error: dbError } = await supabaseClient
      .from("whatsapp_instances")
      .insert({
        organization_id: profile.organization_id,
        instance_name: instanceName,
        instance_id: evolutionData.instance?.instanceId || null,
        status: "created",
        api_key: evolutionData.hash?.apikey || null,
      })
      .select()
      .single();

    if (dbError) {
      logStep("Database error", { error: dbError });
      throw dbError;
    }

    logStep("Instance saved to database", { instanceId: instance.id });

    return new Response(
      JSON.stringify({
        success: true,
        instance,
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