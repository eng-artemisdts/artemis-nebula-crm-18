import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { numbers } = await req.json();

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      throw new Error("Missing or invalid numbers array");
    }

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not configured");
    }

    // Get instance name from whatsapp_instances table
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const instanceResponse = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_instances?select=instance_name&status=eq.connected&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!instanceResponse.ok) {
      throw new Error("No connected WhatsApp instance found");
    }

    const instances = await instanceResponse.json();
    if (!instances || instances.length === 0) {
      throw new Error("No connected WhatsApp instance available");
    }

    const instanceName = instances[0].instance_name;
    console.log("Using instance:", instanceName);

    // Check each number with Evolution API
    const results = [];
    for (const number of numbers) {
      try {
        console.log("Checking number:", number);
        
        const checkResponse = await fetch(`${EVOLUTION_API_URL}/chat/whatsappNumbers/${instanceName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            numbers: [number]
          }),
        });

        if (!checkResponse.ok) {
          const errorData = await checkResponse.text();
          console.error(`Error checking number ${number}:`, errorData);
          results.push({
            number,
            exists: false,
            jid: null,
            error: `API error: ${checkResponse.status}`
          });
          continue;
        }

        const checkData = await checkResponse.json();
        console.log(`Result for ${number}:`, checkData);

        if (checkData && checkData.length > 0) {
          results.push({
            number,
            exists: checkData[0].exists || false,
            jid: checkData[0].jid || null
          });
        } else {
          results.push({
            number,
            exists: false,
            jid: null
          });
        }
      } catch (error) {
        console.error(`Error processing number ${number}:`, error);
        results.push({
          number,
          exists: false,
          jid: null,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in evolution-check-whatsapp:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
