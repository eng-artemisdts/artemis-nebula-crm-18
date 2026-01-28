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
  console.log(`[EVOLUTION-STATUS] ${step}${detailsStr}`);
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

    const { instanceName } = await req.json();
    if (!instanceName) throw new Error("Instance name is required");

    logStep("Checking instance status", { instanceName });

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not configured");
    }


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

    const state =
      statusData.instance?.state ||
      statusData.state ||
      statusData.status ||
      statusData.instance?.connection ||
      null;

    let ownerFromStatus =
      statusData.instance?.owner ||
      statusData.instance?.instance?.owner ||
      statusData.owner ||
      statusData.instance?.ownerJid ||
      statusData.instance?.user ||
      null;

    const ensureOwnerFromFetchInstances = async () => {
      const infoResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
        method: "GET",
        headers: {
          "apikey": EVOLUTION_API_KEY,
        },
      });

      if (!infoResponse.ok) {
        logStep("fetchInstances failed", { status: infoResponse.status });
        return null;
      }

      const instancesInfo = await infoResponse.json();
      const instancesArray = Array.isArray(instancesInfo)
        ? instancesInfo
        : (instancesInfo.data || instancesInfo.instances || []);

      const instanceInfo = instancesArray.find((inst: any) => {
        const name = inst.instance?.instanceName || inst.instanceName || inst.name;
        return name === instanceName;
      });

      const ownerCandidate =
        instanceInfo?.instance?.owner ||
        instanceInfo?.owner ||
        instanceInfo?.instance?.ownerJid ||
        instanceInfo?.instance?.user ||
        null;

      return ownerCandidate || null;
    };

    if (!ownerFromStatus) {
      ownerFromStatus = await ensureOwnerFromFetchInstances();
      logStep("Owner resolved via fetchInstances", { ownerFromStatus });
    }

    const hasOwner = !!ownerFromStatus;
    const isConnected = state === "open";

    logStep("Connection check", {
      state,
      hasOwner,
      isConnected,
      owner: statusData.instance?.owner
    });

    const updateData: any = {
      status: isConnected ? "connected" : (state || "disconnected"),
    };

    if (!isConnected) {
      if (state === "close" || state === "closed") {
        updateData.status = "disconnected";
        updateData.phone_number = null;
        updateData.whatsapp_jid = null;
        updateData.connected_at = null;
        updateData.qr_code = null;
      } else if (state && state !== "open") {
        updateData.status = state;
      }
    }

    if (isConnected) {

      try {

        let phoneNumber: string | null = null;
        let whatsappJid: string | null = null;

        if (ownerFromStatus) {
          whatsappJid = ownerFromStatus;
          phoneNumber = ownerFromStatus.split('@')[0];
          logStep("Phone number resolved", { phoneNumber, raw: ownerFromStatus });
        }

        if (phoneNumber) {
          let cleanedPhone = phoneNumber.replace(/\D/g, '');

          if (cleanedPhone.startsWith('55') && cleanedPhone.length > 10) {
            cleanedPhone = cleanedPhone.substring(2);
          }

          if (cleanedPhone.length >= 10) {
            const { data: currentInstance } = await supabaseClient
              .from("whatsapp_instances")
              .select("id")
              .eq("instance_name", instanceName)
              .single();

            if (currentInstance) {
              const { data: duplicateByPhone } = await supabaseClient
                .from("whatsapp_instances")
                .select("id, instance_name")
                .eq("phone_number", cleanedPhone)
                .neq("id", currentInstance.id)
                .maybeSingle();

              if (duplicateByPhone) {
                logStep("Duplicate instance found with same phone number", {
                  duplicate: duplicateByPhone.instance_name,
                  phone: cleanedPhone
                });
                throw new Error(`Já existe uma instância conectada com este número de WhatsApp: ${duplicateByPhone.instance_name}`);
              }

              if (whatsappJid) {
                const { data: duplicateByJid } = await supabaseClient
                  .from("whatsapp_instances")
                  .select("id, instance_name")
                  .eq("whatsapp_jid", whatsappJid)
                  .neq("id", currentInstance.id)
                  .maybeSingle();

                if (duplicateByJid) {
                  logStep("Duplicate instance found with same JID", {
                    duplicate: duplicateByJid.instance_name,
                    jid: whatsappJid
                  });
                  throw new Error(`Já existe uma instância conectada com este WhatsApp JID: ${duplicateByJid.instance_name}`);
                }
              }
            }

            updateData.phone_number = cleanedPhone;
            if (whatsappJid) {
              updateData.whatsapp_jid = whatsappJid;
            }
            logStep("Phone number cleaned and set", { cleanedPhone, original: phoneNumber, jid: whatsappJid });
          } else {
            logStep("Phone number too short after cleaning", { cleanedPhone, original: phoneNumber });
          }
        } else {
          logStep("No phone number found in instance data");
        }
      } catch (error) {
        logStep("Error fetching instance info", { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }


      const { data: existingInstance } = await supabaseClient
        .from("whatsapp_instances")
        .select("connected_at")
        .eq("instance_name", instanceName)
        .single();

      if (!existingInstance?.connected_at) {
        updateData.connected_at = new Date().toISOString();
      }
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
        hasOwner: hasOwner,
        owner: statusData.instance?.owner || null,
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