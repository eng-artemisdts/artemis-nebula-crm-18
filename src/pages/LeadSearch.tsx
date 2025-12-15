import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, MapPin, Plus, Loader2, X } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { cleanPhoneNumber, formatWhatsAppNumber } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingOverlay } from "@/components/LoadingOverlay";

interface BusinessResult {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  category: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
}

const LeadSearch = () => {
  const { organization } = useOrganization();
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchParams, setSearchParams] = useState({
    location: "",
    radius: "5000",
  });
  const [searchResults, setSearchResults] = useState<BusinessResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBusinesses, setSelectedBusinesses] = useState<number[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("lead_categories")
      .select("*")
      .order("name");
    setCategories(data || []);
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categoryFilter.toLowerCase())
  );

  const handleCategoryToggle = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleSelectAll = () => {
    setSelectedCategories(filteredCategories.map((cat) => cat.name));
  };

  const handleClearSelection = () => {
    setSelectedCategories([]);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCategories.length === 0) {
      toast.error("Selecione pelo menos uma categoria");
      return;
    }

    if (!searchParams.location.trim()) {
      toast.error("Digite uma localização");
      return;
    }

    setLoading(true);
    setSearchResults([]);
    setSelectedBusinesses([]);

    try {
      const { data, error } = await supabase.functions.invoke("search-nearby-businesses", {
        body: {
          location: searchParams.location,
          categories: selectedCategories,
          radius: parseInt(searchParams.radius),
        },
      });

      if (error) throw error;

      // Filtra apenas negócios que possuem telefone (WhatsApp)
      const businessesWithPhone = (data.businesses || []).filter((business: BusinessResult) => business.phone);
      setSearchResults(businessesWithPhone);

      if (businessesWithPhone.length === 0) {
        toast.info("Nenhum negócio com WhatsApp encontrado");
      } else {
        toast.success(`${businessesWithPhone.length} negócio(s) com WhatsApp encontrado(s)`);
      }
    } catch (error: any) {
      toast.error("Erro ao buscar negócios: " + (error.message || "Erro desconhecido"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessToggle = (index: number) => {
    setSelectedBusinesses((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const handleConfirmAddLeads = () => {
    setShowConfirmDialog(false);
    processAddToLeads();
  };

  const handleAddToLeads = () => {
    if (selectedBusinesses.length === 0) {
      toast.error("Selecione pelo menos um negócio para adicionar");
      return;
    }
    setShowConfirmDialog(true);
  };

  const processAddToLeads = async () => {
    const businessesToAdd = selectedBusinesses.map((index) => searchResults[index]);
    setLoading(true);
    setLoadingMessage("Validando números no WhatsApp...");

    try {
      // Coletar todos os números para validação
      const phonesToCheck = businessesToAdd
        .map((business) => business.phone ? cleanPhoneNumber(business.phone) : null)
        .filter((phone): phone is string => phone !== null);

      if (phonesToCheck.length === 0) {
        toast.error("Nenhum número de telefone válido encontrado");
        setLoading(false);
        return;
      }

      // Validar todos os números via Evolution API
      setLoadingMessage("Validando números no WhatsApp...");
      const { data: checkData, error: checkError } = await supabase.functions.invoke('evolution-check-whatsapp', {
        body: { numbers: phonesToCheck }
      });

      if (checkError) {
        console.error("Error checking WhatsApp:", checkError);
        toast.error("Erro ao validar números no WhatsApp");
        setLoading(false);
        setLoadingMessage("");
        return;
      }

      // Criar mapa de número para jid
      const phoneToJidMap = new Map<string, string>();
      checkData?.results?.forEach((result: any) => {
        if (result.exists && result.jid) {
          phoneToJidMap.set(result.number, result.jid);
        }
      });

      // Criar leads apenas para números válidos
      const leadsToInsert = businessesToAdd
        .map((business) => {
          const cleanedPhone = business.phone ? cleanPhoneNumber(business.phone) : null;
          if (!cleanedPhone || !phoneToJidMap.has(cleanedPhone)) {
            return null;
          }

          const normalizedPhone = formatWhatsAppNumber(cleanedPhone);

          return {
            name: business.name,
            description: `Negócio encontrado via busca - ${business.address}`,
            category: business.category,
            status: "novo",
            contact_email: business.email || null,
            contact_whatsapp: normalizedPhone,
            remote_jid: phoneToJidMap.get(cleanedPhone),
            source: "Busca Automática",
            whatsapp_verified: true,
            organization_id: organization?.id,
          };
        })
        .filter((lead): lead is NonNullable<typeof lead> => lead !== null);

      if (leadsToInsert.length === 0) {
        toast.error("Nenhum número válido no WhatsApp encontrado");
        setLoading(false);
        setLoadingMessage("");
        return;
      }

      setLoadingMessage("Adicionando leads ao sistema...");
      const { error } = await supabase.from("leads").insert(leadsToInsert);

      if (error) throw error;

      const invalidCount = businessesToAdd.length - leadsToInsert.length;
      if (invalidCount > 0) {
        toast.success(`${leadsToInsert.length} lead(s) adicionado(s). ${invalidCount} número(s) não estavam no WhatsApp.`);
      } else {
        toast.success(`${leadsToInsert.length} lead(s) adicionado(s) com sucesso!`);
      }

      setSelectedBusinesses([]);
    } catch (error: any) {
      toast.error("Erro ao adicionar leads");
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  return (
    <Layout>
      {loading && <LoadingOverlay message={loadingMessage} />}

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirmAddLeads}
        title="Confirmar Adição de Leads"
        description={`Você está prestes a adicionar ${selectedBusinesses.length} negócio(s) como leads. Os números serão validados no WhatsApp antes da adição. Deseja continuar?`}
        confirmText="Sim, Adicionar"
        cancelText="Cancelar"
      />

      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold">Buscar Novos Leads</h1>
          <p className="text-muted-foreground mt-1">
            Encontre negócios próximos baseado em categorias e localização
          </p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Selecione as Categorias</h3>
              {selectedCategories.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedCategories.length} selecionada(s)
                </span>
              )}
            </div>

            {categories.length > 0 && (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      placeholder="Filtrar categorias..."
                      className="pl-10"
                    />
                    {categoryFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setCategoryFilter("")}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={filteredCategories.length === 0}
                  >
                    Selecionar Todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSelection}
                    disabled={selectedCategories.length === 0}
                  >
                    Limpar
                  </Button>
                </div>

                <ScrollArea className="h-[300px] border rounded-md p-4">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCategories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={category.id}
                          checked={selectedCategories.includes(category.name)}
                          onCheckedChange={() => handleCategoryToggle(category.name)}
                        />
                        <label
                          htmlFor={category.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {category.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  {filteredCategories.length === 0 && categoryFilter && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma categoria encontrada com "{categoryFilter}"
                    </p>
                  )}
                </ScrollArea>
              </>
            )}

            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma categoria disponível. Crie categorias primeiro.
              </p>
            )}
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Localização *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={searchParams.location}
                    onChange={(e) =>
                      setSearchParams({ ...searchParams, location: e.target.value })
                    }
                    placeholder="Ex: São Paulo, SP"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="radius">Raio de Busca (metros)</Label>
                <Input
                  id="radius"
                  type="number"
                  value={searchParams.radius}
                  onChange={(e) =>
                    setSearchParams({ ...searchParams, radius: e.target.value })
                  }
                  min="1000"
                  max="50000"
                  step="1000"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Buscar Negócios
                </>
              )}
            </Button>
          </form>
        </Card>

        {searchResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Resultados ({searchResults.length})
              </h3>
              {selectedBusinesses.length > 0 && (
                <Button onClick={handleAddToLeads}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar {selectedBusinesses.length} Lead(s)
                </Button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((business, index) => (
                <Card
                  key={index}
                  className={`p-4 space-y-3 cursor-pointer transition-all ${selectedBusinesses.includes(index)
                      ? "border-primary bg-primary/5"
                      : "hover:border-accent"
                    }`}
                  onClick={() => handleBusinessToggle(index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{business.name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {business.address}
                      </p>
                    </div>
                    <Checkbox
                      checked={selectedBusinesses.includes(index)}
                      onCheckedChange={() => handleBusinessToggle(index)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-secondary rounded-md">
                      {business.category}
                    </span>
                    {business.phone && (
                      <span className="px-2 py-1 bg-accent/10 rounded-md">
                        📱 {business.phone}
                      </span>
                    )}
                    {business.email && (
                      <span className="px-2 py-1 bg-accent/10 rounded-md">
                        ✉️ {business.email}
                      </span>
                    )}
                    {business.rating && (
                      <span className="px-2 py-1 bg-primary/10 rounded-md">
                        ⭐ {business.rating}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LeadSearch;
