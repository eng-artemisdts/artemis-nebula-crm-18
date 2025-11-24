import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EVOLUTION-DELETE] ${step}${detailsStr}`);
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

    logStep("Deleting instance", { instanceName });

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not configured");
    }

    // Delete instance from Evolution API
    const response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers: {
        "apikey": EVOLUTION_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Evolution API error", { status: response.status, error: errorText });
      // Continue even if Evolution API fails - we still want to delete from our database
    } else {
      logStep("Instance deleted from Evolution API");
    }

    // Delete instance from database
    const { error: deleteError } = await supabaseClient
      .from("whatsapp_instances")
      .delete()
      .eq("instance_name", instanceName)
      .eq("organization_id", userData.user.user_metadata.organization_id);

    if (deleteError) {
      logStep("Database deletion error", { error: deleteError });
      throw deleteError;
    }

    logStep("Instance deleted successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Instance deleted successfully",
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
