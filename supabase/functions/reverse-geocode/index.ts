import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent",
  "Access-Control-Max-Age": "86400",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REVERSE-GEOCODE] ${step}${detailsStr}`);
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

    const { lat, lng } = await req.json();
    
    if (lat === undefined || lng === undefined) {
      throw new Error("lat and lng are required");
    }

    logStep("Request parameters", { lat, lng });

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY not configured");
    }

    logStep("API key found");

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=pt-BR&key=${apiKey}`;
    logStep("Fetching reverse geocode", { url: geocodeUrl.replace(apiKey, "***") });

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    logStep("Reverse geocode response", { status: data.status });

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return new Response(
        JSON.stringify({ formattedAddress: null }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const formattedAddress = data.results[0].formatted_address;

    logStep("Reverse geocode processed", { formattedAddress });

    return new Response(
      JSON.stringify({ formattedAddress }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

