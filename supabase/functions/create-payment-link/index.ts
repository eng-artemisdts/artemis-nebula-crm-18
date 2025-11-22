import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { leadId } = await req.json();
    
    if (!leadId) {
      throw new Error("Lead ID is required");
    }

    // Get lead information
    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      throw new Error("Lead not found");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create a payment link with a fixed price (you can customize this)
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Serviço - ${lead.name}`,
              description: lead.description || "Serviço Artemis Digital Solutions",
            },
            unit_amount: 50000, // R$ 500.00 (amount in cents)
          },
          quantity: 1,
        },
      ],
      metadata: {
        lead_id: leadId,
        lead_name: lead.name,
      },
    });

    // Update lead with payment information
    const { error: updateError } = await supabaseClient
      .from("leads")
      .update({
        payment_link_url: paymentLink.url,
        payment_stripe_id: paymentLink.id,
        payment_status: "link_gerado",
      })
      .eq("id", leadId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Payment link created for lead ${leadId}: ${paymentLink.url}`);

    return new Response(
      JSON.stringify({ 
        url: paymentLink.url,
        stripe_id: paymentLink.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating payment link:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
