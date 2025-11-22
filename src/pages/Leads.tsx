import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { LeadCard } from "@/components/LeadCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Filter } from "lucide-react";

const Leads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<any[]>([]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
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
          <Button onClick={() => navigate("/lead/new")} size="lg" className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Lead
          </Button>
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
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Nenhum lead encontrado</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Leads;
