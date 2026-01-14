import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { organizationId } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organizationId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (profile.organization_id !== organizationId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Organization mismatch" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: mediaComponent, error: componentError } = await supabaseClient
      .from("components")
      .select("id, name, identifier")
      .eq("identifier", "media_sender")
      .single();

    if (componentError || !mediaComponent) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          mediaItems: [],
          message: "Media sender component not found" 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: componentConfig, error: configError } = await supabaseClient
      .from("component_configurations")
      .select("config")
      .eq("component_id", mediaComponent.id)
      .maybeSingle();

    if (configError) {
      console.error("Error fetching component configuration:", configError);
      return new Response(
        JSON.stringify({ error: "Error fetching media configuration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const mediaItems = componentConfig?.config?.mediaItems || [];

    return new Response(
      JSON.stringify({
        success: true,
        organizationId,
        mediaItems: mediaItems.map((item: {
          id: string;
          type: string;
          url: string;
          fileName: string;
          usageDescription: string;
        }) => ({
          id: item.id,
          type: item.type,
          url: item.url,
          fileName: item.fileName,
          usageDescription: item.usageDescription,
        })),
        count: mediaItems.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in get-available-media:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

