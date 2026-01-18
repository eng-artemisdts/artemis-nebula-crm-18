import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, Clock, DollarSign, MessageCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { formatWhatsAppNumber, formatPhoneDisplay, cleanPhoneNumber } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  payment_status: string;
  payment_amount: number | null;
  created_at: string;
  remote_jid: string | null;
  whatsapp_verified?: boolean;
};

export const LeadListView = ({
  leads,
  selectedIds,
  isSelectionMode,
  onToggleSelection,
  onLeadUpdate
}: {
  leads: Lead[];
  selectedIds: string[];
  isSelectionMode: boolean;
  onToggleSelection: (id: string) => void;
  onLeadUpdate?: (updatedLead: Lead) => void;
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <LeadListItem
          key={lead.id}
          lead={lead}
          isSelected={selectedIds.includes(lead.id)}
          isSelectionMode={isSelectionMode}
          onToggleSelection={onToggleSelection}
          onLeadUpdate={onLeadUpdate}
        />
      ))}
    </div>
  );
};

const LeadListItem = ({
  lead,
  isSelected,
  isSelectionMode,
  onToggleSelection,
  onLeadUpdate
}: {
  lead: Lead;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelection: (id: string) => void;
  onLeadUpdate?: (updatedLead: Lead) => void;
}) => {
  const navigate = useNavigate();
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | undefined>();
  const [previewSettings, setPreviewSettings] = useState<any>(null);
  const [previewInstanceName, setPreviewInstanceName] = useState<string | null>(null);
  const [availableInstances, setAvailableInstances] = useState<any[]>([]);
  const [isValidatingWhatsApp, setIsValidatingWhatsApp] = useState(false);

  const canStartConversation = lead.status === "novo" && (lead.contact_whatsapp || lead.contact_email);
  const needsWhatsAppValidation = lead.contact_whatsapp && (!lead.remote_jid || !lead.whatsapp_verified);

  const handleShowPreview = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      if (!lead.contact_whatsapp) {
        toast.error("Lead não possui WhatsApp");
        return;
      }

      const { data: settings } = await supabase
        .from("settings")
        .select("n8n_webhook_url, default_message, default_image_url")
        .maybeSingle();

      const { data: whatsappInstances, error: instancesError } = await supabase
        .from("whatsapp_instances")
        .select("id, instance_name, phone_number, status")
        .eq("status", "connected")
        .order("created_at", { ascending: false });

      if (instancesError) {
        throw instancesError;
      }

      if (!whatsappInstances || whatsappInstances.length === 0) {
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

      setAvailableInstances(whatsappInstances);
      const message = settings?.default_message || "Olá! Tudo bem?";
      const imageUrl = settings?.default_image_url && settings.default_image_url.startsWith('http')
        ? settings.default_image_url
        : undefined;

      setPreviewMessage(message);
      setPreviewImageUrl(imageUrl);
      setPreviewSettings(settings);
      setPreviewInstanceName(whatsappInstances.length === 1 ? whatsappInstances[0].instance_name : null);
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
        setIsStartingConversation(false);
        return;
      }

      if (!lead.remote_jid) {
        toast.error("Lead não possui remoteJid válido. Por favor, recrie o lead.");
        setIsStartingConversation(false);
        return;
      }

      const { data: sendData, error: sendError } = await supabase.functions.invoke("evolution-send-message", {
        body: {
          instanceName: previewInstanceName,
          remoteJid: lead.remote_jid,
          message: previewMessage,
          imageUrl: previewImageUrl
        }
      });

      if (sendError || (sendData && typeof sendData === 'object' && 'error' in sendData)) {
        const errorMessage = sendError?.message || (sendData as any).error || "Erro ao enviar mensagem";
        toast.error(errorMessage);
        setIsStartingConversation(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("leads")
        .update({
          status: "conversa_iniciada",
          whatsapp_verified: true
        })
        .eq("id", lead.id);

      if (updateError) {
        toast.error("Mensagem enviada, mas houve erro ao atualizar o status do lead");
        setIsStartingConversation(false);
        return;
      }

      const updatedLead = { ...lead, status: "conversa_iniciada", whatsapp_verified: true };
      if (onLeadUpdate) {
        onLeadUpdate(updatedLead);
      }

      toast.success("Conversa iniciada com sucesso!");
    } catch (error: any) {
      toast.error(error?.message || "Erro ao iniciar conversa");
    } finally {
      setIsStartingConversation(false);
    }
  };

  const handleValidateWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!lead.contact_whatsapp) {
      toast.error("Lead não possui número de WhatsApp");
      return;
    }

    setIsValidatingWhatsApp(true);

    try {
      const cleanedPhone = cleanPhoneNumber(lead.contact_whatsapp);
      const { data: checkData, error: checkError } = await supabase.functions.invoke('evolution-check-whatsapp', {
        body: { numbers: [cleanedPhone] }
      });

      if (checkError) {
        if (checkError.message?.includes("No connected WhatsApp instance")) {
          toast.error("Nenhuma instância WhatsApp conectada. Configure em WhatsApp > Conectar", {
            duration: 5000,
            action: {
              label: "Configurar",
              onClick: () => navigate("/whatsapp"),
            },
          });
          setIsValidatingWhatsApp(false);
          return;
        }
        toast.error("Erro ao validar WhatsApp: " + (checkError.message || "Erro desconhecido"));
        setIsValidatingWhatsApp(false);
        return;
      }

      if (checkData?.results?.[0]?.exists && checkData.results[0].jid) {
        const remoteJid = checkData.results[0].jid;

        const { error: updateError } = await supabase
          .from("leads")
          .update({
            remote_jid: remoteJid,
            whatsapp_verified: true
          })
          .eq("id", lead.id);

        if (updateError) {
          toast.error("Erro ao atualizar lead");
          setIsValidatingWhatsApp(false);
          return;
        }

        const updatedLead = { ...lead, remote_jid: remoteJid, whatsapp_verified: true };
        if (onLeadUpdate) {
          onLeadUpdate(updatedLead);
        }

        toast.success("WhatsApp validado com sucesso! ✅");
      } else {
        toast.warning("Este número não está registrado no WhatsApp.");
      }
    } catch (error: any) {
      toast.error("Erro ao validar WhatsApp: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsValidatingWhatsApp(false);
    }
  };

  return (
    <Card
      className={`p-4 cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={(e) => {
        if (isSelectionMode) {
          onToggleSelection(lead.id);
        } else {
          navigate(`/lead/${lead.id}`);
        }
      }}
    >
      <div className="flex items-start gap-4">
        {isSelectionMode && (
          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(lead.id)}
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                {lead.name}
              </h3>
              {lead.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1 truncate">
                  {lead.description}
                </p>
              )}
            </div>
            <StatusBadge status={lead.status as any} />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
            {lead.category && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-xs font-medium">
                {lead.category}
              </span>
            )}
            {lead.source && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs">
                {lead.source}
              </span>
            )}
            {lead.contact_email && (
              <a
                href={`mailto:${lead.contact_email}`}
                className="flex items-center gap-1 hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate max-w-[200px]">{lead.contact_email}</span>
              </a>
            )}
            {lead.contact_whatsapp && (
              <a
                href={`https://wa.me/${formatWhatsAppNumber(lead.contact_whatsapp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{formatPhoneDisplay(lead.contact_whatsapp)}</span>
              </a>
            )}
            {lead.payment_amount && (
              <div className="flex items-center gap-1 text-accent font-medium">
                <DollarSign className="w-3.5 h-3.5" />
                <span>
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(lead.payment_amount)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {needsWhatsAppValidation && (
              <Button
                onClick={handleValidateWhatsApp}
                disabled={isValidatingWhatsApp}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-amber-500/50 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isValidatingWhatsApp ? "animate-spin" : ""}`} />
                {isValidatingWhatsApp ? "Validando..." : "Validar WhatsApp"}
              </Button>
            )}
            {canStartConversation && (
              <Button
                onClick={handleShowPreview}
                disabled={isStartingConversation}
                size="sm"
                className="h-8 text-xs gap-1"
              >
                <MessageCircle className="w-3 h-3" />
                Iniciar Conversa
              </Button>
            )}
          </div>
        </div>
      </div>

      <MessagePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        onConfirm={handleConfirmSend}
        message={previewMessage}
        imageUrl={previewImageUrl}
        leadName={lead.name}
        isLoading={isStartingConversation}
        instances={availableInstances}
        selectedInstanceName={previewInstanceName}
        onInstanceChange={setPreviewInstanceName}
      />
    </Card>
  );
};
