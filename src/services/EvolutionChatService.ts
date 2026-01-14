import { supabase } from "@/integrations/supabase/client";

export type ChatThread = {
  id: string;
  remoteJid: string;
  name: string;
  lastMessage: string;
  lastMessageAt: number;
  unreadCount: number;
  instanceName: string;
  phone?: string;
  leadId?: string | null;
  leadName?: string | null;
};

export type ChatMessage = {
  id: string;
  content: string;
  fromMe: boolean;
  timestamp: number;
  type: string;
  instanceName: string;
  remoteJid: string;
};

class EvolutionChatService {
  async listChats(instanceName?: string): Promise<ChatThread[]> {
    const { data, error } = await supabase.functions.invoke("evolution-list-chats", {
      body: { instanceName },
    });

    if (error) {
      throw new Error(error.message || "Erro ao buscar chats");
    }

    return data?.chats || [];
  }

  async getMessages(remoteJid: string, instanceName: string, limit = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabase.functions.invoke("evolution-chat-messages", {
      body: { remoteJid, instanceName, limit },
    });

    if (error) {
      throw new Error(error.message || "Erro ao buscar mensagens");
    }

    return data?.messages || [];
  }

  async sendMessage(params: {
    instanceName: string;
    remoteJid: string;
    message: string;
    imageUrl?: string;
  }): Promise<void> {
    const { error } = await supabase.functions.invoke("evolution-send-message", {
      body: {
        instanceName: params.instanceName,
        remoteJid: params.remoteJid,
        message: params.message,
        imageUrl: params.imageUrl,
      },
    });

    if (error) {
      throw new Error(error.message || "Erro ao enviar mensagem");
    }
  }

  async sendMedia(params: {
    instanceName: string;
    remoteJid: string;
    mediaUrl: string;
    mediaType: "image" | "video" | "document";
    message?: string;
  }): Promise<void> {
    const { error } = await supabase.functions.invoke("evolution-send-media", {
      body: {
        instanceName: params.instanceName,
        remoteJid: params.remoteJid,
        mediaUrl: params.mediaUrl,
        mediaType: params.mediaType,
        message: params.message,
      },
    });

    if (error) {
      throw new Error(error.message || "Erro ao enviar mídia");
    }
  }
}

export const evolutionChatService = new EvolutionChatService();

