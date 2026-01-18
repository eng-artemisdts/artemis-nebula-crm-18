import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mail,
  Phone,
  Clock,
  DollarSign,
  MessageCircle,
  RefreshCw,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { format, isToday, isYesterday, isThisWeek, isThisMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { formatWhatsAppNumber, formatPhoneDisplay, cleanPhoneNumber } from "@/lib/utils";
import { useState, useMemo } from "react";
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

type GroupedLeads = {
  label: string;
  date: string;
  leads: Lead[];
  icon: React.ReactNode;
  color: string;
};

export const LeadTimelineView = ({
  leads,
  selectedIds,
  isSelectionMode,
  onToggleSelection,
  onLeadUpdate,
}: {
  leads: Lead[];
  selectedIds: string[];
  isSelectionMode: boolean;
  onToggleSelection: (id: string) => void;
  onLeadUpdate?: (updatedLead: Lead) => void;
}) => {
  const stats = useMemo(() => {
    const total = leads.length;
    const novos = leads.filter((l) => l.status === "novo").length;
    const conversas = leads.filter((l) => l.status === "conversa_iniciada").length;
    const pagos = leads.filter((l) => l.status === "pago").length;
    const totalValue = leads.reduce((sum, l) => sum + (l.payment_amount || 0), 0);
    const whatsappValidated = leads.filter((l) => l.whatsapp_verified).length;

    return { total, novos, conversas, pagos, totalValue, whatsappValidated };
  }, [leads]);

  const groupedLeads = useMemo(() => {
    const groups: GroupedLeads[] = [];
    const now = new Date();

    const todayLeads: Lead[] = [];
    const yesterdayLeads: Lead[] = [];
    const thisWeekLeads: Lead[] = [];
    const thisMonthLeads: Lead[] = [];
    const olderLeads: Lead[] = [];

    leads.forEach((lead) => {
      const leadDate = new Date(lead.created_at);
      if (isToday(leadDate)) {
        todayLeads.push(lead);
      } else if (isYesterday(leadDate)) {
        yesterdayLeads.push(lead);
      } else if (isThisWeek(leadDate)) {
        thisWeekLeads.push(lead);
      } else if (isThisMonth(leadDate)) {
        thisMonthLeads.push(lead);
      } else {
        olderLeads.push(lead);
      }
    });

    if (todayLeads.length > 0) {
      groups.push({
        label: "Hoje",
        date: format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
        leads: todayLeads.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        icon: <Zap className="w-4 h-4" />,
        color: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
      });
    }

    if (yesterdayLeads.length > 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      groups.push({
        label: "Ontem",
        date: format(yesterday, "dd/MM/yyyy", { locale: ptBR }),
        leads: yesterdayLeads.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        icon: <Clock className="w-4 h-4" />,
        color: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400",
      });
    }

    if (thisWeekLeads.length > 0) {
      groups.push({
        label: "Esta Semana",
        date: format(new Date(), "dd 'de' MMMM", { locale: ptBR }),
        leads: thisWeekLeads.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        icon: <Calendar className="w-4 h-4" />,
        color: "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400",
      });
    }

    if (thisMonthLeads.length > 0) {
      groups.push({
        label: "Este Mês",
        date: format(new Date(), "MMMM 'de' yyyy", { locale: ptBR }),
        leads: thisMonthLeads.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        icon: <TrendingUp className="w-4 h-4" />,
        color: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400",
      });
    }

    if (olderLeads.length > 0) {
      const olderGroups = olderLeads.reduce((acc, lead) => {
        const date = format(new Date(lead.created_at), "MMMM 'de' yyyy", { locale: ptBR });
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(lead);
        return acc;
      }, {} as Record<string, Lead[]>);

      Object.entries(olderGroups)
        .sort((a, b) => {
          const dateA = new Date(a[1][0].created_at);
          const dateB = new Date(b[1][0].created_at);
          return dateB.getTime() - dateA.getTime();
        })
        .forEach(([date, groupLeads]) => {
          groups.push({
            label: date,
            date: date,
            leads: groupLeads.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
            icon: <Calendar className="w-4 h-4" />,
            color: "text-muted-foreground bg-muted",
          });
        });
    }

    return groups;
  }, [leads]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-blue-500 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Novos</p>
                <p className="text-2xl font-bold mt-1">{stats.novos}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Conversa</p>
                <p className="text-2xl font-bold mt-1">{stats.conversas}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold mt-1">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  }).format(stats.totalValue)}
                </p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-full">
                <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        {groupedLeads.length > 0 ? (
          groupedLeads.map((group, groupIndex) => (
            <div key={group.label} className="relative">
              <div className="sticky top-0 z-10 bg-card/98 backdrop-blur-sm border-b border-border pb-4 mb-4 pt-3 -mx-1 px-1">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-md border-2 transition-all hover:shadow-lg ${group.color} border-current/30`}
                  >
                    <div className="flex-shrink-0 opacity-90">{group.icon}</div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm tracking-tight">{group.label}</span>
                      <Badge
                        variant="secondary"
                        className="text-xs font-bold px-2.5 py-0.5 h-5.5 bg-background/60 border border-border/60 shadow-sm"
                      >
                        {group.leads.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-border via-border/30 to-transparent rounded-full"></div>
                </div>
              </div>
              <div className="space-y-3 relative pl-8">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/30"></div>
                {group.leads.map((lead, leadIndex) => (
                  <LeadTimelineItem
                    key={lead.id}
                    lead={lead}
                    isSelected={selectedIds.includes(lead.id)}
                    isSelectionMode={isSelectionMode}
                    onToggleSelection={onToggleSelection}
                    onLeadUpdate={onLeadUpdate}
                    isLast={leadIndex === group.leads.length - 1}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <Card className="p-12 text-center bg-card">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum lead encontrado</p>
          </Card>
        )}
      </div>
    </div>
  );
};

const LeadTimelineItem = ({
  lead,
  isSelected,
  isSelectionMode,
  onToggleSelection,
  onLeadUpdate,
  isLast,
}: {
  lead: Lead;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelection: (id: string) => void;
  onLeadUpdate?: (updatedLead: Lead) => void;
  isLast?: boolean;
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
  const hasPayment = lead.payment_amount && lead.payment_amount > 0;

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
      const imageUrl =
        settings?.default_image_url && settings.default_image_url.startsWith("http")
          ? settings.default_image_url
          : undefined;

      setPreviewMessage(message);
      setPreviewImageUrl(imageUrl);
      setPreviewSettings(settings);
      setPreviewInstanceName(
        whatsappInstances.length === 1 ? whatsappInstances[0].instance_name : null
      );
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

      const { data: sendData, error: sendError } = await supabase.functions.invoke(
        "evolution-send-message",
        {
          body: {
            instanceName: previewInstanceName,
            remoteJid: lead.remote_jid,
            message: previewMessage,
            imageUrl: previewImageUrl,
          },
        }
      );

      if (sendError || (sendData && typeof sendData === "object" && "error" in sendData)) {
        const errorMessage =
          sendError?.message || (sendData as any).error || "Erro ao enviar mensagem";
        toast.error(errorMessage);
        setIsStartingConversation(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("leads")
        .update({
          status: "conversa_iniciada",
          whatsapp_verified: true,
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
      const { data: checkData, error: checkError } = await supabase.functions.invoke(
        "evolution-check-whatsapp",
        {
          body: { numbers: [cleanedPhone] },
        }
      );

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
            whatsapp_verified: true,
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

  const time = format(new Date(lead.created_at), "HH:mm", { locale: ptBR });
  const date = format(new Date(lead.created_at), "dd/MM", { locale: ptBR });
  const fullDate = format(new Date(lead.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
    locale: ptBR,
  });

  return (
    <div className="relative">
      <div className="absolute -left-10 top-2">
        <div className="relative">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-4 h-4 rounded-full bg-primary border-4 border-background shadow-lg cursor-pointer hover:scale-110 transition-transform"></div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="font-medium">{fullDate}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {!isLast && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-primary/40 to-transparent"></div>
          )}
        </div>
      </div>

      <Card
        className={`ml-4 cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group relative bg-card ${
          isSelected ? "ring-2 ring-primary border-primary" : ""
        }`}
        onClick={(e) => {
          if (isSelectionMode) {
            onToggleSelection(lead.id);
          } else {
            navigate(`/lead/${lead.id}`);
          }
        }}
      >
        <div className="p-4 relative">
          {isSelectionMode && (
            <div className="absolute top-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelection(lead.id)} />
            </div>
          )}

          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                  {lead.name}
                </h3>
                <StatusBadge status={lead.status as any} />
              </div>
              {lead.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {lead.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {date} às {time}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {lead.category && (
              <Badge variant="secondary" className="text-xs">
                {lead.category}
              </Badge>
            )}
            {lead.source && (
              <Badge variant="outline" className="text-xs">
                {lead.source}
              </Badge>
            )}
            {hasPayment && (
              <Badge
                variant="outline"
                className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-400"
              >
                <DollarSign className="w-3 h-3 mr-1" />
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                }).format(lead.payment_amount || 0)}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
            {lead.contact_email && (
              <a
                href={`mailto:${lead.contact_email}`}
                className="flex items-center gap-1.5 hover:text-primary transition-colors text-muted-foreground hover:bg-muted px-2 py-1 rounded-md"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="w-4 h-4" />
                <span className="truncate max-w-[200px]">{lead.contact_email}</span>
              </a>
            )}
            {lead.contact_whatsapp && (
              <a
                href={`https://wa.me/${formatWhatsAppNumber(lead.contact_whatsapp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-primary transition-colors text-muted-foreground hover:bg-muted px-2 py-1 rounded-md"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="w-4 h-4" />
                <span>{formatPhoneDisplay(lead.contact_whatsapp)}</span>
                {lead.whatsapp_verified && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                )}
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border">
            {needsWhatsAppValidation && (
              <Button
                onClick={handleValidateWhatsApp}
                disabled={isValidatingWhatsApp}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-amber-500/50 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1.5 ${isValidatingWhatsApp ? "animate-spin" : ""}`}
                />
                {isValidatingWhatsApp ? "Validando..." : "Validar WhatsApp"}
              </Button>
            )}
            {canStartConversation && (
              <Button
                onClick={handleShowPreview}
                disabled={isStartingConversation}
                size="sm"
                className="h-8 text-xs gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Iniciar Conversa
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/lead/${lead.id}`);
              }}
            >
              Ver Detalhes
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

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
    </div>
  );
};
