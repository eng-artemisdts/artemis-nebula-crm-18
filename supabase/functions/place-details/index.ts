import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PLACE-DETAILS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { placeId } = await req.json();
    
    if (!placeId || placeId.trim().length === 0) {
      throw new Error("placeId is required");
    }

    logStep("Request parameters", { placeId });

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY not configured");
    }

    logStep("API key found");

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,formatted_address,name&language=pt-BR&key=${apiKey}`;
    logStep("Fetching place details", { url: detailsUrl.replace(apiKey, "***") });

    const response = await fetch(detailsUrl);
    const data = await response.json();

    logStep("Place details response", { status: data.status });

    if (data.status !== "OK") {
      let userMessage = "Erro ao buscar detalhes da localização.";
      if (data.status === "REQUEST_DENIED") {
        userMessage = "Google Places API negou a requisição. Verifique se a chave está correta e se o faturamento está ativo.";
      } else if (data.status === "NOT_FOUND") {
        userMessage = "Localização não encontrada.";
      }

      throw new Error(userMessage);
    }

    const result = data.result;
    const location = result.geometry?.location;

    if (!location) {
      throw new Error("Coordenadas não encontradas para esta localização.");
    }

    const placeDetails = {
      placeId: placeId,
      name: result.name || "",
      formattedAddress: result.formatted_address || "",
      latitude: location.lat,
      longitude: location.lng,
    };

    logStep("Place details processed", placeDetails);

    return new Response(
      JSON.stringify(placeDetails),
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

