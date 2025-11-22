import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { StatsCard } from "@/components/StatsCard";
import { LeadCard } from "@/components/LeadCard";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, TrendingUp, Target, Plus, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const statusColumns = [
  { id: "novo", label: "Novo" },
  { id: "conversa_iniciada", label: "Conversa Iniciada" },
  { id: "proposta_enviada", label: "Proposta Enviada" },
  { id: "link_pagamento_enviado", label: "Link Pagamento" },
  { id: "pago", label: "Pago" },
  { id: "perdido", label: "Perdido" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
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

  useEffect(() => {
    fetchLeads();
  }, []);

  const getLeadsByStatus = (status: string) => {
    return leads.filter((lead) => lead.status === status);
  };

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
          <Button
            onClick={() => navigate("/lead/new")}
            className="gap-2"
            size="lg"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </Button>
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
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {statusColumns.map((column) => {
              const columnLeads = getLeadsByStatus(column.id);
              return (
                <div key={column.id} className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                    <h3 className="font-semibold text-sm">{column.label}</h3>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {columnLeads.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {columnLeads.length > 0 ? (
                      columnLeads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} />
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">
                        Nenhum lead
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
