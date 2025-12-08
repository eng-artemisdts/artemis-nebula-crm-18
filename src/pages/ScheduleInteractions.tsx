import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Calendar, Eye, X, Search, RefreshCw, Bot, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPhoneDisplay } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import { rabbitMQService, ScheduledInteractionMessage } from "@/services/RabbitMQService";

interface ScheduledInteraction {
  leadId: string;
  leadName: string;
  leadWhatsApp: string;
  remoteJid: string;
  scheduledDateTime: string;
  aiInteractionId: string;
  instanceName: string;
}

interface ScheduledInteractionRow {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_whatsapp: string;
  remote_jid: string;
  scheduled_at: string;
  ai_interaction_id: string;
  ai_interaction_name: string;
  instance_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AIInteractionSetting {
  id: string;
  name: string;
  conversation_focus: string;
}

const ScheduleInteractions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { organization } = useOrganization();
  const [activeTab, setActiveTab] = useState("view");
  const [leads, setLeads] = useState<ScheduledInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defaultAiInteractionId, setDefaultAiInteractionId] = useState<string>("");
  const [instanceName, setInstanceName] = useState<string>("");
  const [scheduledInteractions, setScheduledInteractions] = useState<ScheduledInteractionRow[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [aiInteractionSettings, setAiInteractionSettings] = useState<AIInteractionSetting[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(() => {
    fetchAiInteractionSettings();
  }, []);

  const fetchAiInteractionSettings = async () => {
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from("ai_interaction_settings")
        .select("id, name, conversation_focus")
        .order("name", { ascending: true });

      if (error) throw error;
      setAiInteractionSettings(data || []);

      if (data && data.length > 0 && !defaultAiInteractionId) {
        setDefaultAiInteractionId(data[0].id);
      }
    } catch (error: any) {
      console.error("Erro ao carregar configurações de IA:", error);
      toast.error("Erro ao carregar configurações de IA");
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const state = location.state as { leads?: any[]; aiInteractionId?: string; instanceName?: string };

        if (!state?.leads || state.leads.length === 0) {
          const { data: whatsappInstances } = await supabase
            .from("whatsapp_instances")
            .select("instance_name")
            .eq("status", "connected")
            .order("created_at", { ascending: false })
            .limit(1);

          const instance = whatsappInstances?.[0]?.instance_name || "";
          setInstanceName(instance);
          return;
        }

        const { data: whatsappInstances } = await supabase
          .from("whatsapp_instances")
          .select("instance_name")
          .eq("status", "connected")
          .order("created_at", { ascending: false })
          .limit(1);

        const instance = state.instanceName || whatsappInstances?.[0]?.instance_name || "";
        const aiInteractionId = state.aiInteractionId || defaultAiInteractionId || "";

        setInstanceName(instance);
        if (aiInteractionId) {
          setDefaultAiInteractionId(aiInteractionId);
        }

        const now = new Date();
        const scheduledLeads: ScheduledInteraction[] = state.leads.map((lead, index) => {
          const scheduledDate = new Date(now);
          scheduledDate.setMinutes(scheduledDate.getMinutes() + (index * 5));

          return {
            leadId: lead.id,
            leadName: lead.name,
            leadWhatsApp: lead.contact_whatsapp,
            remoteJid: lead.remote_jid || "",
            scheduledDateTime: format(scheduledDate, "yyyy-MM-dd'T'HH:mm"),
            aiInteractionId: aiInteractionId,
            instanceName: instance
          };
        });

        setLeads(scheduledLeads);
        setActiveTab("schedule");
      } catch (error: any) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados");
      }
    };

    loadData();
  }, [location.state, defaultAiInteractionId]);

  const fetchScheduledInteractions = useCallback(async () => {
    setLoadingScheduled(true);
    try {
      let query = supabase
        .from("scheduled_interactions")
        .select(`
          *,
          leads (
            name,
            contact_whatsapp
          ),
          ai_interaction_settings (
            name
          )
        `)
        .order("scheduled_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const interactionsWithInfo: ScheduledInteractionRow[] = (data || []).map((interaction: any) => ({
        id: interaction.id,
        lead_id: interaction.lead_id,
        lead_name: interaction.leads?.name || "Lead não encontrado",
        lead_whatsapp: interaction.leads?.contact_whatsapp || "",
        remote_jid: interaction.remote_jid,
        scheduled_at: interaction.scheduled_at,
        ai_interaction_id: interaction.ai_interaction_id,
        ai_interaction_name: interaction.ai_interaction_settings?.name || "Configuração não encontrada",
        instance_name: interaction.instance_name,
        status: interaction.status,
        created_at: interaction.created_at,
        updated_at: interaction.updated_at,
      }));

      setScheduledInteractions(interactionsWithInfo);
    } catch (error: any) {
      console.error("Erro ao carregar interações agendadas:", error);
      toast.error("Erro ao carregar interações agendadas");
    } finally {
      setLoadingScheduled(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === "view") {
      fetchScheduledInteractions();
    }
  }, [activeTab, fetchScheduledInteractions]);

  const handleCancelScheduled = async (interactionId: string) => {
    try {
      const { error } = await supabase
        .from("scheduled_interactions")
        .update({ status: "cancelled" })
        .eq("id", interactionId);

      if (error) throw error;

      toast.success("Interação cancelada com sucesso");
      fetchScheduledInteractions();
    } catch (error: any) {
      console.error("Erro ao cancelar interação:", error);
      toast.error("Erro ao cancelar interação");
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendente", className: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" },
      active: { label: "Ativa", className: "bg-blue-500/20 text-blue-600 border-blue-500/30" },
      completed: { label: "Concluída", className: "bg-green-500/20 text-green-600 border-green-500/30" },
      cancelled: { label: "Cancelada", className: "bg-gray-500/20 text-gray-600 border-gray-500/30" },
    };

    const config = configs[status] || configs.pending;

    return (
      <Badge variant="outline" className={`${config.className} border font-medium`}>
        {config.label}
      </Badge>
    );
  };

  const filteredScheduledInteractions = scheduledInteractions.filter((interaction) => {
    const matchesSearch = searchQuery.trim() === "" ||
      interaction.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interaction.ai_interaction_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatPhoneDisplay(interaction.lead_whatsapp).includes(searchQuery);

    return matchesSearch;
  });

  const updateScheduledTime = (leadId: string, dateTime: string) => {
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.leadId === leadId
          ? { ...lead, scheduledDateTime: dateTime }
          : lead
      )
    );
  };

  const updateAiInteraction = (leadId: string, aiInteractionId: string) => {
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.leadId === leadId
          ? { ...lead, aiInteractionId }
          : lead
      )
    );
  };

  const applyToAll = (field: "aiInteraction" | "time", value: string) => {
    if (field === "aiInteraction") {
      setLeads(prevLeads =>
        prevLeads.map(lead => ({ ...lead, aiInteractionId: value }))
      );
      setDefaultAiInteractionId(value);
    } else if (field === "time") {
      const baseDate = new Date(value);
      setLeads(prevLeads =>
        prevLeads.map((lead, index) => {
          const newDate = new Date(baseDate);
          newDate.setMinutes(newDate.getMinutes() + (index * 5));
          return {
            ...lead,
            scheduledDateTime: format(newDate, "yyyy-MM-dd'T'HH:mm")
          };
        })
      );
    }
  };

  const handleSchedule = async () => {
    if (leads.length === 0) {
      toast.error("Nenhum lead para agendar");
      return;
    }

    const invalidLeads = leads.filter(lead => !lead.aiInteractionId || !lead.remoteJid);
    if (invalidLeads.length > 0) {
      toast.error("Alguns leads não têm configuração de IA ou WhatsApp configurado");
      return;
    }

    setSaving(true);

    try {
      const scheduledInteractions = leads.map(lead => ({
        lead_id: lead.leadId,
        ai_interaction_id: lead.aiInteractionId,
        instance_name: lead.instanceName,
        remote_jid: lead.remoteJid,
        scheduled_at: new Date(lead.scheduledDateTime).toISOString(),
        status: "pending"
      }));

      const { data: insertedData, error: insertError } = await supabase
        .from("scheduled_interactions")
        .insert(scheduledInteractions)
        .select();

      if (insertError) {
        throw insertError;
      }

      if (!insertedData || insertedData.length === 0) {
        throw new Error("Nenhuma interação foi inserida no banco de dados");
      }

      const messages: ScheduledInteractionMessage[] = insertedData.map((interaction, index) => ({
        scheduledInteractionId: interaction.id,
        leadId: interaction.lead_id,
        leadName: leads[index].leadName,
        leadWhatsApp: leads[index].leadWhatsApp,
        remoteJid: interaction.remote_jid,
        aiInteractionId: interaction.ai_interaction_id,
        instanceName: interaction.instance_name,
        scheduledAt: interaction.scheduled_at,
      }));

      await rabbitMQService.publishMultipleScheduledInteractions(messages);

      toast.success(`${leads.length} interação(ões) agendada(s) com sucesso!`);

      setLeads([]);
      setActiveTab("view");
      fetchScheduledInteractions();

      navigate("/schedule-interactions", { replace: true });
    } catch (error: any) {
      console.error("Erro ao agendar interações:", error);
      toast.error("Erro ao agendar interações: " + (error.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    return format(now, "yyyy-MM-dd'T'HH:mm");
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Interações Agendadas
              </h1>
              <p className="text-muted-foreground mt-2">
                Agende e visualize interações com IA programadas
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="w-4 h-4" />
              Agendar
            </TabsTrigger>
            <TabsTrigger value="view" className="gap-2">
              <Eye className="w-4 h-4" />
              Visualizar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6 mt-6">
            {leads.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum lead selecionado</h3>
                  <p className="text-muted-foreground text-center mb-6 max-w-md">
                    Para agendar interações, você precisa selecionar leads primeiro.
                    Vá para a página de Leads, selecione os leads desejados e use a ação de agendar interações.
                  </p>
                  <Button onClick={() => navigate("/leads")} className="gap-2">
                    <Users className="w-4 h-4" />
                    Ir para Leads
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      Configurações Gerais
                    </CardTitle>
                    <CardDescription>
                      Aplique configurações para todos os leads de uma vez
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="default-ai-interaction">Configuração de IA Padrão</Label>
                      <Select
                        value={defaultAiInteractionId}
                        onValueChange={(value) => applyToAll("aiInteraction", value)}
                        disabled={loadingSettings}
                      >
                        <SelectTrigger id="default-ai-interaction">
                          <SelectValue placeholder="Selecione uma configuração de IA" />
                        </SelectTrigger>
                        <SelectContent>
                          {aiInteractionSettings.map((setting) => (
                            <SelectItem key={setting.id} value={setting.id}>
                              {setting.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {defaultAiInteractionId && (
                        <p className="text-xs text-muted-foreground">
                          {aiInteractionSettings.find(s => s.id === defaultAiInteractionId)?.conversation_focus}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="start-time">Horário de Início</Label>
                      <Input
                        id="start-time"
                        type="datetime-local"
                        min={getMinDateTime()}
                        onChange={(e) => {
                          if (e.target.value) {
                            applyToAll("time", e.target.value);
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Interações Agendadas ({leads.length})
                    </CardTitle>
                    <CardDescription>
                      Configure individualmente o horário e configuração de IA para cada lead
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lead</TableHead>
                            <TableHead>WhatsApp</TableHead>
                            <TableHead>Data e Hora</TableHead>
                            <TableHead className="min-w-[300px]">Configuração de IA</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leads.map((lead) => (
                            <TableRow key={lead.leadId}>
                              <TableCell className="font-medium">
                                {lead.leadName}
                              </TableCell>
                              <TableCell>
                                {lead.leadWhatsApp ? formatPhoneDisplay(lead.leadWhatsApp) : "-"}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="datetime-local"
                                  value={lead.scheduledDateTime}
                                  min={getMinDateTime()}
                                  onChange={(e) => updateScheduledTime(lead.leadId, e.target.value)}
                                  className="w-[200px]"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={lead.aiInteractionId}
                                  onValueChange={(value) => updateAiInteraction(lead.leadId, value)}
                                  disabled={loadingSettings}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione uma configuração" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {aiInteractionSettings.map((setting) => (
                                      <SelectItem key={setting.id} value={setting.id}>
                                        {setting.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {leads.length > 0 && (
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setLeads([]);
                    setActiveTab("view");
                    navigate("/schedule-interactions", { replace: true });
                  }}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSchedule}
                  disabled={saving || leads.length === 0}
                  className="gap-2"
                >
                  <Bot className="w-4 h-4" />
                  {saving ? "Agendando..." : `Agendar ${leads.length} Interação(ões)`}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="view" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Interações Agendadas
                    </CardTitle>
                    <CardDescription>
                      Visualize e gerencie todas as interações agendadas
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchScheduledInteractions}
                    disabled={loadingScheduled}
                    className="gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingScheduled ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Buscar por lead ou configuração de IA..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loadingScheduled ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando interações agendadas...
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lead</TableHead>
                          <TableHead>WhatsApp</TableHead>
                          <TableHead>Data/Hora Agendada</TableHead>
                          <TableHead className="min-w-[200px]">Configuração de IA</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredScheduledInteractions.length > 0 ? (
                          filteredScheduledInteractions.map((interaction) => (
                            <TableRow key={interaction.id}>
                              <TableCell className="font-medium">
                                {interaction.lead_name}
                              </TableCell>
                              <TableCell>
                                {interaction.lead_whatsapp ? formatPhoneDisplay(interaction.lead_whatsapp) : "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {format(new Date(interaction.scheduled_at), "dd/MM/yyyy", { locale: ptBR })}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(interaction.scheduled_at), "HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[300px]">
                                  <p className="text-sm font-medium" title={interaction.ai_interaction_name}>
                                    {interaction.ai_interaction_name}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(interaction.status)}
                              </TableCell>
                              <TableCell>
                                {interaction.status === "pending" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelScheduled(interaction.id)}
                                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4" />
                                    Cancelar
                                  </Button>
                                )}
                                {interaction.status !== "pending" && (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              {searchQuery.trim() || statusFilter !== "all"
                                ? "Nenhuma interação encontrada com os filtros aplicados"
                                : "Nenhuma interação agendada"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {filteredScheduledInteractions.length > 0 && (
                  <div className="text-sm text-muted-foreground text-center">
                    Mostrando {filteredScheduledInteractions.length} de {scheduledInteractions.length} interação(ões)
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ScheduleInteractions;

