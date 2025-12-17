import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IAgentData } from "@/services/agents/AgentDomain";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconSelector } from "@/components/agents/IconSelector";
import { ColorPicker } from "@/components/agents/ColorPicker";
import { Pencil, type LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface AgentPreviewProps {
  agent: Partial<IAgentData>;
  onIconChange?: (value: string | null) => void;
  onColorChange?: (value: string) => void;
}

const getIconComponent = (iconName: string): LucideIcon | null => {
  const IconComponent = (LucideIcons as Record<string, LucideIcon>)[iconName];
  return IconComponent || null;
};

const renderAvatarContent = (avatarUrl: string | null | undefined, name?: string) => {
  if (!avatarUrl) {
    return name?.charAt(0).toUpperCase() || "A";
  }

  if (avatarUrl.startsWith("http")) {
    return null;
  }

  if (avatarUrl.startsWith("icon:")) {
    const iconName = avatarUrl.replace("icon:", "");
    const IconComponent = getIconComponent(iconName);
    if (IconComponent) {
      return <IconComponent className="w-8 h-8" />;
    }
  }

  if (avatarUrl.startsWith("emoji:")) {
    return avatarUrl.replace("emoji:", "");
  }

  return name?.charAt(0).toUpperCase() || "A";
};

export const AgentPreview = ({ agent, onIconChange, onColorChange }: AgentPreviewProps) => {
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getToneLabel = (tone?: string) => {
    const tones: Record<string, string> = {
      professional: "Profissional",
      friendly: "Amigável",
      enthusiastic: "Entusiasmado",
      direct: "Direto",
      empathetic: "Empático",
    };
    return tones[tone || ""] || tone || "Não definido";
  };

  const getStyleLabel = (style?: string) => {
    const styles: Record<string, string> = {
      direct: "Direto",
      consultative: "Consultivo",
      supportive: "Suportivo",
      balanced: "Equilibrado",
    };
    return styles[style || ""] || style || "Não definido";
  };

  return (
    <Card className="p-6 space-y-4 sticky top-4">
      <div className="flex items-center gap-4">
        {onIconChange ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative group cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <Avatar className="w-16 h-16 transition-opacity group-hover:opacity-80">
                  {agent.agent_avatar_url && agent.agent_avatar_url.startsWith("http") && (
                    <AvatarImage src={agent.agent_avatar_url} alt={agent.name || "Agente"} />
                  )}
                  <AvatarFallback
                    className={`font-bold text-white flex items-center justify-center ${
                      agent.agent_avatar_url?.startsWith("icon:") ? "text-xl" : "text-2xl"
                    }`}
                    style={{
                      backgroundColor: agent.agent_color || "#3b82f6",
                    }}
                  >
                    {renderAvatarContent(agent.agent_avatar_url, agent.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="w-4 h-4 text-white" />
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <IconSelector
                value={agent.agent_avatar_url || null}
                onChange={onIconChange}
              />
            </PopoverContent>
          </Popover>
        ) : (
          <Avatar className="w-16 h-16">
            {agent.agent_avatar_url && agent.agent_avatar_url.startsWith("http") && (
              <AvatarImage src={agent.agent_avatar_url} alt={agent.name || "Agente"} />
            )}
            <AvatarFallback
              className={`font-bold text-white flex items-center justify-center ${
                agent.agent_avatar_url?.startsWith("icon:") ? "text-xl" : "text-2xl"
              }`}
              style={{
                backgroundColor: agent.agent_color || "#3b82f6",
              }}
            >
              {renderAvatarContent(agent.agent_avatar_url, agent.name)}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1">
          <h3 className="font-bold text-lg">
            {agent.name || "Nome do Agente"}
          </h3>
          {agent.agent_description && (
            <p className="text-sm text-muted-foreground">
              {agent.agent_description}
            </p>
          )}
        </div>
      </div>

      {agent.conversation_focus && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Foco:</p>
          <p className="text-sm font-medium">{agent.conversation_focus}</p>
        </div>
      )}

      {agent.main_objective && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Objetivo:</p>
          <p className="text-sm">{agent.main_objective}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {agent.personality_traits?.map((trait) => (
          <Badge key={trait} variant="secondary">
            {trait}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Prioridade:</span>
          <div className="flex items-center gap-2 mt-1">
            <div
              className={`w-3 h-3 rounded-full ${getPriorityColor(agent.priority)}`}
            />
            <span className="capitalize">{agent.priority || "Média"}</span>
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Tom:</span>
          <p className="font-medium">{getToneLabel(agent.tone)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Estilo:</span>
          <p className="font-medium">{getStyleLabel(agent.communication_style)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Expertise:</span>
          <p className="font-medium capitalize">
            {agent.expertise_level || "Intermediário"}
          </p>
        </div>
      </div>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground mb-2">Configurações:</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Cor:</span>
            {onColorChange ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <div
                      className="w-4 h-4 rounded border border-border"
                      style={{
                        backgroundColor: agent.agent_color || "#3b82f6",
                      }}
                    />
                    <span className="text-[10px] font-mono">
                      {agent.agent_color || "#3b82f6"}
                    </span>
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <ColorPicker
                    value={agent.agent_color || "#3b82f6"}
                    onChange={onColorChange}
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded border border-border"
                  style={{
                    backgroundColor: agent.agent_color || "#3b82f6",
                  }}
                />
                <span className="text-[10px] font-mono">
                  {agent.agent_color || "#3b82f6"}
                </span>
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Empatia:</span>
            <span className="capitalize">{agent.empathy_level || "Moderada"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Formalidade:</span>
            <span className="capitalize">{agent.formality_level || "Profissional"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Humor:</span>
            <span className="capitalize">{agent.humor_level || "Nenhum"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Proatividade:</span>
            <span className="capitalize">{agent.proactivity_level || "Moderada"}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

