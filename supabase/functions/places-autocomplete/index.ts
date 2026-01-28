import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent",
  "Access-Control-Max-Age": "86400",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PLACES-AUTOCOMPLETE] ${step}${detailsStr}`);
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

    const { input, location, radius } = await req.json();
    
    if (!input || input.trim().length === 0) {
      throw new Error("Input is required");
    }

    logStep("Request parameters", { input, location, radius });

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY not configured");
    }

    logStep("API key found");

    let autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&language=pt-BR&key=${apiKey}`;
    
    if (location) {
      const [lat, lng] = location.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        autocompleteUrl += `&location=${lat},${lng}`;
        if (radius) {
          autocompleteUrl += `&radius=${radius}`;
        }
      }
    }

    logStep("Fetching autocomplete", { url: autocompleteUrl.replace(apiKey, "***") });

    const response = await fetch(autocompleteUrl);
    const data = await response.json();

    logStep("Autocomplete response", { status: data.status, predictions: data.predictions?.length || 0 });

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      let userMessage = "Erro ao buscar localizações.";
      if (data.status === "REQUEST_DENIED") {
        userMessage = "Google Places API negou a requisição. Verifique se a chave está correta e se o faturamento está ativo.";
      } else if (data.status === "INVALID_REQUEST") {
        userMessage = "Requisição inválida. Verifique os parâmetros enviados.";
      }

      throw new Error(userMessage);
    }

    const predictions = (data.predictions || []).map((prediction: any) => ({
      placeId: prediction.place_id,
      description: prediction.description,
      mainText: prediction.structured_formatting?.main_text || prediction.description,
      secondaryText: prediction.structured_formatting?.secondary_text || "",
      types: prediction.types || [],
    }));

    logStep("Predictions processed", { count: predictions.length });

    return new Response(
      JSON.stringify({ 
        predictions,
        status: data.status
      }),
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

/* 
DOCUMENTAÇÃO DA API - Google Places Autocomplete

Esta edge function busca sugestões de localização usando Google Places Autocomplete API.

Parâmetros JSON esperados pela função:
{
  "input": "São Paulo",                    // Texto de busca (obrigatório)
  "location": "-23.5505,-46.6333",        // Coordenadas lat,lng (opcional) - para priorizar resultados próximos
  "radius": 50000                         // Raio em metros (opcional) - usado com location
}

Resposta JSON retornada:
{
  "predictions": [
    {
      "placeId": "ChIJ0WGkg4FEzpQRrlsz_wh1q1k",
      "description": "São Paulo, SP, Brasil",
      "mainText": "São Paulo",
      "secondaryText": "SP, Brasil",
      "types": ["locality", "political"]
    }
  ],
  "status": "OK"
}

API do Google utilizada:
- Places Autocomplete API - busca sugestões de localização enquanto o usuário digita

Requisitos:
1. Mesma API key da função search-nearby-businesses
2. Places API (New) deve estar habilitada
3. Faturamento ativo no Google Cloud

Limites do Google Places API:
- Autocomplete: $2.83 por 1.000 requisições (sessões)
- Autocomplete Per Session: $17 por 1.000 requisições (sessões)
*/

