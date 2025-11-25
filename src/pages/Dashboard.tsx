import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { StatsCard } from "@/components/StatsCard";
import { LeadCard } from "@/components/LeadCard";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, TrendingUp, Target, Plus, Clock, Mail, MessageSquare, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

const statusColumns = [
  { id: "novo", label: "Novo" },
  { id: "conversa_iniciada", label: "Conversa Iniciada" },
  { id: "proposta_enviada", label: "Proposta Enviada" },
  { id: "link_pagamento_enviado", label: "Link Pagamento" },
  { id: "pago", label: "Pago" },
  { id: "perdido", label: "Perdido" },
];

const StatusColumn = ({ 
  column, 
  columnLeads 
}: { 
  column: { id: string; label: string }; 
  columnLeads: any[] 
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
        <h3 className="font-semibold text-sm">{column.label}</h3>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
          {columnLeads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-all ${
          isOver ? 'bg-primary/5 border-2 border-primary border-dashed' : 'border-2 border-transparent'
        }`}
        data-status={column.id}
      >
        {columnLeads.length > 0 ? (
          columnLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} isDraggable />
          ))
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">
            Nenhum lead
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasDefaultAI, setHasDefaultAI] = useState<boolean>(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .not("contact_whatsapp", "is", null)
        .eq("whatsapp_verified", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar leads");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchLeads();
    checkDefaultAI();
  }, []);

  const getLeadsByStatus = (status: string) => {
    return leads.filter((lead) => lead.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
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
      const targetLead = leads.find((l) => l.id === over.id);
      if (!targetLead) return;
      newStatus = targetLead.status;
    }

    // Encontra o lead que está sendo movido
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

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

      toast.success("Lead atualizado com sucesso!");
    } catch (error: any) {
      // Reverte em caso de erro
      setLeads((prevLeads) =>
        prevLeads.map((l) => (l.id === leadId ? { ...l, status: lead.status } : l))
      );
      toast.error("Erro ao atualizar lead");
      console.error(error);
    }
  };

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  const stats = {
    total: leads.length,
    novos: getLeadsByStatus("novo").length,
    pagos: getLeadsByStatus("pago").length,
    perdidos: getLeadsByStatus("perdido").length,
  };

  const financialStats = {
    totalValue: leads.reduce((sum, lead) => sum + (lead.payment_amount || 0), 0),
    paidValue: leads
      .filter(l => l.status === "pago")
      .reduce((sum, lead) => sum + (lead.payment_amount || 0), 0),
    pendingValue: leads
      .filter(l => l.payment_link_url && l.status !== "pago" && l.status !== "perdido")
      .reduce((sum, lead) => sum + (lead.payment_amount || 0), 0),
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
                onClick={() => navigate("/ai-configuration")}
                variant="outline"
                className="mt-3 gap-2 border-amber-500/50 hover:bg-amber-500/10"
              >
                <AlertCircle className="w-4 h-4" />
                Configurar IA Padrão
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

        {/* Kanban Board */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Funil de Vendas</h2>
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            collisionDetection={closestCenter}
          >
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {statusColumns.map((column) => {
                const columnLeads = getLeadsByStatus(column.id);
                return (
                  <StatusColumn
                    key={column.id}
                    column={column}
                    columnLeads={columnLeads}
                  />
                );
              })}
            </div>
            <DragOverlay>
              {activeLead ? <LeadCard lead={activeLead} isDraggable={false} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
