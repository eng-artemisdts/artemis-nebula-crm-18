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

    const { leadId, paymentAmount } = await req.json();
    
    if (!leadId) {
      throw new Error("Lead ID is required");
    }

    console.log(`[CREATE-PAYMENT-LINK] Processing lead: ${leadId}`);

    // Get lead information
    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      console.error("[CREATE-PAYMENT-LINK] Lead not found:", leadError);
      throw new Error("Lead not found");
    }

    // Determine amount: prefer value from request, fallback to DB
    const amount = typeof paymentAmount === "number" ? paymentAmount : lead.payment_amount;

    // Validate payment amount
    if (!amount || amount <= 0) {
      console.error("[CREATE-PAYMENT-LINK] Invalid payment amount:", amount);
      throw new Error("O lead precisa ter um valor válido definido antes de gerar o link de pagamento");
    }

    console.log(`[CREATE-PAYMENT-LINK] Lead full data:`, JSON.stringify(lead));
    console.log(`[CREATE-PAYMENT-LINK] Using amount: R$ ${amount} (from ${typeof paymentAmount === "number" ? "request" : "lead"})`);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Convert BRL to cents
    const amountInCents = Math.round(amount * 100);
    console.log(`[CREATE-PAYMENT-LINK] Amount in cents: ${amountInCents}`);

    // Create a Checkout Session with PIX, card, and boleto support
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'boleto', 'pix'],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Serviço - ${lead.name}`,
              description: lead.description || "Serviço Artemis Digital Solutions",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get("origin")}/lead/${leadId}?payment=success`,
      cancel_url: `${req.headers.get("origin")}/lead/${leadId}?payment=cancelled`,
      metadata: {
        lead_id: leadId,
        lead_name: lead.name,
        lead_amount: amount.toString(),
      },
    });

    console.log(`[CREATE-PAYMENT-LINK] Checkout session created: ${session.url}`);

    // Update lead with payment information
    const { error: updateError } = await supabaseClient
      .from("leads")
      .update({
        payment_link_url: session.url,
        payment_stripe_id: session.id,
        payment_status: "link_gerado",
        payment_amount: amount,
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("[CREATE-PAYMENT-LINK] Error updating lead:", updateError);
      throw updateError;
    }

    console.log(`[CREATE-PAYMENT-LINK] Success for lead ${leadId}`);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        stripe_id: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[CREATE-PAYMENT-LINK] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
