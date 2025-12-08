import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-COMPANY-BY-WHATSAPP] ${step}${detailsStr}`);
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
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      throw userError;
    }

    if (!userData.user) {
      throw new Error("User not authenticated");
    }

    const { phone_number } = await req.json();
    if (!phone_number) {
      throw new Error("phone_number is required");
    }

    const cleanedPhoneNumber = phone_number.replace(/\D/g, '');

    if (!cleanedPhoneNumber || cleanedPhoneNumber.length < 10) {
      throw new Error("Número de WhatsApp inválido");
    }

    logStep("Searching for WhatsApp instance", { phone_number: cleanedPhoneNumber });

    const { data: whatsappInstance, error: instanceError } = await supabaseClient
      .from("whatsapp_instances")
      .select("organization_id, phone_number, instance_name, status")
      .eq("phone_number", cleanedPhoneNumber)
      .eq("status", "connected")
      .maybeSingle();

    if (instanceError) {
      logStep("Error searching instance", { error: instanceError.message });
      throw new Error(`Erro ao buscar instância: ${instanceError.message}`);
    }

    if (!whatsappInstance || !whatsappInstance.organization_id) {
      return new Response(
        JSON.stringify({
          error: "Nenhuma instância de WhatsApp conectada encontrada para este número"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    logStep("Instance found", { organization_id: whatsappInstance.organization_id });

    const organizationId = whatsappInstance.organization_id;

    const { data: organization, error: orgError } = await supabaseClient
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgError) {
      logStep("Error fetching organization", { error: orgError.message });
      throw new Error(`Erro ao buscar organização: ${orgError.message}`);
    }

    if (!organization) {
      return new Response(
        JSON.stringify({ error: "Organização não encontrada" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    logStep("Organization found", { organization_id: organization.id });

    const { data: settings, error: settingsError } = await supabaseClient
      .from("settings")
      .select("default_ai_interaction_id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (settingsError) {
      logStep("Error fetching settings", { error: settingsError.message });
    }

    let defaultAIContext = null;
    if (settings?.default_ai_interaction_id) {
      const { data: aiInteraction, error: aiError } = await supabaseClient
        .from("ai_interaction_settings")
        .select("*")
        .eq("id", settings.default_ai_interaction_id)
        .single();

      if (!aiError && aiInteraction) {
        defaultAIContext = aiInteraction;
        logStep("Default AI context found", { ai_interaction_id: aiInteraction.id });
      } else {
        logStep("Error fetching AI context", { error: aiError?.message });
      }
    }

    const { data: statuses, error: statusesError } = await supabaseClient
      .from("lead_statuses")
      .select("*")
      .eq("organization_id", organizationId)
      .order("display_order", { ascending: true });

    if (statusesError) {
      logStep("Error fetching statuses", { error: statusesError.message });
    }

    const finishedStatus = statuses?.find(s => s.status_key === "finished");
    const otherStatuses = statuses?.filter(s => s.status_key !== "finished") || [];
    const orderedStatuses = finishedStatus
      ? [...otherStatuses, finishedStatus]
      : (statuses || []);

    return new Response(
      JSON.stringify({
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
          company_name: organization.company_name,
          phone: organization.phone,
          cnpj: organization.cnpj,
          address: organization.address,
          website: organization.website,
          logo_url: organization.logo_url,
          plan: organization.plan,
          created_at: organization.created_at,
          updated_at: organization.updated_at,
        },
        default_ai_context: defaultAIContext,
        statuses: orderedStatuses,
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
