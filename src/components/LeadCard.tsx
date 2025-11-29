import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Clock, DollarSign, CheckCircle, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { formatWhatsAppNumber, formatPhoneDisplay } from "@/lib/utils";
import { MessagePreviewDialog } from "@/components/MessagePreviewDialog";

type Lead = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  contact_email: string | null;
  contact_whatsapp: string | null;
  source: string | null;
  integration_start_time: string | null;
  payment_link_url: string | null;
  payment_status: string;
  payment_amount: number | null;
  paid_at: string | null;
  created_at: string;
  remote_jid: string | null;
};

export const LeadCard = ({ 
  lead, 
  isDraggable = false 
}: { 
  lead: Lead;
  isDraggable?: boolean;
}) => {
  const navigate = useNavigate();
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | undefined>();
  const [previewSettings, setPreviewSettings] = useState<any>(null);
  const [previewInstanceName, setPreviewInstanceName] = useState<string | null>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: lead.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleShowPreview = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      if (!lead.contact_whatsapp) {
        toast.error("Lead não possui WhatsApp");
        return;
      }

      // Busca as configurações do webhook e mensagem padrão
      const { data: settings } = await supabase
        .from("settings")
        .select("n8n_webhook_url, default_message, default_image_url")
        .maybeSingle();

      // Busca a instância do WhatsApp da organização
      const { data: whatsappInstance } = await supabase
        .from("whatsapp_instances")
        .select("instance_name")
        .eq("status", "connected")
        .maybeSingle();

      if (!whatsappInstance?.instance_name) {
        toast.error("Nenhuma instância WhatsApp conectada. Configure em WhatsApp > Conectar", {
          duration: 5000,
          action: {
            label: "Configurar",
            onClick: () => {
              window.location.href = "/whatsapp";
            },
          },
        });
        return;
      }

      // Usa mensagem e imagem configuradas ou fallback para as padrões
      const message = settings?.default_message || `👋 Oi! Tudo bem?
Aqui é a equipe da Artemis Digital Solutions e temos uma oferta especial de Black Friday para impulsionar suas vendas e organizar seu atendimento nesse período de alta demanda.

🤖 O que é um chatbot?

É um assistente virtual que responde automaticamente seus clientes 24h por dia, mesmo quando você está ocupado, offline ou atendendo outras pessoas.
Ele responde dúvidas, coleta informações, organiza pedidos e direciona atendimentos — tudo sem você precisar tocar no celular.

🚀 Vantagens para o seu negócio

✔ Atendimento 24h
Nunca mais perca vendas por falta de resposta.

✔ Respostas instantâneas ⚡
Informações rápidas sobre preços, horários, serviços, catálogo, agenda e muito mais.

✔ Adeus acúmulo de mensagens 📥
O chatbot filtra, organiza e prioriza atendimentos.

✔ Mais profissionalismo 💼
Seu negócio transmite agilidade, organização e confiança.

✔ Perfeito para a Black Friday 🖤
Ele absorve o alto volume de mensagens e evita gargalos no atendimento.

✔ Captura e organiza leads 🔥
Coleta nome, WhatsApp, interesse e entrega tudo prontinho para você.

Se quiser saber mais, é só acessar:
🌐 www.artemisdigital.tech`;

      const imageUrl = settings?.default_image_url && settings.default_image_url.startsWith('http')
        ? settings.default_image_url
        : undefined;

      // Armazena dados para uso posterior na confirmação
      setPreviewMessage(message);
      setPreviewImageUrl(imageUrl);
      setPreviewSettings(settings);
      setPreviewInstanceName(whatsappInstance.instance_name);
      setShowPreview(true);
    } catch (error: any) {
      toast.error("Erro ao carregar preview da mensagem");
      console.error(error);
    }
  };

  const handleConfirmSend = async () => {
    setIsStartingConversation(true);
    setShowPreview(false);

    try {
      if (!lead.contact_whatsapp || !previewInstanceName) {
        toast.error("Dados insuficientes para enviar mensagem");
        return;
      }

      if (!lead.remote_jid) {
        toast.error("Lead não possui remoteJid válido. Por favor, recrie o lead.");
        return;
      }

      // Atualiza o status do lead e marca WhatsApp como verificado
      const { error: updateError } = await supabase
        .from("leads")
        .update({ 
          status: "conversa_iniciada",
          whatsapp_verified: true
        })
        .eq("id", lead.id);

      if (updateError) throw updateError;

      const remoteJid = lead.remote_jid;
      
      const { error: sendError } = await supabase.functions.invoke("evolution-send-message", {
        body: {
          instanceName: previewInstanceName,
          remoteJid,
          message: previewMessage,
          imageUrl: previewImageUrl
        }
      });

      if (sendError) {
        console.error("Erro ao enviar mensagem:", sendError);
        const errorMessage = sendError.message || "Erro ao enviar mensagem";
        toast.error(errorMessage);
        return;
      }

      // Se há webhook configurado, envia os dados
      if (previewSettings?.n8n_webhook_url) {
        try {
          await fetch(previewSettings.n8n_webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadId: lead.id,
              name: lead.name,
              email: lead.contact_email,
              whatsapp: lead.contact_whatsapp,
              category: lead.category,
              description: lead.description,
              action: "start_conversation"
            })
          });
        } catch (webhookError) {
          console.error("Erro ao enviar webhook:", webhookError);
        }
      }

      toast.success("Conversa iniciada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao iniciar conversa");
      console.error(error);
    } finally {
      setIsStartingConversation(false);
    }
  };

  const canStartConversation = lead.status === "novo" && (lead.contact_whatsapp || lead.contact_email);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 group"
      onClick={(e) => {
        if (!isDragging) {
          navigate(`/lead/${lead.id}`);
        }
      }}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
            {lead.name}
          </h3>
          <StatusBadge status={lead.status as any} />
        </div>

        {lead.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{lead.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {lead.category && (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-xs font-medium">
              {lead.category}
            </span>
          )}
          {lead.source && (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs">
              {lead.source}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {lead.contact_email && (
            <a
              href={`mailto:${lead.contact_email}`}
              className="flex items-center gap-1 hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">{lead.contact_email}</span>
            </a>
          )}
          {lead.contact_whatsapp && (
            <a
              href={`https://wa.me/${formatWhatsAppNumber(lead.contact_whatsapp)}?text=${encodeURIComponent(`Olá ${lead.name}! Tudo bem?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">{formatPhoneDisplay(lead.contact_whatsapp)}</span>
            </a>
          )}
        </div>

        {lead.payment_amount && (
          <div className="flex items-center justify-between p-2 bg-accent/10 rounded-md">
            <span className="text-sm font-medium">Valor da Proposta:</span>
            <span className="text-lg font-bold text-accent">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(lead.payment_amount)}
            </span>
          </div>
        )}

        {lead.status === "pago" && lead.paid_at && (
          <div className="flex items-center gap-2 p-2 bg-status-pago/10 rounded-md">
            <CheckCircle className="w-4 h-4 text-status-pago" />
            <span className="text-xs text-status-pago">
              Pago em {format(new Date(lead.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        )}

        {canStartConversation && (
          <>
            <Button
              onClick={handleShowPreview}
              disabled={isStartingConversation}
              className="w-full gap-2"
              size="sm"
            >
              <MessageCircle className="w-4 h-4" />
              Iniciar Conversa
            </Button>
            <MessagePreviewDialog
              open={showPreview}
              onOpenChange={setShowPreview}
              onConfirm={handleConfirmSend}
              message={previewMessage}
              imageUrl={previewImageUrl}
              leadName={lead.name}
              isLoading={isStartingConversation}
            />
          </>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
          </div>
          {lead.payment_status !== "nao_criado" && (
            <div className="flex items-center gap-1 text-accent">
              <DollarSign className="w-3 h-3" />
              <span className="capitalize">{lead.payment_status.replace("_", " ")}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
