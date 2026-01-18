import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, Clock, DollarSign, MessageCircle, RefreshCw, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { formatWhatsAppNumber, formatPhoneDisplay, cleanPhoneNumber } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessagePreviewDialog } from "@/components/MessagePreviewDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export const LeadTableView = ({
  leads,
  selectedIds,
  isSelectionMode,
  onToggleSelection,
  onSelectAll,
  onLeadUpdate
}: {
  leads: Lead[];
  selectedIds: string[];
  isSelectionMode: boolean;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onLeadUpdate?: (updatedLead: Lead) => void;
}) => {
  const allSelected = leads.length > 0 && selectedIds.length === leads.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < leads.length;

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-card">
          <TableRow>
            {isSelectionMode && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
            )}
            <TableHead>Nome</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <LeadTableRow
              key={lead.id}
              lead={lead}
              isSelected={selectedIds.includes(lead.id)}
              isSelectionMode={isSelectionMode}
              onToggleSelection={onToggleSelection}
              onLeadUpdate={onLeadUpdate}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const LeadTableRow = ({
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

  const handleShowPreview = async () => {
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

  const handleValidateWhatsApp = async () => {
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
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted' : ''}`}
      onClick={() => {
        if (!isSelectionMode) {
          navigate(`/lead/${lead.id}`);
        }
      }}
    >
      {isSelectionMode && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(lead.id)}
          />
        </TableCell>
      )}
      <TableCell>
        <div>
          <div className="font-medium">{lead.name}</div>
          {lead.description && (
            <div className="text-sm text-muted-foreground truncate max-w-[300px]">
              {lead.description}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={lead.status as any} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {lead.category && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-secondary">
              {lead.category}
            </span>
          )}
          {lead.source && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-muted">
              {lead.source}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {lead.contact_email && (
            <a
              href={`mailto:${lead.contact_email}`}
              className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{lead.contact_email}</span>
            </a>
          )}
          {lead.contact_whatsapp && (
            <a
              href={`https://wa.me/${formatWhatsAppNumber(lead.contact_whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-3 h-3" />
              <span>{formatPhoneDisplay(lead.contact_whatsapp)}</span>
            </a>
          )}
        </div>
      </TableCell>
      <TableCell>
        {lead.payment_amount ? (
          <div className="flex items-center gap-1 text-accent font-medium">
            <DollarSign className="w-3.5 h-3.5" />
            <span>
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              }).format(lead.payment_amount)}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
        </div>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/lead/${lead.id}`)}>
              Ver Detalhes
            </DropdownMenuItem>
            {needsWhatsAppValidation && (
              <DropdownMenuItem onClick={handleValidateWhatsApp} disabled={isValidatingWhatsApp}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isValidatingWhatsApp ? "animate-spin" : ""}`} />
                Validar WhatsApp
              </DropdownMenuItem>
            )}
            {canStartConversation && (
              <DropdownMenuItem onClick={handleShowPreview} disabled={isStartingConversation}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Iniciar Conversa
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

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
    </TableRow>
  );
};
