import { useEffect, useState, useMemo, memo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { StatsCard } from "@/components/StatsCard";
import { LeadCard } from "@/components/LeadCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { MessagePreviewDialog } from "@/components/MessagePreviewDialog";
import { Users, DollarSign, TrendingUp, Target, Plus, Clock, Mail, MessageSquare, AlertCircle, Search, X, LayoutGrid, Table2, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatWhatsAppNumber, formatPhoneDisplay } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOrganization } from "@/hooks/useOrganization";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { LeadStatusService, LeadStatus } from "@/services/LeadStatusService";

const TableRowMemo = memo(({
  lead,
  isSelected,
  onToggleSelection,
  onShowPreview,
  onNavigate,
  onStatusChange,
  formatWhatsAppNumber,
  formatPhoneDisplay,
  format,
  ptBR,
  statusColumns
}: {
  lead: any;
  isSelected: boolean;
  onToggleSelection: (leadId: string) => void;
  onShowPreview: (lead: any) => void;
  onNavigate: (path: string) => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
  formatWhatsAppNumber: (phone: string) => string;
  formatPhoneDisplay: (phone: string) => string;
  format: any;
  ptBR: any;
  statusColumns: { id: string; label: string }[];
}) => {
  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(lead.id)}
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>
      <TableCell
        className="font-medium max-w-[200px] cursor-pointer"
        onClick={() => onNavigate(`/lead/${lead.id}`)}
      >
        <div className="truncate" title={lead.name}>
          {lead.name}
        </div>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select
          value={lead.status}
          onValueChange={(value) => onStatusChange(lead.id, value)}
        >
          <SelectTrigger className="w-[200px] h-8 border-none bg-transparent hover:bg-transparent p-0">
            <div className="flex items-center">
              <StatusBadge
                status={lead.status as any}
                label={statusColumns.find(col => col.id === lead.status)?.label}
              />
            </div>
          </SelectTrigger>
          <SelectContent>
            {statusColumns.map((column) => (
              <SelectItem key={column.id} value={column.id}>
                {column.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell onClick={() => onNavigate(`/lead/${lead.id}`)}>
        {lead.category ? (
          <span className="text-xs px-2 py-1 rounded-md bg-secondary">
            {lead.category}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell onClick={() => onNavigate(`/lead/${lead.id}`)}>
        {lead.contact_email ? (
          <a
            href={`mailto:${lead.contact_email}`}
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline truncate block max-w-[200px]"
          >
            {lead.contact_email}
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell onClick={() => onNavigate(`/lead/${lead.id}`)}>
        {lead.contact_whatsapp ? (
          <a
            href={`https://wa.me/${formatWhatsAppNumber(lead.contact_whatsapp)}?text=${encodeURIComponent(`Olá ${lead.name}! Tudo bem?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline"
          >
            {formatPhoneDisplay(lead.contact_whatsapp)}
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell onClick={() => onNavigate(`/lead/${lead.id}`)}>
        {lead.payment_amount ? (
          <span className="font-medium">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(lead.payment_amount)}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell onClick={() => onNavigate(`/lead/${lead.id}`)}>
        {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        {(lead.status === "new" || lead.status === "novo") && lead.contact_whatsapp && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShowPreview(lead)}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            Iniciar
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
});

TableRowMemo.displayName = "TableRowMemo";

const StatusColumn = memo(({
  column,
  columnLeads,
  onLeadUpdate,
  maxVisibleLeads = 10
}: {
  column: { id: string; label: string };
  columnLeads: any[];
  onLeadUpdate?: (updatedLead: any) => void;
  maxVisibleLeads?: number;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const [showAll, setShowAll] = useState(false);
  const visibleLeads = showAll ? columnLeads : columnLeads.slice(0, maxVisibleLeads);
  const hasMore = columnLeads.length > maxVisibleLeads;

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border flex-shrink-0 min-w-0">
        <h3 className="font-semibold text-sm truncate">{column.label}</h3>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary flex-shrink-0">
          {columnLeads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[calc(100vh-400px)] p-2 rounded-lg transition-all scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-w-0 ${isOver ? 'bg-primary/5 border-2 border-primary border-dashed' : 'border-2 border-transparent'
          }`}
        data-status={column.id}
      >
        {visibleLeads.length > 0 ? (
          <>
            {visibleLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isDraggable
                onLeadUpdate={onLeadUpdate}
              />
            ))}
            {hasMore && !showAll && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowAll(true)}
              >
                Ver mais ({columnLeads.length - maxVisibleLeads})
              </Button>
            )}
            {showAll && hasMore && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowAll(false)}
              >
                Ver menos
              </Button>
            )}
          </>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">
            Nenhum lead
          </div>
        )}
      </div>
    </div>
  );
});

StatusColumn.displayName = "StatusColumn";

const Dashboard = () => {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [leads, setLeads] = useState<any[]>([]);
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasDefaultAI, setHasDefaultAI] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("table");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [previewLead, setPreviewLead] = useState<any>(null);
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | undefined>();
  const [previewSettings, setPreviewSettings] = useState<any>(null);
  const [previewInstanceName, setPreviewInstanceName] = useState<string | null>(null);
  const [availableInstances, setAvailableInstances] = useState<any[]>([]);
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [isStartingBulkConversation, setIsStartingBulkConversation] = useState(false);
  const [statusColumns, setStatusColumns] = useState<{ id: string; label: string }[]>([]);
  const statusService = new LeadStatusService();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);

      if (!organization?.id) {
        setLoading(false);
        return;
      }

      const baseQuery = supabase
        .from("leads")
        .select("*", { count: "exact" })
        .eq("organization_id", organization.id)
        .or("is_test.is.null,is_test.eq.false")
        .order("created_at", { ascending: false });

      if (searchQuery.trim() || viewMode === "kanban") {
        const { data, error, count } = await baseQuery;
        if (error) throw error;
        setLeads(data || []);
        setTotalLeads(count || 0);
      } else {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize - 1;

        const { data, error, count } = await baseQuery
          .range(startIndex, endIndex);

        if (error) throw error;
        setLeads(data || []);
        setTotalLeads(count || 0);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar leads");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, viewMode, organization?.id]);

  const checkDefaultAI = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("default_ai_interaction_id")
        .maybeSingle();

      if (error) throw error;
      setHasDefaultAI(!!data?.default_ai_interaction_id);
    } catch (error: any) {
      console.error(error);
    }
  };

  const fetchStatuses = async () => {
    if (!organization?.id) return;

    try {
      const statuses = await statusService.getAll(organization.id);
      setStatusColumns(statuses.map((s) => ({ id: s.status_key, label: s.label })));
    } catch (error: any) {
      console.error("Erro ao carregar status:", error);
      toast.error("Erro ao carregar status personalizados");
    }
  };

  useEffect(() => {
    checkDefaultAI();
    fetchStatuses();
  }, [organization?.id]);

  useEffect(() => {
    if (searchQuery.trim() || viewMode === "kanban") {
      setCurrentPage(1);
    }
  }, [searchQuery, viewMode]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (viewMode !== "kanban" || !organization?.id) {
      return;
    }

    const updateInterval = setInterval(() => {
      fetchLeads();
    }, 30000);

    return () => {
      clearInterval(updateInterval);
    };
  }, [viewMode, organization?.id, fetchLeads]);

  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;

    const query = searchQuery.toLowerCase();
    return leads.filter((lead) =>
      lead.name?.toLowerCase().includes(query) ||
      lead.contact_email?.toLowerCase().includes(query) ||
      lead.contact_whatsapp?.includes(query) ||
      lead.description?.toLowerCase().includes(query) ||
      lead.category?.toLowerCase().includes(query)
    );
  }, [leads, searchQuery]);

  const paginatedLeads = useMemo(() => {
    if (searchQuery.trim()) {
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      return filteredLeads.slice(startIndex, endIndex);
    }
    return leads;
  }, [filteredLeads, leads, currentPage, pageSize, searchQuery]);

  const totalPages = useMemo(() => {
    const total = searchQuery.trim() ? filteredLeads.length : totalLeads;
    return Math.ceil(total / pageSize);
  }, [filteredLeads.length, totalLeads, pageSize, searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const getLeadsByStatus = (status: string) => {
    const column = statusColumns.find((c) => c.id === status);
    const normalizedLabel = column?.label?.toString().toLowerCase();
    const normalizedLabelId = normalizedLabel?.replace(/\s+/g, "_");

    return filteredLeads.filter((lead) => {
      const leadStatus = (lead.status || "").toString();
      if (!leadStatus) return false;

      if (leadStatus === status) return true;

      const leadStatusLower = leadStatus.toLowerCase();

      if (normalizedLabel && leadStatusLower === normalizedLabel) return true;
      if (normalizedLabelId && leadStatusLower === normalizedLabelId) return true;

      return false;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    const oldStatus = lead.status;

    // Atualiza otimisticamente
    setLeads((prevLeads) =>
      prevLeads.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    // Atualiza no banco
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus })
        .eq("id", leadId);

      if (error) throw error;

      toast.success("Status atualizado com sucesso!");
    } catch (error: any) {
      // Reverte em caso de erro
      setLeads((prevLeads) =>
        prevLeads.map((l) => (l.id === leadId ? { ...l, status: oldStatus } : l))
      );
      toast.error("Erro ao atualizar status");
      console.error(error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    let newStatus: string;

    // Verifica se o over.id é um status de coluna ou um ID de lead
    const statusIds = statusColumns.map(c => c.id);
    if (statusIds.includes(over.id as string)) {
      newStatus = over.id as string;
    } else {
      // Se foi solto em cima de outro lead, pega o status daquele lead
      const targetLead = filteredLeads.find((l) => l.id === over.id) || leads.find((l) => l.id === over.id);
      if (!targetLead) return;
      newStatus = targetLead.status;
    }

    // Se o status não existe nas colunas, não permite a mudança
    if (!statusIds.includes(newStatus)) {
      toast.error("Status inválido. Por favor, atualize os status personalizados.");
      return;
    }

    await handleStatusChange(leadId, newStatus);
  };

  const activeLead = activeId ? filteredLeads.find((l) => l.id === activeId) : null;

  const stats = useMemo(() => {
    const newStatusKey = statusColumns.find(s => s.label === "Novo")?.id || "new";
    const paidStatusKey = statusColumns.find(s => s.label === "Pago")?.id || "pago";
    const lostStatusKey = statusColumns.find(s => s.label === "Perdido")?.id || "perdido";

    return {
      total: filteredLeads.length,
      novos: filteredLeads.filter((lead) => lead.status === newStatusKey || lead.status === "novo").length,
      pagos: filteredLeads.filter((lead) => lead.status === paidStatusKey || lead.status === "pago").length,
      perdidos: filteredLeads.filter((lead) => lead.status === lostStatusKey || lead.status === "perdido").length,
    };
  }, [filteredLeads, statusColumns]);

  const financialStats = useMemo(() => ({
    totalValue: filteredLeads.reduce((sum, lead) => sum + (lead.payment_amount || 0), 0),
    paidValue: filteredLeads
      .filter(l => l.status === "pago")
      .reduce((sum, lead) => sum + (lead.payment_amount || 0), 0),
    pendingValue: filteredLeads
      .filter(l => l.payment_link_url && l.status !== "pago" && l.status !== "perdido")
      .reduce((sum, lead) => sum + (lead.payment_amount || 0), 0),
  }), [filteredLeads]);

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === paginatedLeads.length && paginatedLeads.length > 0) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(paginatedLeads.map(lead => lead.id)));
    }
  };

  const handleShowPreview = async (lead: any) => {
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

      setPreviewLead(lead);
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
    if (!previewLead) return;

    setIsStartingConversation(true);
    setShowPreview(false);

    try {
      if (!previewLead.contact_whatsapp || !previewInstanceName) {
        toast.error("Dados insuficientes para enviar mensagem");
        setIsStartingConversation(false);
        return;
      }

      if (!previewLead.remote_jid) {
        toast.error("Lead não possui remoteJid válido. Por favor, recrie o lead.");
        setIsStartingConversation(false);
        return;
      }

      const { data: sendData, error: sendError } = await supabase.functions.invoke("evolution-send-message", {
        body: {
          instanceName: previewInstanceName,
          remoteJid: previewLead.remote_jid,
          message: previewMessage,
          imageUrl: previewImageUrl
        }
      });

      if (sendError || (sendData && typeof sendData === 'object' && 'error' in sendData)) {
        const errorMessage = sendError?.message || (sendData as any)?.error || "Erro ao enviar mensagem";
        toast.error(errorMessage);
        setIsStartingConversation(false);
        return;
      }

      const conversationStartedKey = statusColumns.find(s => s.label === "Conversa Iniciada")?.id || "conversation_started";
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          status: conversationStartedKey,
          whatsapp_verified: true
        })
        .eq("id", previewLead.id);

      if (updateError) {
        toast.error("Mensagem enviada, mas houve erro ao atualizar o status do lead");
        setIsStartingConversation(false);
        return;
      }

      setLeads(prevLeads =>
        prevLeads.map(l => l.id === previewLead.id ? { ...l, status: conversationStartedKey, whatsapp_verified: true } : l)
      );

      if (previewSettings?.n8n_webhook_url) {
        try {
          await fetch(previewSettings.n8n_webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadId: previewLead.id,
              name: previewLead.name,
              email: previewLead.contact_email,
              whatsapp: previewLead.contact_whatsapp,
              category: previewLead.category,
              description: previewLead.description,
              action: "start_conversation"
            })
          });
        } catch (webhookError) {
          console.error("Erro ao enviar webhook:", webhookError);
        }
      }

      toast.success("Conversa iniciada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao iniciar conversa:", error);
      toast.error(error?.message || "Erro ao iniciar conversa");
    } finally {
      setIsStartingConversation(false);
      setPreviewLead(null);
    }
  };

  const handleBulkStartConversation = async () => {
    if (selectedLeads.size === 0) return;

    const selectedLeadsData = leads.filter(lead => selectedLeads.has(lead.id));
    const newStatusKey = statusColumns.find(s => s.label === "Novo")?.id || "new";
    const validLeads = selectedLeadsData.filter(lead =>
      lead.contact_whatsapp && lead.remote_jid && (lead.status === newStatusKey || lead.status === "novo")
    );

    if (validLeads.length === 0) {
      toast.error("Nenhum lead válido selecionado. Os leads devem ter WhatsApp e estar no status 'Novo'.");
      return;
    }

    if (selectedLeads.size > 1) {
      try {
        const { data: settings } = await supabase
          .from("settings")
          .select("n8n_webhook_url, default_message, default_image_url")
          .maybeSingle();

        const { data: whatsappInstances, error: instancesError } = await supabase
          .from("whatsapp_instances")
          .select("id, instance_name, phone_number, status")
          .eq("status", "connected")
          .order("created_at", { ascending: false });

        if (instancesError || !whatsappInstances || whatsappInstances.length === 0) {
          toast.error("Nenhuma instância WhatsApp conectada. Configure em WhatsApp > Conectar");
          return;
        }

        const instanceName = whatsappInstances[0].instance_name;
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

        navigate("/schedule-messages", {
          state: {
            leads: validLeads,
            message: message,
            imageUrl: imageUrl,
            instanceName: instanceName
          }
        });
      } catch (error: any) {
        console.error("Erro ao preparar agendamento:", error);
        toast.error("Erro ao preparar agendamento");
      }
      return;
    }

    try {
      const { data: settings } = await supabase
        .from("settings")
        .select("n8n_webhook_url, default_message, default_image_url")
        .maybeSingle();

      const { data: whatsappInstances, error: instancesError } = await supabase
        .from("whatsapp_instances")
        .select("id, instance_name, phone_number, status")
        .eq("status", "connected")
        .order("created_at", { ascending: false });

      if (instancesError || !whatsappInstances || whatsappInstances.length === 0) {
        toast.error("Nenhuma instância WhatsApp conectada. Configure em WhatsApp > Conectar");
        return;
      }

      const instanceName = whatsappInstances[0].instance_name;
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

      setIsStartingBulkConversation(true);

      let successCount = 0;
      let errorCount = 0;
      const successfulLeadIds: string[] = [];
      const conversationStartedKey = statusColumns.find(s => s.label === "Conversa Iniciada")?.id || "conversation_started";

      for (const lead of validLeads) {
        try {
          const { data: sendData, error: sendError } = await supabase.functions.invoke("evolution-send-message", {
            body: {
              instanceName,
              remoteJid: lead.remote_jid,
              message: message,
              imageUrl
            }
          });

          if (sendError || (sendData && typeof sendData === 'object' && 'error' in sendData)) {
            errorCount++;
            continue;
          }

          const { error: updateError } = await supabase
            .from("leads")
            .update({
              status: conversationStartedKey,
              whatsapp_verified: true
            })
            .eq("id", lead.id);

          if (updateError) {
            errorCount++;
            continue;
          }

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
            }
          }

          successfulLeadIds.push(lead.id);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Erro ao enviar mensagem para lead ${lead.id}:`, error);
        }
      }

      setLeads(prevLeads =>
        prevLeads.map(l => {
          if (successfulLeadIds.includes(l.id)) {
            return { ...l, status: conversationStartedKey, whatsapp_verified: true };
          }
          return l;
        })
      );

      setSelectedLeads(new Set());

      if (successCount > 0) {
        toast.success(`${successCount} conversa(s) iniciada(s) com sucesso!`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} conversa(s) falharam ao iniciar.`);
      }
    } catch (error: any) {
      console.error("Erro ao iniciar conversas em lote:", error);
      toast.error("Erro ao iniciar conversas em lote");
    } finally {
      setIsStartingBulkConversation(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* AI Configuration Alert */}
        {!hasDefaultAI && (
          <Alert className="border-amber-500/50 bg-amber-500/5">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <AlertTitle className="text-lg font-semibold">Configure sua IA Padrão</AlertTitle>
            <AlertDescription className="text-base mt-2">
              Você ainda não configurou uma IA padrão para seus leads. Configure agora para
              automatizar o atendimento dos novos leads.
              <br />
              <Button
                onClick={() => navigate("/ai-interaction")}
                variant="outline"
                className="mt-3 gap-2 border-amber-500/50 hover:bg-amber-500/10"
              >
                <AlertCircle className="w-4 h-4" />
                Ir para Agentes
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Visão geral dos seus leads e conversões
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => toast.info("Funcionalidade de captura via Email será implementada em breve")}
              variant="outline"
              className="gap-2"
              size="lg"
            >
              <Mail className="w-4 h-4" />
              Capturar via Email
            </Button>
            <Button
              onClick={() => toast.info("Funcionalidade de captura via WhatsApp será implementada em breve")}
              variant="outline"
              className="gap-2"
              size="lg"
            >
              <MessageSquare className="w-4 h-4" />
              Capturar via WhatsApp
            </Button>
            <Button
              onClick={() => navigate("/lead/new")}
              className="gap-2"
              size="lg"
            >
              <Plus className="w-4 h-4" />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total de Leads"
            value={stats.total}
            icon={Users}
          />
          <StatsCard
            title="Novos Leads"
            value={stats.novos}
            icon={Target}
          />
          <StatsCard
            title="Leads Pagos"
            value={stats.pagos}
            icon={DollarSign}
          />
          <StatsCard
            title="Taxa de Conversão"
            value={stats.total > 0 ? Math.round((stats.pagos / stats.total) * 100) : 0}
            icon={TrendingUp}
          />
        </div>

        {/* Financial Stats */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Métricas Financeiras</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Valor Total Propostas"
              value={`R$ ${(financialStats.totalValue / 1000).toFixed(1)}k`}
              icon={DollarSign}
            />
            <StatsCard
              title="Valor Pago"
              value={`R$ ${(financialStats.paidValue / 1000).toFixed(1)}k`}
              icon={TrendingUp}
            />
            <StatsCard
              title="Valor Pendente"
              value={`R$ ${(financialStats.pendingValue / 1000).toFixed(1)}k`}
              icon={Clock}
            />
            <StatsCard
              title="Taxa de Conversão $"
              value={financialStats.totalValue > 0
                ? `${Math.round((financialStats.paidValue / financialStats.totalValue) * 100)}%`
                : "0%"}
              icon={Target}
            />
          </div>
        </div>

        {/* Funil de Vendas */}
        <div>
          <div className="flex items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold">Funil de Vendas</h2>
            <div className="flex items-center gap-3">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar leads por nome, email, telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="flex gap-2 border rounded-lg p-1">
                <Button
                  variant={viewMode === "kanban" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("kanban")}
                  className="gap-2"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Kanban
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="gap-2"
                >
                  <Table2 className="w-4 h-4" />
                  Tabela
                </Button>
              </div>
            </div>
          </div>
          {searchQuery && (
            <div className="mb-4 text-sm text-muted-foreground">
              Mostrando {filteredLeads.length} de {totalLeads} leads
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando funil de vendas...</p>
              </div>
            </div>
          ) : viewMode === "kanban" ? (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              collisionDetection={closestCenter}
            >
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 min-w-0">
                {statusColumns.map((column) => {
                  const columnLeads = getLeadsByStatus(column.id);
                  return (
                    <StatusColumn
                      key={column.id}
                      column={column}
                      columnLeads={columnLeads}
                      maxVisibleLeads={15}
                      onLeadUpdate={(updatedLead) => {
                        setLeads(prevLeads =>
                          prevLeads.map(l => l.id === updatedLead.id ? updatedLead : l)
                        );
                      }}
                    />
                  );
                })}
              </div>
              <DragOverlay>
                {activeLead ? <LeadCard lead={activeLead} isDraggable={false} /> : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <>
              {selectedLeads.size > 0 && (
                <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {selectedLeads.size} lead(s) selecionado(s)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLeads(new Set())}
                    >
                      Limpar Seleção
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkStartConversation}
                      disabled={isStartingBulkConversation}
                      className="gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {isStartingBulkConversation ? "Iniciando..." : `Iniciar ${selectedLeads.size} Conversa(s)`}
                    </Button>
                  </div>
                </div>
              )}
              <div className="border rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={paginatedLeads.length > 0 && paginatedLeads.every(lead => selectedLeads.has(lead.id))}
                          onCheckedChange={toggleSelectAll}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-32">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLeads.length > 0 ? (
                      paginatedLeads.map((lead) => (
                        <TableRowMemo
                          key={lead.id}
                          lead={lead}
                          isSelected={selectedLeads.has(lead.id)}
                          onToggleSelection={toggleLeadSelection}
                          onShowPreview={handleShowPreview}
                          onNavigate={navigate}
                          onStatusChange={handleStatusChange}
                          formatWhatsAppNumber={formatWhatsAppNumber}
                          formatPhoneDisplay={formatPhoneDisplay}
                          format={format}
                          ptBR={ptBR}
                          statusColumns={statusColumns}
                        />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          Nenhum lead encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {(searchQuery.trim() ? filteredLeads.length : totalLeads) > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, searchQuery.trim() ? filteredLeads.length : totalLeads)} de {searchQuery.trim() ? filteredLeads.length : totalLeads} leads
                    </span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">por página</span>
                  </div>
                  {totalPages > 1 && (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) setCurrentPage(currentPage - 1);
                            }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(pageNum);
                                }}
                                isActive={currentPage === pageNum}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                            }}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              )}
              {previewLead && (
                <MessagePreviewDialog
                  open={showPreview}
                  onOpenChange={setShowPreview}
                  onConfirm={handleConfirmSend}
                  message={previewMessage}
                  imageUrl={previewImageUrl}
                  leadName={previewLead.name}
                  isLoading={isStartingConversation}
                  instances={availableInstances}
                  selectedInstanceName={previewInstanceName}
                  onInstanceChange={setPreviewInstanceName}
                />
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
