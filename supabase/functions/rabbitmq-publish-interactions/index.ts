import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Buffer } from "https://deno.land/std@0.168.0/node/buffer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface ScheduledInteractionMessage {
  scheduledInteractionId: string;
  leadId: string;
  leadName: string;
  leadWhatsApp: string;
  remoteJid: string;
  aiInteractionId: string;
  instanceName: string;
  scheduledAt: string;
}

async function setupRabbitMQResources(
  amqpUrl: string
): Promise<{ channel: any; connection: any }> {
  const amqplib = await import("https://esm.sh/amqplib@0.10.3");

  const connection = await amqplib.connect(amqpUrl);
  const channel = await connection.createChannel();

  const dlxName = "scheduled_interactions_dlx";
  const destinationQueue = "scheduled_interactions_queue";
  const delayQueue = "scheduled_interactions_delay_queue";

  await channel.assertExchange(dlxName, "direct", { durable: true });
  await channel.assertQueue(destinationQueue, { durable: true });
  await channel.bindQueue(destinationQueue, dlxName, "interaction.scheduled");
  await channel.assertQueue(delayQueue, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": dlxName,
      "x-dead-letter-routing-key": "interaction.scheduled",
    },
  });

  return { channel, connection };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { interactions }: { interactions: ScheduledInteractionMessage[] } = await req.json();

    if (!interactions || !Array.isArray(interactions) || interactions.length === 0) {
      throw new Error("Lista de interações inválida ou vazia");
    }

    const RABBITMQ_URL =
      Deno.env.get("RABBITMQ_URL") ||
      "amqps://ocngnrrh:N1qMOy_7reSOnxJwnW979CT06BEal3YI@possum.lmq.cloudamqp.com/ocngnrrh";

    const { channel, connection } = await setupRabbitMQResources(RABBITMQ_URL);

    const now = new Date();
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const message of interactions) {
      try {
        const scheduledDate = new Date(message.scheduledAt);
        const delayMs = Math.max(0, scheduledDate.getTime() - now.getTime());

        const messageBody = JSON.stringify({
          scheduledInteractionId: message.scheduledInteractionId,
          leadId: message.leadId,
          leadName: message.leadName,
          leadWhatsApp: message.leadWhatsApp,
          remoteJid: message.remoteJid,
          aiInteractionId: message.aiInteractionId,
          instanceName: message.instanceName,
          scheduledAt: message.scheduledAt,
        });

        const messageBuffer = Buffer.from(messageBody, "utf-8");

        if (delayMs === 0) {
          const destinationQueue = "scheduled_interactions_queue";
          channel.sendToQueue(destinationQueue, messageBuffer, { persistent: true });
        } else {
          const delayQueue = "scheduled_interactions_delay_queue";
          channel.sendToQueue(delayQueue, messageBuffer, {
            persistent: true,
            expiration: String(delayMs),
          });
        }

        successCount++;
      } catch (error: any) {
        errorCount++;
        errors.push(
          `Erro ao publicar interação ${message.scheduledInteractionId}: ${error.message}`
        );
        console.error(`Erro ao publicar interação ${message.scheduledInteractionId}:`, error);
      }
    }

    await channel.close();
    await connection.close();

    return new Response(
      JSON.stringify({
        success: true,
        published: successCount,
        errors: errorCount,
        errorDetails: errors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erro em rabbitmq-publish-interactions:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

