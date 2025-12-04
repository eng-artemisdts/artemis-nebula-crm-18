import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { LeadCard } from "@/components/LeadCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Filter, CheckSquare, Square, Trash2, Upload, Bot, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadImportDialog } from "@/components/LeadImportDialog";

const Leads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const fetchLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
      setFilteredLeads(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar leads");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("lead_categories").select("*");
    setCategories(data || []);
  };

  useEffect(() => {
    fetchLeads();
    fetchCategories();
  }, []);

  useEffect(() => {
    let filtered = leads;

    if (searchQuery) {
      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((lead) => lead.category === categoryFilter);
    }

    setFilteredLeads(filtered);
  }, [searchQuery, statusFilter, categoryFilter, leads]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map(l => l.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    if (!confirm(`Deseja realmente excluir ${selectedIds.length} lead(s)?`)) return;

    setLoading(true);
    const { error } = await supabase
      .from("leads")
      .delete()
      .in("id", selectedIds);

    if (error) {
      toast.error("Erro ao excluir leads");
      console.error(error);
    } else {
      toast.success(`${selectedIds.length} lead(s) excluído(s) com sucesso!`);
      setSelectedIds([]);
      setIsSelectionMode(false);
      fetchLeads();
    }
    setLoading(false);
  };

  const handleScheduleInteractions = async () => {
    if (selectedIds.length === 0) {
      toast.error("Selecione pelo menos um lead para agendar interações");
      return;
    }

    const selectedLeadsData = filteredLeads.filter(lead => selectedIds.includes(lead.id));
    const validLeads = selectedLeadsData.filter(lead =>
      lead.contact_whatsapp && lead.remote_jid
    );

    if (validLeads.length === 0) {
      toast.error("Nenhum lead válido selecionado. Os leads devem ter WhatsApp e remote_jid configurados.");
      return;
    }

    if (validLeads.length < selectedIds.length) {
      toast.warning(`${validLeads.length} de ${selectedIds.length} lead(s) são válidos para agendamento.`);
    }

    try {
      const { data: settings } = await supabase
        .from("settings")
        .select("default_ai_interaction_id")
        .maybeSingle();

      const { data: whatsappInstances, error: instancesError } = await supabase
        .from("whatsapp_instances")
        .select("instance_name")
        .eq("status", "connected")
        .order("created_at", { ascending: false })
        .limit(1);

      if (instancesError || !whatsappInstances || whatsappInstances.length === 0) {
        toast.error("Nenhuma instância WhatsApp conectada. Configure em WhatsApp > Conectar");
        return;
      }

      const instanceName = whatsappInstances[0].instance_name;
      const aiInteractionId = settings?.default_ai_interaction_id || null;

      navigate("/schedule-interactions", {
        state: {
          leads: validLeads,
          aiInteractionId: aiInteractionId,
          instanceName: instanceName
        }
      });
    } catch (error: any) {
      console.error("Erro ao preparar agendamento de interações:", error);
      toast.error("Erro ao preparar agendamento de interações");
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Todos os Leads</h1>
            <p className="text-muted-foreground mt-1">
              {filteredLeads.length} lead(s) encontrado(s)
            </p>
          </div>
          <div className="flex gap-2">
            {filteredLeads.length > 0 && (
              <>
                {isSelectionMode ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={toggleSelectAll}
                    >
                      {selectedIds.length === filteredLeads.length ? (
                        <>
                          <Square className="w-4 h-4 mr-2" />
                          Desmarcar Todos
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-4 h-4 mr-2" />
                          Selecionar Todos
                        </>
                      )}
                    </Button>
                    {selectedIds.length > 0 && (
                      <Button
                        variant="default"
                        onClick={handleScheduleInteractions}
                        className="gap-2"
                      >
                        <Bot className="w-4 h-4" />
                        Agendar Interações ({selectedIds.length})
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      onClick={handleBulkDelete}
                      disabled={selectedIds.length === 0 || loading}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir {selectedIds.length > 0 && `(${selectedIds.length})`}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedIds([]);
                      }}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsSelectionMode(true)}
                  >
                    Selecionar Múltiplos
                  </Button>
                )}
              </>
            )}
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
              size="lg"
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar Leads
            </Button>
            <Button onClick={() => navigate("/lead/new")} size="lg" className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="Filtrar por status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="conversa_iniciada">Conversa Iniciada</SelectItem>
              <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
              <SelectItem value="link_pagamento_enviado">Link Pagamento</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="perdido">Perdido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="Filtrar por categoria" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Leads Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando leads...</p>
          </div>
        ) : filteredLeads.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className={`relative transition-all ${isSelectionMode ? 'cursor-pointer' : ''
                  } ${selectedIds.includes(lead.id) ? 'ring-2 ring-primary rounded-lg' : ''
                  }`}
                onClick={isSelectionMode ? () => toggleSelection(lead.id) : undefined}
              >
                {isSelectionMode && (
                  <div className="absolute top-4 right-4 z-10 pointer-events-none bg-background/80 backdrop-blur-sm rounded p-1">
                    <Checkbox
                      checked={selectedIds.includes(lead.id)}
                      onCheckedChange={() => toggleSelection(lead.id)}
                    />
                  </div>
                )}
                <div className={isSelectionMode ? 'pointer-events-none' : ''}>
                  <LeadCard
                    lead={lead}
                    onLeadUpdate={(updatedLead) => {
                      setLeads(prevLeads =>
                        prevLeads.map(l => l.id === updatedLead.id ? updatedLead : l)
                      );
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Nenhum lead encontrado</p>
          </div>
        )}
      </div>

      <LeadImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={fetchLeads}
      />
    </Layout>
  );
};

export default Leads;
