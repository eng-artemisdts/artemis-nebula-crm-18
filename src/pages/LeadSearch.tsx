import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  MapPin,
  Plus,
  Loader2,
  X,
  Star,
  Phone,
  Mail,
  Map,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Tag,
  Menu,
  Settings2,
  Eye,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { cleanPhoneNumber, formatWhatsAppNumber } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { InteractiveMap } from "@/components/InteractiveMap";
import { CategoriesDragDrop } from "@/components/CategoriesDragDrop";
import { LeadPreviewDialog } from "@/components/LeadPreviewDialog";
import { AnimatedLoading } from "@/components/AnimatedLoading";

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

interface Category {
  id: string;
  name: string;
  description?: string;
}

const LeadSearch = () => {
  const { organization } = useOrganization();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    -23.5505, -46.6333,
  ]);
  const [searchParams, setSearchParams] = useState({
    location: "",
    radius: 5000,
    latitude: -23.5505,
    longitude: -46.6333,
  });
  const [currentAddress, setCurrentAddress] = useState<string>("");
  const [searchResults, setSearchResults] = useState<BusinessResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBusinesses, setSelectedBusinesses] = useState<number[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "category">("name");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [categoriesSheetOpen, setCategoriesSheetOpen] = useState(false);
  const [previewBusiness, setPreviewBusiness] = useState<BusinessResult | null>(
    null
  );
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "reverse-geocode",
        {
          body: { lat, lng },
        }
      );

      if (!error && data?.formattedAddress) {
        setCurrentAddress(data.formattedAddress);
        setSearchParams((prev) => ({
          ...prev,
          location: data.formattedAddress,
          latitude: lat,
          longitude: lng,
        }));
      } else {
        setCurrentAddress("");
        setSearchParams((prev) => ({
          ...prev,
          location: "",
          latitude: lat,
          longitude: lng,
        }));
      }
    } catch (error) {
      console.error("Erro ao fazer geocodificação reversa:", error);
      setCurrentAddress("");
      setSearchParams((prev) => ({
        ...prev,
        location: "",
        latitude: lat,
        longitude: lng,
      }));
    }
  };

  const handleLocationSelect = async (placeId: string, description: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("place-details", {
        body: { placeId },
      });

      if (error) throw error;

      if (data?.latitude && data?.longitude) {
        const newCenter: [number, number] = [data.latitude, data.longitude];
        setMapCenter(newCenter);
        setCurrentAddress(data.formattedAddress || description);
        setSearchParams((prev) => ({
          ...prev,
          location: data.formattedAddress || description,
          latitude: data.latitude,
          longitude: data.longitude,
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes da localização:", error);
      toast.error("Erro ao carregar localização selecionada");
    }
  };

  const handleMapLocationChange = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    reverseGeocode(lat, lng);
  };

  const handleMapRadiusChange = (radius: number) => {
    setSearchParams((prev) => ({ ...prev, radius }));
  };

  const handleSearch = async () => {
    if (selectedCategories.length === 0) {
      toast.error("Selecione pelo menos uma categoria");
      setCategoriesSheetOpen(true);
      return;
    }

    if (!searchParams.location.trim()) {
      toast.error("Selecione uma localização no mapa");
      return;
    }

    setLoading(true);
    setSearchResults([]);
    setSelectedBusinesses([]);

    try {
      const { data, error } = await supabase.functions.invoke(
        "search-nearby-businesses",
        {
          body: {
            location: searchParams.location,
            categories: selectedCategories,
            radius: searchParams.radius,
          },
        }
      );

      if (error) throw error;

      const businessesWithPhone = (data.businesses || []).filter(
        (business: BusinessResult) => business.phone
      );
      setSearchResults(businessesWithPhone);

      if (businessesWithPhone.length === 0) {
        toast.info("Nenhum negócio com WhatsApp encontrado");
      } else {
        toast.success(
          `${businessesWithPhone.length} negócio(s) com WhatsApp encontrado(s)`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao buscar negócios: " + errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessToggle = (index: number) => {
    setSelectedBusinesses((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleBusinessPreview = (business: BusinessResult, index: number) => {
    setPreviewBusiness(business);
    setPreviewOpen(true);
  };

  const handlePreviewToggleSelection = () => {
    if (previewBusiness) {
      const index = searchResults.findIndex(
        (b) =>
          b.name === previewBusiness.name &&
          b.address === previewBusiness.address
      );
      if (index !== -1) {
        handleBusinessToggle(index);
      }
    }
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
    const businessesToAdd = selectedBusinesses.map(
      (index) => searchResults[index]
    );
    setLoading(true);
    setLoadingMessage("Validando números no WhatsApp...");

    try {
      // Coletar todos os números para validação
      const phonesToCheck = businessesToAdd
        .map((business) =>
          business.phone ? cleanPhoneNumber(business.phone) : null
        )
        .filter((phone): phone is string => phone !== null);

      if (phonesToCheck.length === 0) {
        toast.error("Nenhum número de telefone válido encontrado");
        setLoading(false);
        return;
      }

      // Validar todos os números via Evolution API
      setLoadingMessage("Validando números no WhatsApp...");
      const { data: checkData, error: checkError } =
        await supabase.functions.invoke("evolution-check-whatsapp", {
          body: { numbers: phonesToCheck },
        });

      if (checkError) {
        console.error("Error checking WhatsApp:", checkError);
        toast.error("Erro ao validar números no WhatsApp");
        setLoading(false);
        setLoadingMessage("");
        return;
      }

      // Criar mapa de número para jid
      interface WhatsAppCheckResult {
        exists: boolean;
        jid?: string;
        number: string;
      }
      const phoneToJidMap: Record<string, string> = {};
      (checkData?.results || []).forEach((result: WhatsAppCheckResult) => {
        if (result.exists && result.jid) {
          phoneToJidMap[result.number] = result.jid;
        }
      });

      // Criar leads apenas para números válidos
      const leadsToInsert = businessesToAdd
        .map((business) => {
          const cleanedPhone = business.phone
            ? cleanPhoneNumber(business.phone)
            : null;
          if (!cleanedPhone || !phoneToJidMap[cleanedPhone]) {
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
            remote_jid: phoneToJidMap[cleanedPhone],
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
        toast.success(
          `${leadsToInsert.length} lead(s) adicionado(s). ${invalidCount} número(s) não estavam no WhatsApp.`
        );
      } else {
        toast.success(
          `${leadsToInsert.length} lead(s) adicionado(s) com sucesso!`
        );
      }

      setSelectedBusinesses([]);
    } catch (error) {
      toast.error("Erro ao adicionar leads");
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const filteredAndSortedResults = useMemo(() => {
    let filtered = [...searchResults];

    if (filterRating !== null) {
      filtered = filtered.filter(
        (business) => business.rating && business.rating >= filterRating
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "category":
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchResults, sortBy, filterRating]);

  const formatRadius = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
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

      <div className="h-[calc(100vh-4rem)] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div>
            <h1 className="text-2xl font-bold">Buscar Novos Leads</h1>
            <p className="text-sm text-muted-foreground">
              Marque a localização no mapa e selecione as categorias
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Sheet
              open={categoriesSheetOpen}
              onOpenChange={setCategoriesSheetOpen}
            >
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings2 className="w-4 h-4" />
                  Categorias
                  {selectedCategories.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedCategories.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:max-w-lg overflow-y-auto"
              >
                <SheetHeader>
                  <SheetTitle>Selecionar Categorias</SheetTitle>
                  <SheetDescription>
                    Selecione as categorias de negócios que deseja buscar. Você
                    pode arrastar as categorias selecionadas para reordená-las.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <CategoriesDragDrop
                    categories={categories}
                    selectedCategories={selectedCategories}
                    onSelectionChange={setSelectedCategories}
                    filter={categoryFilter}
                    onFilterChange={setCategoryFilter}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <Button
              onClick={handleSearch}
              disabled={loading || selectedCategories.length === 0}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Buscar Negócios
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 overflow-hidden">
          <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
            <Card className="flex-1 min-h-0 overflow-hidden">
              <CardContent className="p-0 h-full">
                <InteractiveMap
                  center={mapCenter}
                  radius={searchParams.radius}
                  onLocationChange={handleMapLocationChange}
                  onRadiusChange={handleMapRadiusChange}
                  address={currentAddress}
                  className="h-full"
                />
              </CardContent>
            </Card>

            <Card className="p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Buscar Localização</Label>
                  <LocationAutocomplete
                    value={searchParams.location}
                    onChange={(value) =>
                      setSearchParams((prev) => ({ ...prev, location: value }))
                    }
                    onLocationSelect={handleLocationSelect}
                    placeholder="Digite uma cidade, endereço ou localização..."
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>
                      Raio de Busca: {formatRadius(searchParams.radius)}
                    </Label>
                    <Badge variant="secondary">
                      {formatRadius(searchParams.radius)}
                    </Badge>
                  </div>
                  <Slider
                    min={1000}
                    max={50000}
                    step={1000}
                    value={[searchParams.radius]}
                    onValueChange={(value) => {
                      setSearchParams((prev) => ({
                        ...prev,
                        radius: value[0],
                      }));
                      handleMapRadiusChange(value[0]);
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 km</span>
                    <span>50 km</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3 flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                {loading && (
                  <Card className="p-0">
                    <AnimatedLoading />
                  </Card>
                )}

                {!loading && searchResults.length > 0 && (
                  <>
                    <Card className="p-4">
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">
                            Resultados ({filteredAndSortedResults.length})
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedBusinesses.length > 0 &&
                              `${selectedBusinesses.length} selecionado(s)`}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          {selectedBusinesses.length > 0 && (
                            <Button onClick={handleAddToLeads} size="sm">
                              <Plus className="w-4 h-4 mr-2" />
                              Adicionar {selectedBusinesses.length} Lead(s)
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4 text-muted-foreground" />
                          <Label className="text-sm">Ordenar por:</Label>
                          <Select
                            value={sortBy}
                            onValueChange={(
                              value: "name" | "rating" | "category"
                            ) => setSortBy(value)}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="name">
                                <div className="flex items-center gap-2">
                                  <ArrowUpDown className="w-4 h-4" />
                                  Nome
                                </div>
                              </SelectItem>
                              <SelectItem value="rating">
                                <div className="flex items-center gap-2">
                                  <Star className="w-4 h-4" />
                                  Avaliação
                                </div>
                              </SelectItem>
                              <SelectItem value="category">
                                <div className="flex items-center gap-2">
                                  <Filter className="w-4 h-4" />
                                  Categoria
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">
                            Filtrar por avaliação:
                          </Label>
                          <Select
                            value={filterRating?.toString() || "all"}
                            onValueChange={(value) =>
                              setFilterRating(
                                value === "all" ? null : Number(value)
                              )
                            }
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              <SelectItem value="4">4+ estrelas</SelectItem>
                              <SelectItem value="3">3+ estrelas</SelectItem>
                              <SelectItem value="2">2+ estrelas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredAndSortedResults.map((business) => {
                        const originalIndex = searchResults.findIndex(
                          (b) =>
                            b.name === business.name &&
                            b.address === business.address
                        );
                        const isSelected =
                          originalIndex !== -1 &&
                          selectedBusinesses.includes(originalIndex);

                        return (
                          <Card
                            key={`${business.name}-${business.address}-${originalIndex}`}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-md"
                                : "hover:border-accent"
                            }`}
                            onClick={() =>
                              originalIndex !== -1 &&
                              handleBusinessPreview(business, originalIndex)
                            }
                          >
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-base mb-1 line-clamp-1">
                                    {business.name}
                                  </h4>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <p className="line-clamp-2">
                                      {business.address}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBusinessPreview(
                                        business,
                                        originalIndex
                                      );
                                    }}
                                    className="h-8 w-8 p-0"
                                    title="Ver detalhes"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {originalIndex !== -1 && (
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() =>
                                        handleBusinessToggle(originalIndex)
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                      className="shrink-0"
                                    />
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {business.category}
                                </Badge>
                                {business.rating && (
                                  <Badge variant="outline" className="text-xs">
                                    <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                                    {business.rating.toFixed(1)}
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-1.5 pt-2 border-t">
                                {business.phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span className="text-muted-foreground">
                                      {business.phone}
                                    </span>
                                  </div>
                                )}
                                {business.email && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span className="text-muted-foreground truncate">
                                      {business.email}
                                    </span>
                                  </div>
                                )}
                                {business.latitude && business.longitude && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Map className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span className="text-muted-foreground text-xs">
                                      {business.latitude.toFixed(4)},{" "}
                                      {business.longitude.toFixed(4)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {filteredAndSortedResults.length === 0 &&
                      searchResults.length > 0 && (
                        <Card className="p-8 text-center">
                          <p className="text-muted-foreground">
                            Nenhum resultado encontrado com os filtros
                            aplicados.
                          </p>
                        </Card>
                      )}
                  </>
                )}

                {!loading && searchResults.length === 0 && (
                  <Card className="p-8 text-center">
                    <Map className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Nenhum resultado ainda
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Selecione as categorias e clique em "Buscar Negócios" para
                      começar
                    </p>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      <LeadPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        business={previewBusiness}
        isSelected={
          previewBusiness
            ? (() => {
                const index = searchResults.findIndex(
                  (b) =>
                    b.name === previewBusiness.name &&
                    b.address === previewBusiness.address
                );
                return index !== -1 && selectedBusinesses.includes(index);
              })()
            : false
        }
        onToggleSelection={handlePreviewToggleSelection}
      />
    </Layout>
  );
};

export default LeadSearch;
