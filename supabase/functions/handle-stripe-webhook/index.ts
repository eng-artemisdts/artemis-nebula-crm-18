import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    // Get Stripe signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: No signature found");
      throw new Error("No Stripe signature found");
    }

    const body = await req.text();
    
    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: No Stripe key");
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Validate webhook signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    logStep("Webhook secret configured", { hasSecret: !!webhookSecret, secretPrefix: webhookSecret?.substring(0, 10) });
    let event;
    
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret || "");
      logStep("Webhook signature verified", { eventType: event.type });
    } catch (err: any) {
      logStep("ERROR: Invalid signature", { 
        message: err.message,
        signatureReceived: signature.substring(0, 20) + "...",
        bodyLength: body.length 
      });
      return new Response(JSON.stringify({ error: "Invalid signature", details: err.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Process payment completion event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const leadId = session.metadata?.lead_id;

      if (!leadId) {
        logStep("ERROR: No lead_id in metadata");
        return new Response(JSON.stringify({ error: "No lead_id found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      logStep("Payment completed", { leadId, sessionId: session.id });

      // Update lead in database
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { error: updateError } = await supabaseClient
        .from("leads")
        .update({
          status: "pago",
          payment_status: "pago",
          paid_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (updateError) {
        logStep("ERROR: Failed to update lead", { error: updateError });
        throw updateError;
      }

      logStep("SUCCESS: Lead marked as paid", { leadId });
    } else {
      logStep("Event type not handled", { eventType: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
