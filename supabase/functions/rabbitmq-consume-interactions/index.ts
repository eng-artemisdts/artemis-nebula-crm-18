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

    if (!RABBITMQ_URL.startsWith("amqp://") && !RABBITMQ_URL.startsWith("amqps://")) {
      throw new Error(`RABBITMQ_URL inválida. Deve começar com amqp:// ou amqps://. URL recebida: ${RABBITMQ_URL.substring(0, 20)}...`);
    }

    try {
      const urlObj = new URL(RABBITMQ_URL);
      console.log(`URL parseada - Protocolo: ${urlObj.protocol}, Host: ${urlObj.hostname}, Port: ${urlObj.port || (urlObj.protocol === 'amqps:' ? '5671' : '5672')}, VHost: ${urlObj.pathname || '/'}`);
    } catch (urlError) {
      console.warn("Não foi possível fazer parse da URL:", urlError);
    }

    console.log("Conectando ao RabbitMQ...");
    const maskedUrl = RABBITMQ_URL.replace(/:[^:@]+@/, ":****@");
    console.log(`URL mascarada: ${maskedUrl}`);

    const maskedUrlForError = maskedUrl;

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

    console.log("Importando biblioteca amqplib...");
    const amqplib = await import("https://esm.sh/amqplib@0.10.3");
    console.log("Biblioteca importada com sucesso");

    const maxRetries = 2;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`Tentativa ${attempt} de ${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }

        console.log(`Iniciando conexão (tentativa ${attempt}/${maxRetries})...`);

        const connectOptions = {
          heartbeat: 60,
          connection_timeout: 10000,
        };

        console.log("Opções de conexão:", JSON.stringify(connectOptions));

        connection = await Promise.race([
          (async () => {
            try {
              console.log("Chamando amqplib.connect...");
              const conn = await amqplib.connect(RABBITMQ_URL, connectOptions);
              console.log("amqplib.connect retornou");
              return conn;
            } catch (connectErr: any) {
              console.error("Erro dentro de amqplib.connect:", {
                message: connectErr?.message,
                name: connectErr?.name,
                code: connectErr?.code,
                stack: connectErr?.stack?.substring(0, 500),
              });
              throw connectErr;
            }
          })(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout ao conectar ao RabbitMQ (10s)")), 10000)
          )
        ]) as any;

        if (!connection) {
          throw new Error("Falha ao estabelecer conexão com RabbitMQ");
        }

        if (connection.closed) {
          throw new Error("Conexão foi fechada imediatamente após estabelecimento");
        }

        console.log("Conexão com RabbitMQ estabelecida");

        connection.on("error", (err: any) => {
          console.error("Erro na conexão RabbitMQ:", err);
        });

        connection.on("close", () => {
          console.log("Conexão RabbitMQ fechada");
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        if (connection.closed) {
          throw new Error("Conexão foi fechada antes de criar o channel");
        }

        channel = await Promise.race([
          connection.createChannel(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout ao criar channel (5s)")), 5000)
          )
        ]) as any;

        if (!channel) {
          throw new Error("Falha ao criar channel no RabbitMQ");
        }

        console.log("Channel criado com sucesso");

        channel.on("error", (err: any) => {
          console.error("Erro no channel RabbitMQ:", err);
        });

        channel.on("close", () => {
          console.log("Channel RabbitMQ fechado");
        });

        break;
      } catch (connectError: any) {
        lastError = connectError;
        const errorMsg = connectError?.message || String(connectError);
        const errorName = connectError?.name || "UnknownError";
        const errorCode = connectError?.code || "NO_CODE";

        console.error(`Erro na tentativa ${attempt}:`, {
          name: errorName,
          message: errorMsg,
          code: errorCode,
          stack: connectError?.stack?.substring(0, 1000),
        });

        if (connection) {
          try {
            await connection.close().catch(() => { });
          } catch (e) {
            // Ignora erros ao fechar conexão falha
          }
          connection = null;
        }

        if (attempt === maxRetries) {
          const isConnectionCloseError =
            errorMsg.includes("ConnectionClose") ||
            errorMsg.includes("Expected ConnectionOpenOk") ||
            errorName === "ConnectionCloseError" ||
            errorCode === "ECONNREFUSED" ||
            errorCode === "ENOTFOUND";

          if (isConnectionCloseError) {
            const urlObj = new URL(RABBITMQ_URL);
            const vhost = urlObj.pathname || '/';

            throw new Error(
              `RabbitMQ rejeitou a conexão após ${maxRetries} tentativas.\n` +
              `Detalhes do erro:\n` +
              `- Tipo: ${errorName}\n` +
              `- Código: ${errorCode}\n` +
              `- Mensagem: ${errorMsg}\n\n` +
              `Possíveis causas:\n` +
              `1. Credenciais inválidas (usuário/senha na URL)\n` +
              `2. Vhost "${vhost}" não existe ou sem permissões\n` +
              `3. Servidor RabbitMQ indisponível (${urlObj.hostname})\n` +
              `4. Firewall bloqueando conexão na porta ${urlObj.port || (urlObj.protocol === 'amqps:' ? '5671' : '5672')}\n` +
              `5. URL malformada ou protocolo incorreto\n\n` +
              `Verifique:\n` +
              `- Se a URL está correta: ${maskedUrlForError}\n` +
              `- Se o vhost existe e tem permissões\n` +
              `- Se as credenciais estão corretas\n` +
              `- Se o servidor RabbitMQ está acessível`
            );
          }

          if (errorMsg.includes("Timeout")) {
            throw new Error(
              `Timeout ao conectar ao RabbitMQ após ${maxRetries} tentativas. ` +
              `O servidor pode estar lento, inacessível ou sobrecarregado. ` +
              `Erro: ${errorMsg}`
            );
          }

          throw new Error(
            `Erro ao conectar ao RabbitMQ após ${maxRetries} tentativas: ${errorMsg}`
          );
        }
      }
    }

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
            status: "conversation_started",
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
      try {
        if (!channel.closed) {
          await channel.close();
          console.log("Channel fechado com sucesso");
        }
      } catch (err: any) {
        console.error("Erro ao fechar channel:", err);
      }
    }
    if (connection) {
      try {
        if (!connection.closed) {
          await connection.close();
          console.log("Conexão fechada com sucesso");
        }
      } catch (err: any) {
        console.error("Erro ao fechar connection:", err);
      }
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

    const errorDetails: any = {
      message: error instanceof Error ? error.message : "Erro desconhecido",
      stack: error instanceof Error ? error.stack : undefined,
    };

    if (channel) {
      try {
        if (!channel.closed) {
          await channel.close();
        }
      } catch (err: any) {
        console.error("Erro ao fechar channel no catch:", err);
        errorDetails.channelCloseError = err?.message || String(err);
      }
    }
    if (connection) {
      try {
        if (!connection.closed) {
          await connection.close();
        }
      } catch (err: any) {
        console.error("Erro ao fechar connection no catch:", err);
        errorDetails.connectionCloseError = err?.message || String(err);
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

    let finalErrorMessage = errorMessage;

    if (errorMessage.includes("ConnectionClose") || errorMessage.includes("Expected ConnectionOpenOk")) {
      finalErrorMessage = `RabbitMQ rejeitou a conexão. Possíveis causas: URL incorreta, credenciais inválidas, servidor inacessível ou firewall bloqueando. Detalhes: ${errorMessage}`;
    } else if (errorMessage.includes("Timeout")) {
      finalErrorMessage = `Timeout ao conectar ao RabbitMQ. O servidor pode estar lento ou inacessível. Detalhes: ${errorMessage}`;
    }

    const errorResponse = {
      error: finalErrorMessage,
      success: false,
      processed: 0,
      details: Deno.env.get("DENO_ENV") === "development" ? errorDetails : undefined,
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

