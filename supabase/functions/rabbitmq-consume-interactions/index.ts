import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  let connection: any = null;
  let channel: any = null;

  try {
    const RABBITMQ_URL = Deno.env.get("RABBITMQ_URL");
    if (!RABBITMQ_URL) {
      throw new Error("RABBITMQ_URL não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials não configuradas");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not configured");
    }

    const amqplib = await import("https://esm.sh/amqplib@0.10.3");
    connection = await amqplib.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    const queueName = "scheduled_interactions_queue";
    await channel.assertQueue(queueName, { durable: true });

    let messageCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const maxMessages = 10;

    while (messageCount < maxMessages) {
      const msg = await channel.get(queueName, { noAck: false });
      if (!msg) {
        break;
      }

      messageCount++;

      try {
        const payload = JSON.parse(msg.content.toString());
        const message: ScheduledInteractionMessage = payload;

        const { data: aiInteraction, error: aiError } = await supabase
          .from("ai_interaction_settings")
          .select("*")
          .eq("id", message.aiInteractionId)
          .single();

        if (aiError || !aiInteraction) {
          throw new Error(`Configuração de IA não encontrada: ${message.aiInteractionId}`);
        }

        const prompt = `Você é um assistente de vendas especializado em ${aiInteraction.conversation_focus}.

OBJETIVO PRINCIPAL: ${aiInteraction.main_objective}

PRIORIDADE DA CONVERSA: ${aiInteraction.priority === "high"
            ? "Alta - Aja com urgência"
            : aiInteraction.priority === "medium"
              ? "Média - Mantenha o equilíbrio"
              : "Baixa - Seja paciente e gradual"
          }

TOM DE VOZ: ${aiInteraction.tone === "professional"
            ? "Profissional e formal"
            : aiInteraction.tone === "friendly"
              ? "Amigável e casual"
              : aiInteraction.tone === "enthusiastic"
                ? "Entusiasmado e motivador"
                : "Direto e objetivo"
          }

ESTRATÉGIA QUANDO O LEAD REJEITAR: ${aiInteraction.rejection_action === "follow_up"
            ? "Agende um follow-up educado para o futuro"
            : aiInteraction.rejection_action === "offer_alternative"
              ? "Ofereça alternativas ou soluções diferentes"
              : aiInteraction.rejection_action === "ask_reason"
                ? "Pergunte educadamente o motivo da rejeição"
                : "Agradeça educadamente e encerre a conversa"
          }

${aiInteraction.closing_instructions ? `COMO FINALIZAR QUANDO NÃO FECHAR:\n${aiInteraction.closing_instructions}` : ""}

${aiInteraction.additional_instructions ? `INSTRUÇÕES ADICIONAIS:\n${aiInteraction.additional_instructions}` : ""}

DIRETRIZES:
- Seja empático e ouça ativamente o lead
- Faça perguntas abertas para entender necessidades
- Apresente soluções baseadas nas necessidades identificadas
- Mantenha a conversa focada no objetivo principal
- Respeite o tempo e as decisões do lead
- Registre informações importantes durante a conversa

Inicie a conversa com o lead ${message.leadName} de forma natural e amigável.`;

        let remoteJid = message.remoteJid;

        if (remoteJid.includes("@")) {
          remoteJid = remoteJid.split("@")[0];
        }

        console.log(`Enviando mensagem para: ${remoteJid}, instância: ${message.instanceName}`);

        const textResponse = await fetch(
          `${EVOLUTION_API_URL}/message/sendText/${message.instanceName}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": EVOLUTION_API_KEY,
            },
            body: JSON.stringify({
              number: remoteJid,
              text: prompt,
            }),
          }
        );

        if (!textResponse.ok) {
          const errorData = await textResponse.text();
          console.error("Erro ao enviar mensagem:", errorData);

          if (textResponse.status === 404) {
            throw new Error("A instância WhatsApp não está mais ativa. Por favor, reconecte no menu WhatsApp.");
          }

          throw new Error(`Falha ao enviar mensagem: ${textResponse.status} - ${errorData}`);
        }

        const textResult = await textResponse.json();
        console.log("Mensagem enviada com sucesso:", textResult);

        await supabase
          .from("scheduled_interactions")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", message.scheduledInteractionId);

        await supabase
          .from("leads")
          .update({
            status: "conversa_iniciada",
            whatsapp_verified: true,
          })
          .eq("id", message.leadId);

        channel.ack(msg);
        successCount++;
      } catch (error: any) {
        console.error(`Erro ao processar mensagem:`, error);

        try {
          const payload = JSON.parse(msg.content.toString());
          const message: ScheduledInteractionMessage = payload;

          await supabase
            .from("scheduled_interactions")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", message.scheduledInteractionId);
        } catch (updateError) {
          console.error("Erro ao atualizar status:", updateError);
        }

        channel.nack(msg, false, false);
        errorCount++;
      }
    }

    if (channel) {
      await channel.close().catch((err: any) => console.error("Erro ao fechar channel:", err));
    }
    if (connection) {
      await connection.close().catch((err: any) => console.error("Erro ao fechar connection:", err));
    }

    if (messageCount === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhuma mensagem para processar", processed: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Processamento concluído",
        processed: messageCount,
        success: successCount,
        errors: errorCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erro em rabbitmq-consume-interactions:", error);

    if (channel) {
      try {
        await channel.close();
      } catch (err) {
        console.error("Erro ao fechar channel no catch:", err);
      }
    }
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Erro ao fechar connection no catch:", err);
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    const errorResponse = {
      error: errorMessage,
      success: false,
      processed: 0,
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

