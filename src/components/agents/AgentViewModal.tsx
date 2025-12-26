import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Mail,
  Calendar,
  MessageSquare,
  Target,
  RefreshCw,
  Zap,
  Heart,
  Smile,
  TrendingUp,
  Activity,
  Sparkles,
  Clock,
  User,
  FileText,
  CheckCircle2,
  X,
  Pencil,
  ArrowRight,
  Star,
  MessageCircle,
  Settings,
} from "lucide-react";
import { AgentWithComponents } from "./types";
import { useNavigate } from "react-router-dom";

interface AgentViewModalProps {
  agent: AgentWithComponents | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getComponentIcon = (identifier: string) => {
  const icons: Record<string, React.ReactNode> = {
    email_sender: <Mail className="w-5 h-5" />,
    meeting_scheduler: <Calendar className="w-5 h-5" />,
    whatsapp_integration: <MessageSquare className="w-5 h-5" />,
    bant_analysis: <Target className="w-5 h-5" />,
    auto_lead_status_update: <RefreshCw className="w-5 h-5" />,
    crm_query: <Zap className="w-5 h-5" />,
    proposal_creator: <FileText className="w-5 h-5" />,
    auto_followup: <MessageCircle className="w-5 h-5" />,
    sentiment_analysis: <Heart className="w-5 h-5" />,
    report_generator: <TrendingUp className="w-5 h-5" />,
  };
  return icons[identifier] || <Zap className="w-5 h-5" />;
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
    response_length: {
      short: "Curta",
      medium: "Média",
      long: "Longa",
    },
  };
  return levels[type]?.[level] || level;
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

const getLevelColor = (level: string, type: string) => {
  const colorMap: Record<string, Record<string, string>> = {
    empathy: {
      low: "#ef4444",
      moderate: "#f59e0b",
      high: "#10b981",
    },
    formality: {
      casual: "#8b5cf6",
      professional: "#3b82f6",
      formal: "#1e40af",
    },
    humor: {
      none: "#6b7280",
      subtle: "#f59e0b",
      moderate: "#f97316",
      high: "#ec4899",
    },
    proactivity: {
      passive: "#6b7280",
      moderate: "#3b82f6",
      high: "#10b981",
    },
  };
  return colorMap[type]?.[level] || "#3b82f6";
};

export const AgentViewModal = ({
  agent,
  open,
  onOpenChange,
}: AgentViewModalProps) => {
  const navigate = useNavigate();

  if (!agent) return null;

  const handleEdit = () => {
    onOpenChange(false);
    navigate(`/ai-interaction/edit/${agent.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <div
          className="absolute top-0 left-0 right-0 h-3 z-10"
          style={{
            background: `linear-gradient(90deg, ${
              agent.agent_color || "#3b82f6"
            } 0%, ${agent.agent_color || "#3b82f6"}80 100%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            background: `radial-gradient(circle at top right, ${
              agent.agent_color || "#3b82f6"
            } 0%, transparent 70%)`,
          }}
        />

        <div className="overflow-y-auto flex-1 p-8 pb-10 relative z-10">
          <DialogHeader className="mb-8">
            <div className="flex items-start gap-6 mb-6">
              <div className="relative flex-shrink-0">
                <div
                  className="absolute inset-0 rounded-full blur-2xl opacity-30"
                  style={{
                    backgroundColor: agent.agent_color || "#3b82f6",
                  }}
                />
                <Avatar
                  className="w-32 h-32 relative border-4 transition-all duration-500 hover:scale-105"
                  style={{
                    borderColor: agent.agent_color || "#3b82f6",
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
                    <Bot className="w-12 h-12 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-4 border-background flex items-center justify-center shadow-xl"
                  style={{
                    backgroundColor: agent.agent_color || "#3b82f6",
                  }}
                >
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div
                  className="absolute -top-2 -left-2 w-6 h-6 rounded-full animate-ping opacity-75"
                  style={{
                    backgroundColor: agent.agent_color || "#3b82f6",
                  }}
                />
              </div>
              <div className="flex-1 pt-2">
                <DialogTitle className="text-4xl mb-3 font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {agent.name}
                </DialogTitle>
                {agent.agent_description && (
                  <DialogDescription className="text-base text-muted-foreground leading-relaxed mb-4">
                    {agent.agent_description}
                  </DialogDescription>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge
                    variant="secondary"
                    className="text-sm px-4 py-1.5 font-semibold"
                    style={{
                      backgroundColor: `${agent.agent_color || "#3b82f6"}15`,
                      color: agent.agent_color || "#3b82f6",
                    }}
                  >
                    {getCommunicationStyleLabel(agent.communication_style)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-sm px-4 py-1.5 font-semibold"
                  >
                    {getExpertiseLabel(agent.expertise_level)}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2
                      className="w-4 h-4"
                      style={{
                        color: agent.agent_color || "#3b82f6",
                      }}
                    />
                    <span className="font-medium">Ativo</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="p-5 rounded-xl border bg-card/50 hover:bg-card transition-colors">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <FileText
                      className="w-5 h-5"
                      style={{
                        color: agent.agent_color || "#3b82f6",
                      }}
                    />
                    Objetivo Principal
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {agent.main_objective}
                  </p>
                </div>

                <div className="p-5 rounded-xl border bg-card/50 hover:bg-card transition-colors">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <MessageCircle
                      className="w-5 h-5"
                      style={{
                        color: agent.agent_color || "#3b82f6",
                      }}
                    />
                    Foco da Conversa
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {agent.conversation_focus}
                  </p>
                </div>

                {agent.additional_instructions && (
                  <div className="p-5 rounded-xl border bg-card/50 hover:bg-card transition-colors">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Sparkles
                        className="w-5 h-5"
                        style={{
                          color: agent.agent_color || "#3b82f6",
                        }}
                      />
                      Instruções Adicionais
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {agent.additional_instructions}
                    </p>
                  </div>
                )}

                {agent.closing_instructions && (
                  <div className="p-5 rounded-xl border bg-card/50 hover:bg-card transition-colors">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle2
                        className="w-5 h-5"
                        style={{
                          color: agent.agent_color || "#3b82f6",
                        }}
                      />
                      Instruções de Fechamento
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {agent.closing_instructions}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="p-5 rounded-xl border bg-card/50">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <User
                      className="w-5 h-5"
                      style={{
                        color: agent.agent_color || "#3b82f6",
                      }}
                    />
                    Características
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                        <Heart className="w-4 h-4" />
                        <span>Empatia</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold"
                        style={{
                          borderColor: getLevelColor(
                            agent.empathy_level,
                            "empathy"
                          ),
                          color: getLevelColor(agent.empathy_level, "empathy"),
                        }}
                      >
                        {getLevelLabel(agent.empathy_level, "empathy")}
                      </Badge>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                        <User className="w-4 h-4" />
                        <span>Formalidade</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold"
                        style={{
                          borderColor: getLevelColor(
                            agent.formality_level,
                            "formality"
                          ),
                          color: getLevelColor(
                            agent.formality_level,
                            "formality"
                          ),
                        }}
                      >
                        {getLevelLabel(agent.formality_level, "formality")}
                      </Badge>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                        <Smile className="w-4 h-4" />
                        <span>Humor</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold"
                        style={{
                          borderColor: getLevelColor(
                            agent.humor_level,
                            "humor"
                          ),
                          color: getLevelColor(agent.humor_level, "humor"),
                        }}
                      >
                        {getLevelLabel(agent.humor_level, "humor")}
                      </Badge>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>Proatividade</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold"
                        style={{
                          borderColor: getLevelColor(
                            agent.proactivity_level,
                            "proactivity"
                          ),
                          color: getLevelColor(
                            agent.proactivity_level,
                            "proactivity"
                          ),
                        }}
                      >
                        {getLevelLabel(agent.proactivity_level, "proactivity")}
                      </Badge>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Tamanho da Resposta</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold"
                      >
                        {getLevelLabel(
                          agent.response_length,
                          "response_length"
                        )}
                      </Badge>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                        <User className="w-4 h-4" />
                        <span>Apresentação Inicial</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold"
                        style={{
                          borderColor: agent.should_introduce_itself
                            ? "#10b981"
                            : "#6b7280",
                          color: agent.should_introduce_itself
                            ? "#10b981"
                            : "#6b7280",
                        }}
                      >
                        {agent.should_introduce_itself ? "Sim" : "Não"}
                      </Badge>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                        <Clock className="w-4 h-4" />
                        <span>Memória</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold"
                        style={{
                          borderColor: agent.agent_color || "#3b82f6",
                          color: agent.agent_color || "#3b82f6",
                        }}
                      >
                        {agent.memory_amount || "20"} mensagens
                      </Badge>
                    </div>
                  </div>
                </div>

                {agent.personality_traits &&
                  agent.personality_traits.length > 0 && (
                    <div className="p-5 rounded-xl border bg-card/50">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Star
                          className="w-5 h-5"
                          style={{
                            color: agent.agent_color || "#3b82f6",
                          }}
                        />
                        Traços de Personalidade
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {agent.personality_traits.map((trait) => (
                          <Badge
                            key={trait}
                            variant="outline"
                            className="text-xs px-3 py-1.5 font-medium"
                            style={{
                              borderColor: `${
                                agent.agent_color || "#3b82f6"
                              }40`,
                            }}
                          >
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {agent.components && agent.components.length > 0 && (
              <div className="p-6 rounded-xl border bg-card/50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-xl flex items-center gap-3">
                    <Activity
                      className="w-6 h-6"
                      style={{
                        color: agent.agent_color || "#3b82f6",
                      }}
                    />
                    Habilidades Ativas
                    <Badge
                      variant="secondary"
                      className="text-sm px-3 py-1"
                      style={{
                        backgroundColor: `${agent.agent_color || "#3b82f6"}15`,
                        color: agent.agent_color || "#3b82f6",
                      }}
                    >
                      {agent.components.length}
                    </Badge>
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agent.components.map((component) => (
                    <div
                      key={component.id}
                      className="flex items-center gap-3 p-4 rounded-lg border bg-background/50 hover:bg-background transition-all hover:scale-105 hover:shadow-md cursor-default"
                    >
                      <div
                        className="p-3 rounded-lg flex-shrink-0 transition-transform hover:rotate-12"
                        style={{
                          backgroundColor: `${
                            agent.agent_color || "#3b82f6"
                          }15`,
                          color: agent.agent_color || "#3b82f6",
                        }}
                      >
                        {getComponentIcon(component.identifier)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold block truncate">
                          {component.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {component.identifier.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  Criado em{" "}
                  {new Date(agent.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleEdit}
                  className="gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Editar Agente
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
