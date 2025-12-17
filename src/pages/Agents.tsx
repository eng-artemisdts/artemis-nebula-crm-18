import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Bot,
  Zap,
  TrendingUp,
  MessageSquare,
  Calendar,
  Mail,
  Target,
  RefreshCw,
  MoreVertical,
  Activity,
  Eye,
  Heart,
  Smile,
  User,
  Clock,
  ArrowRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { ComponentRepository } from "@/services/components/ComponentRepository";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AgentViewModal } from "@/components/agents/AgentViewModal";
import { AgentWithComponents } from "@/components/agents/types";

type ViewMode = "compact" | "detailed";

const Agents = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentWithComponents[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] =
    useState<AgentWithComponents | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("agentViewMode");
    return (saved as ViewMode) || "detailed";
  });
  const componentRepository = useMemo(() => new ComponentRepository(), []);

  useEffect(() => {
    localStorage.setItem("agentViewMode", viewMode);
  }, [viewMode]);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_interaction_settings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar agentes");
      console.error(error);
    } else {
      const agentsWithComponents = await Promise.all(
        (data || []).map(async (agent) => {
          try {
            const components = await componentRepository.findEnabledForAgent(
              agent.id
            );
            return {
              ...agent,
              components: components.map((c) => ({
                id: c.id,
                name: c.name,
                identifier: c.identifier,
              })),
            };
          } catch (error) {
            console.error(
              `Erro ao buscar componentes do agente ${agent.id}:`,
              error
            );
            return { ...agent, components: [] };
          }
        })
      );
      setAgents(agentsWithComponents);
    }
    setLoading(false);
  }, [componentRepository]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleEdit = (agent: AgentWithComponents) => {
    navigate(`/ai-interaction/edit/${agent.id}`);
  };

  const handleView = (agent: AgentWithComponents) => {
    setSelectedAgent(agent);
    setViewModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este agente?")) return;

    const { error } = await supabase
      .from("ai_interaction_settings")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir agente");
      console.error(error);
    } else {
      toast.success("Agente excluído com sucesso!");
      fetchAgents();
    }
  };

  const getComponentIcon = (identifier: string) => {
    const icons: Record<string, React.ReactNode> = {
      email_sender: <Mail className="w-4 h-4" />,
      meeting_scheduler: <Calendar className="w-4 h-4" />,
      whatsapp_integration: <MessageSquare className="w-4 h-4" />,
      bant_analysis: <Target className="w-4 h-4" />,
      auto_lead_status_update: <RefreshCw className="w-4 h-4" />,
    };
    return icons[identifier] || <Zap className="w-4 h-4" />;
  };

  const getCommunicationStyleLabel = (style: string) => {
    const styles: Record<string, string> = {
      direct: "Direto",
      consultative: "Consultivo",
      supportive: "Suportivo",
      balanced: "Equilibrado",
    };
    return styles[style] || style;
  };

  const getExpertiseLabel = (level: string) => {
    const levels: Record<string, string> = {
      beginner: "Iniciante",
      intermediate: "Intermediário",
      advanced: "Avançado",
      expert: "Especialista",
    };
    return levels[level] || level;
  };

  const getLevelLabel = (level: string, type: string) => {
    const levels: Record<string, Record<string, string>> = {
      empathy: {
        low: "Baixa",
        moderate: "Moderada",
        high: "Alta",
      },
      formality: {
        casual: "Casual",
        professional: "Profissional",
        formal: "Formal",
      },
      humor: {
        none: "Nenhum",
        subtle: "Sutil",
        moderate: "Moderado",
        high: "Alto",
      },
      proactivity: {
        passive: "Passivo",
        moderate: "Moderado",
        high: "Alto",
      },
    };
    return levels[type]?.[level] || level;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <Layout>
      <AgentViewModal
        agent={selectedAgent}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
      />
      <div className="space-y-8 animate-in fade-in-50 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Agentes de IA
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Crie e gerencie agentes personalizados para interagir com seus
              leads
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 p-1 rounded-lg border bg-card">
              <Button
                variant={viewMode === "compact" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3 gap-2"
                onClick={() => setViewMode("compact")}
              >
                <List className="w-4 h-4" />
                <span className="text-xs">Compacto</span>
              </Button>
              <Button
                variant={viewMode === "detailed" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3 gap-2"
                onClick={() => setViewMode("detailed")}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-xs">Detalhado</span>
              </Button>
            </div>
            <Button
              size="lg"
              className="gap-2 transition-all hover:scale-105"
              onClick={() => navigate("/ai-interaction/create")}
            >
              <Plus className="w-5 h-5" />
              Novo Agente
            </Button>
          </div>
        </div>

        {loading && agents.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Carregando agentes...</p>
          </Card>
        ) : agents.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <Sparkles className="w-16 h-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Nenhum agente criado ainda
              </h3>
              <p className="text-muted-foreground mb-6">
                Crie seu primeiro agente personalizado para começar a interagir
                com seus leads
              </p>
              <Button
                onClick={() => navigate("/ai-interaction/create")}
                className="transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Agente
              </Button>
            </div>
          </Card>
        ) : (
          <div
            className={`grid gap-6 ${
              viewMode === "compact"
                ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2"
            }`}
          >
            {agents.map((agent, index) =>
              viewMode === "compact" ? (
                <Card
                  key={agent.id}
                  className="group relative overflow-hidden border-2 transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-2 cursor-pointer animate-in fade-in-50 slide-in-from-bottom-4"
                  style={{
                    borderColor: `${agent.agent_color || "#3b82f6"}20`,
                    animationDelay: `${index * 50}ms`,
                  }}
                  onClick={() => handleView(agent)}
                >
                  <div
                    className="absolute top-0 left-0 w-full h-1.5 transition-all duration-500 group-hover:h-2"
                    style={{
                      backgroundColor: agent.agent_color || "#3b82f6",
                    }}
                  />
                  <div className="relative p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <Avatar
                          className="w-20 h-20 transition-all duration-300 group-hover:scale-110"
                          style={{
                            borderColor: agent.agent_color || "#3b82f6",
                            borderWidth: "3px",
                            borderStyle: "solid",
                          }}
                        >
                          <AvatarImage
                            src={agent.agent_avatar_url || undefined}
                            alt={agent.name}
                          />
                          <AvatarFallback
                            className="flex items-center justify-center"
                            style={{
                              backgroundColor: agent.agent_color || "#3b82f6",
                            }}
                          >
                            <Bot className="w-6 h-6 text-white" />
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center"
                          style={{
                            backgroundColor: agent.agent_color || "#3b82f6",
                          }}
                        >
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xl mb-1.5 truncate group-hover:text-primary transition-colors">
                          {agent.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge
                            variant="secondary"
                            className="text-xs px-2.5 py-0.5"
                            style={{
                              backgroundColor: `${
                                agent.agent_color || "#3b82f6"
                              }15`,
                              color: agent.agent_color || "#3b82f6",
                            }}
                          >
                            {getCommunicationStyleLabel(
                              agent.communication_style
                            )}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs px-2.5 py-0.5"
                          >
                            {getExpertiseLabel(agent.expertise_level)}
                          </Badge>
                        </div>
                        {agent.agent_description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {agent.agent_description}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(agent);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(agent);
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(agent.id);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {agent.components && agent.components.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                          <Activity className="w-3.5 h-3.5" />
                          <span>
                            {agent.components.length} habilidade
                            {agent.components.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {agent.components.slice(0, 3).map((component) => (
                            <Badge
                              key={component.id}
                              variant="secondary"
                              className="text-xs px-2 py-0.5 flex items-center gap-1"
                              style={{
                                backgroundColor: `${
                                  agent.agent_color || "#3b82f6"
                                }15`,
                                borderColor: `${
                                  agent.agent_color || "#3b82f6"
                                }40`,
                              }}
                            >
                              <span
                                style={{
                                  color: agent.agent_color || "#3b82f6",
                                }}
                              >
                                {getComponentIcon(component.identifier)}
                              </span>
                              <span className="truncate max-w-[70px] text-xs">
                                {component.name}
                              </span>
                            </Badge>
                          ))}
                          {agent.components.length > 3 && (
                            <Badge
                              variant="outline"
                              className="text-xs px-2 py-0.5"
                            >
                              +{agent.components.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Heart className="w-3 h-3" />
                        <span className="font-medium">Empatia:</span>
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0"
                        >
                          {getLevelLabel(agent.empathy_level, "empathy")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span className="font-medium">Formalidade:</span>
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0"
                        >
                          {getLevelLabel(agent.formality_level, "formality")}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-medium">
                          {formatDate(agent.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full animate-pulse"
                          style={{
                            backgroundColor: agent.agent_color || "#3b82f6",
                          }}
                        />
                        <span className="text-xs font-medium text-muted-foreground">
                          Ativo
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card
                  key={agent.id}
                  className="group relative overflow-hidden border-2 transition-all duration-700 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-3 cursor-pointer animate-in fade-in-50 slide-in-from-bottom-8"
                  style={{
                    borderColor: `${agent.agent_color || "#3b82f6"}20`,
                    animationDelay: `${index * 100}ms`,
                  }}
                  onClick={() => handleView(agent)}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                    style={{
                      background: `radial-gradient(circle at top right, ${
                        agent.agent_color || "#3b82f6"
                      }15 0%, transparent 70%)`,
                    }}
                  />
                  <div
                    className="absolute top-0 left-0 w-full h-2 transition-all duration-700 group-hover:h-3"
                    style={{
                      background: `linear-gradient(90deg, ${
                        agent.agent_color || "#3b82f6"
                      } 0%, ${agent.agent_color || "#3b82f6"}80 100%)`,
                    }}
                  />

                  <div className="relative p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div
                            className="absolute inset-0 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"
                            style={{
                              backgroundColor: agent.agent_color || "#3b82f6",
                            }}
                          />
                          <Avatar
                            className="w-20 h-20 relative transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/40 group-hover:rotate-3"
                            style={{
                              borderColor: agent.agent_color || "#3b82f6",
                              borderWidth: "3px",
                              borderStyle: "solid",
                            }}
                          >
                            <AvatarImage
                              src={agent.agent_avatar_url || undefined}
                              alt={agent.name}
                            />
                            <AvatarFallback
                              className="flex items-center justify-center transition-all duration-500"
                              style={{
                                backgroundColor: agent.agent_color || "#3b82f6",
                              }}
                            >
                              <Bot className="w-8 h-8 text-white" />
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-3 border-background flex items-center justify-center transition-all duration-500 group-hover:scale-125 group-hover:rotate-12 shadow-lg"
                            style={{
                              backgroundColor: agent.agent_color || "#3b82f6",
                            }}
                          >
                            <Bot className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div
                            className="absolute -top-1 -left-1 w-3 h-3 rounded-full animate-ping opacity-75"
                            style={{
                              backgroundColor: agent.agent_color || "#3b82f6",
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <h3 className="font-bold text-xl mb-1.5 truncate group-hover:text-primary transition-colors duration-300">
                            {agent.name}
                          </h3>
                          {agent.agent_description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                              {agent.agent_description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className="text-xs px-2.5 py-0.5 font-semibold transition-all hover:scale-105"
                              style={{
                                backgroundColor: `${
                                  agent.agent_color || "#3b82f6"
                                }15`,
                                color: agent.agent_color || "#3b82f6",
                              }}
                            >
                              {getCommunicationStyleLabel(
                                agent.communication_style
                              )}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs px-2.5 py-0.5 font-semibold transition-all hover:scale-105"
                            >
                              {getExpertiseLabel(agent.expertise_level)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(agent);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(agent);
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(agent.id);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50 group-hover:bg-muted/50 transition-colors">
                        <p className="text-xs text-foreground leading-relaxed">
                          <span className="font-semibold text-primary">
                            Objetivo:{" "}
                          </span>
                          {agent.main_objective}
                        </p>
                      </div>

                      {agent.components && agent.components.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-semibold">
                              <Activity className="w-4 h-4 text-primary" />
                              <span>
                                {agent.components.length}{" "}
                                {agent.components.length === 1
                                  ? "Habilidade"
                                  : "Habilidades"}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleView(agent);
                              }}
                            >
                              Ver todas
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {agent.components.slice(0, 5).map((component) => (
                              <Badge
                                key={component.id}
                                variant="secondary"
                                className="text-xs px-2.5 py-1 flex items-center gap-1.5 transition-all hover:scale-105 hover:shadow-md cursor-default"
                                style={{
                                  borderColor: `${
                                    agent.agent_color || "#3b82f6"
                                  }50`,
                                  backgroundColor: `${
                                    agent.agent_color || "#3b82f6"
                                  }15`,
                                }}
                              >
                                <span
                                  className="transition-transform group-hover:rotate-12"
                                  style={{
                                    color: agent.agent_color || "#3b82f6",
                                  }}
                                >
                                  {getComponentIcon(component.identifier)}
                                </span>
                                <span className="truncate max-w-[90px] font-medium text-xs">
                                  {component.name}
                                </span>
                              </Badge>
                            ))}
                            {agent.components.length > 5 && (
                              <Badge
                                variant="outline"
                                className="text-xs px-2.5 py-1 font-semibold"
                              >
                                +{agent.components.length - 5}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                        <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/20 group-hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Heart className="w-3.5 h-3.5" />
                            <span>Empatia</span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs font-semibold"
                            style={{
                              borderColor: `${
                                agent.agent_color || "#3b82f6"
                              }40`,
                            }}
                          >
                            {getLevelLabel(agent.empathy_level, "empathy")}
                          </Badge>
                        </div>
                        <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/20 group-hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <User className="w-3.5 h-3.5" />
                            <span>Formalidade</span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs font-semibold"
                            style={{
                              borderColor: `${
                                agent.agent_color || "#3b82f6"
                              }40`,
                            }}
                          >
                            {getLevelLabel(agent.formality_level, "formality")}
                          </Badge>
                        </div>
                        <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/20 group-hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Smile className="w-3.5 h-3.5" />
                            <span>Humor</span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs font-semibold"
                            style={{
                              borderColor: `${
                                agent.agent_color || "#3b82f6"
                              }40`,
                            }}
                          >
                            {getLevelLabel(agent.humor_level, "humor")}
                          </Badge>
                        </div>
                        <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/20 group-hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Proatividade</span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs font-semibold"
                            style={{
                              borderColor: `${
                                agent.agent_color || "#3b82f6"
                              }40`,
                            }}
                          >
                            {getLevelLabel(
                              agent.proactivity_level,
                              "proactivity"
                            )}
                          </Badge>
                        </div>
                      </div>

                      {agent.personality_traits &&
                        agent.personality_traits.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {agent.personality_traits
                              .slice(0, 5)
                              .map((trait) => (
                                <Badge
                                  key={trait}
                                  variant="outline"
                                  className="text-xs px-2.5 py-0.5 font-medium transition-all hover:scale-105"
                                  style={{
                                    borderColor: `${
                                      agent.agent_color || "#3b82f6"
                                    }40`,
                                  }}
                                >
                                  {trait}
                                </Badge>
                              ))}
                            {agent.personality_traits.length > 5 && (
                              <Badge
                                variant="outline"
                                className="text-xs px-2.5 py-0.5 font-semibold"
                              >
                                +{agent.personality_traits.length - 5}
                              </Badge>
                            )}
                          </div>
                        )}

                      {agent.response_length && (
                        <div className="pt-2 border-t border-border/50">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="font-medium">
                              Tamanho da Resposta:
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {getLevelLabel(
                                agent.response_length,
                                "response_length"
                              )}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-medium">
                          {formatDate(agent.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(agent);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          Ver detalhes
                        </Button>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full animate-pulse shadow-lg"
                            style={{
                              backgroundColor: agent.agent_color || "#3b82f6",
                              boxShadow: `0 0 8px ${
                                agent.agent_color || "#3b82f6"
                              }50`,
                            }}
                          />
                          <span className="text-xs font-medium text-muted-foreground">
                            Ativo
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Agents;
