import { supabase } from "@/integrations/supabase/client";

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

class RabbitMQService {
  async publishScheduledInteraction(message: ScheduledInteractionMessage): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke("rabbitmq-publish-interaction", {
        body: message,
      });

      if (error) {
        throw new Error(`Erro ao publicar mensagem no RabbitMQ: ${error.message}`);
      }

      if (data && typeof data === "object" && "error" in data) {
        throw new Error((data as any).error || "Erro desconhecido ao publicar mensagem");
      }
    } catch (error: any) {
      console.error("Erro no RabbitMQService:", error);
      throw error;
    }
  }

  async publishMultipleScheduledInteractions(
    messages: ScheduledInteractionMessage[]
  ): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke("rabbitmq-publish-interactions", {
        body: { interactions: messages },
      });

      if (error) {
        throw new Error(`Erro ao publicar mensagens no RabbitMQ: ${error.message}`);
      }

      if (data && typeof data === "object" && "error" in data) {
        throw new Error((data as any).error || "Erro desconhecido ao publicar mensagens");
      }
    } catch (error: any) {
      console.error("Erro no RabbitMQService:", error);
      throw error;
    }
  }
}

export const rabbitMQService = new RabbitMQService();
export type { ScheduledInteractionMessage };

