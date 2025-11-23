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

// Função para formatar número do WhatsApp com código do país
const formatWhatsAppNumber = (phone: string): string => {
  // Remove todos os caracteres não numéricos
  const cleanNumber = phone.replace(/\D/g, "");
  
  // Se o número já começa com 55 (Brasil), retorna como está
  if (cleanNumber.startsWith("55")) {
    return cleanNumber;
  }
  
  // Se o número tem 11 dígitos (celular BR) ou 10 dígitos (fixo BR), adiciona 55
  if (cleanNumber.length === 11 || cleanNumber.length === 10) {
    return `55${cleanNumber}`;
  }
  
  // Se o número já tem código de país (mais de 11 dígitos), retorna como está
  if (cleanNumber.length > 11) {
    return cleanNumber;
  }
  
  // Caso padrão: adiciona 55
  return `55${cleanNumber}`;
};

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

  const handleStartConversation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStartingConversation(true);

    try {
      // Busca as configurações do webhook
      const { data: settings } = await supabase
        .from("settings")
        .select("n8n_webhook_url")
        .maybeSingle();

      // Atualiza o status do lead e marca WhatsApp como verificado
      const { error: updateError } = await supabase
        .from("leads")
        .update({ 
          status: "conversa_iniciada",
          whatsapp_verified: true
        })
        .eq("id", lead.id);

      if (updateError) throw updateError;

      // Se há webhook configurado, envia os dados
      if (settings?.n8n_webhook_url) {
        try {
          await fetch(settings.n8n_webhook_url, {
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
          // Não falha a operação se o webhook falhar
        }
      }

      toast.success("Conversa iniciada! Atualize a página para ver as mudanças.");
      
      // Abre o WhatsApp se houver número
      if (lead.contact_whatsapp) {
        const message = encodeURIComponent(`Olá ${lead.name}! Tudo bem?`);
        const phoneNumber = formatWhatsAppNumber(lead.contact_whatsapp);
        window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
      }
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
              <span className="hidden sm:inline">{lead.contact_whatsapp}</span>
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
          <Button
            onClick={handleStartConversation}
            disabled={isStartingConversation}
            className="w-full gap-2"
            size="sm"
          >
            <MessageCircle className="w-4 h-4" />
            {isStartingConversation ? "Iniciando..." : "Iniciar Conversa"}
          </Button>
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
