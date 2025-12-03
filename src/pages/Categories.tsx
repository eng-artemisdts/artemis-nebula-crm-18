import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { LeadCard } from "@/components/LeadCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Filter } from "lucide-react";

const Categories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    const { data } = await supabase.from("lead_categories").select("*");
    setCategories(data || []);
  };

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

  useEffect(() => {
    fetchCategories();
    fetchLeads();
  }, []);

  useEffect(() => {
    if (selectedCategory === "all") {
      setFilteredLeads(leads);
    } else {
      setFilteredLeads(leads.filter((lead) => lead.category === selectedCategory));
    }
  }, [selectedCategory, leads]);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold">Leads por Categoria</h1>
          <p className="text-muted-foreground mt-1">
            Filtre e visualize leads por categoria
          </p>
        </div>

        <div className="max-w-md">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="Selecione uma categoria" />
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

        {selectedCategory !== "all" && (
          <div className="p-4 bg-card border border-border rounded-lg">
            <h3 className="font-semibold text-lg mb-1">{selectedCategory}</h3>
            <p className="text-sm text-muted-foreground">
              {categories.find((c) => c.name === selectedCategory)?.description}
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando leads...</p>
          </div>
        ) : filteredLeads.length > 0 ? (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {filteredLeads.length} lead(s) encontrado(s)
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLeads.map((lead) => (
                <LeadCard 
                  key={lead.id} 
                  lead={lead}
                  onLeadUpdate={(updatedLead) => {
                    setLeads(prevLeads => 
                      prevLeads.map(l => l.id === updatedLead.id ? updatedLead : l)
                    );
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">
              Nenhum lead encontrado para esta categoria
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Categories;
