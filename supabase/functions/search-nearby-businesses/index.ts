import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEARCH-NEARBY-BUSINESSES] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { location, categories, radius } = await req.json();
    
    if (!location || !categories || categories.length === 0) {
      throw new Error("Location and categories are required");
    }

    logStep("Request parameters", { location, categories, radius });

    // Mock data para demonstração
    // Em produção, você deve integrar com uma API real como:
    // - Google Places API
    // - Yelp API
    // - Foursquare API
    // - TomTom Search API
    
    const mockBusinesses = [
      {
        name: "Empresa Tech Solutions",
        address: `Rua das Flores, 123 - ${location}`,
        phone: "(11) 98765-4321",
        category: categories[0],
        rating: 4.5,
        latitude: -23.5505,
        longitude: -46.6333,
      },
      {
        name: "Digital Innovations Ltda",
        address: `Av. Paulista, 1000 - ${location}`,
        phone: "(11) 91234-5678",
        category: categories[0],
        rating: 4.8,
        latitude: -23.5615,
        longitude: -46.6562,
      },
      {
        name: "WebSoft Desenvolvimento",
        address: `Rua dos Bandeirantes, 456 - ${location}`,
        phone: "(11) 99876-5432",
        category: categories[0],
        rating: 4.2,
        latitude: -23.5489,
        longitude: -46.6388,
      },
    ];

    logStep("Returning mock businesses", { count: mockBusinesses.length });

    return new Response(
      JSON.stringify({ 
        businesses: mockBusinesses,
        total: mockBusinesses.length 
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
EXEMPLO DE INTEGRAÇÃO COM API REAL (Google Places API):

Parâmetros JSON esperados pela função:
{
  "location": "São Paulo, SP",           // Localização para busca
  "categories": [                        // Categorias selecionadas
    "Desenvolvimento Web",
    "E-commerce"
  ],
  "radius": 5000                         // Raio em metros (padrão: 5000)
}

Resposta JSON retornada:
{
  "businesses": [
    {
      "name": "Nome do Negócio",
      "address": "Endereço completo",
      "phone": "(11) 98765-4321",       // Opcional
      "category": "Categoria do lead",
      "rating": 4.5,                     // Opcional
      "latitude": -23.5505,              // Opcional
      "longitude": -46.6333              // Opcional
    }
  ],
  "total": 10
}

Para implementar com Google Places API:
1. Obtenha uma API key em: https://console.cloud.google.com/
2. Ative a Google Places API
3. Adicione a API key nos secrets do Supabase: GOOGLE_PLACES_API_KEY
4. Substitua a seção de mock data por:

const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
if (!apiKey) {
  throw new Error("GOOGLE_PLACES_API_KEY not configured");
}

// Geocode da localização
const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
const geocodeResponse = await fetch(geocodeUrl);
const geocodeData = await geocodeResponse.json();

if (geocodeData.status !== "OK" || geocodeData.results.length === 0) {
  throw new Error("Location not found");
}

const { lat, lng } = geocodeData.results[0].geometry.location;

// Busca de lugares próximos para cada categoria
const allBusinesses = [];
for (const category of categories) {
  const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=establishment&keyword=${encodeURIComponent(category)}&key=${apiKey}`;
  
  const searchResponse = await fetch(searchUrl);
  const searchData = await searchResponse.json();
  
  if (searchData.status === "OK") {
    const businesses = searchData.results.map((place: any) => ({
      name: place.name,
      address: place.vicinity,
      phone: place.formatted_phone_number,
      category: category,
      rating: place.rating,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
    }));
    
    allBusinesses.push(...businesses);
  }
}

return new Response(
  JSON.stringify({ 
    businesses: allBusinesses,
    total: allBusinesses.length 
  }),
  {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  }
);
*/
