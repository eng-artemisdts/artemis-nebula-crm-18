import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, X, Sparkles } from "lucide-react";
import {
  AgentScriptRepository,
  IAgentScript,
  IAgentScriptData,
} from "@/services/agents/AgentScriptRepository";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

const LabelWithTooltip = ({
  htmlFor,
  children,
  tooltip,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  tooltip: string;
}) => {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={htmlFor}>{children}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

interface AgentScriptFormProps {
  organizationId: string;
  script?: IAgentScript;
  onSave: () => void;
  onCancel: () => void;
}

export const AgentScriptForm = ({
  organizationId,
  script,
  onSave,
  onCancel,
}: AgentScriptFormProps) => {
  const repository = new AgentScriptRepository();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<IAgentScriptData>({
    organization_id: organizationId,
    name: script?.name || "",
    description: script?.description || null,
    scenario_detection_enabled: script?.scenario_detection_enabled || false,
    proactive_opening_message: script?.proactive_opening_message || null,
    proactive_hook_message: script?.proactive_hook_message || null,
    proactive_development_paper: script?.proactive_development_paper || null,
    proactive_development_system: script?.proactive_development_system || null,
    receptive_welcome_template: script?.receptive_welcome_template || null,
    receptive_qualification_question:
      script?.receptive_qualification_question || null,
    receptive_deepening_question: script?.receptive_deepening_question || null,
    receptive_value_proposition: script?.receptive_value_proposition || null,
    company_clients: script?.company_clients || [],
    total_clients: script?.total_clients || null,
  });

  const handleFieldChange = <K extends keyof IAgentScriptData>(
    field: K,
    value: IAgentScriptData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || formData.name.trim().length === 0) {
      toast.error("Nome do roteiro é obrigatório");
      return;
    }

    setLoading(true);
    try {
      if (script?.id) {
        await repository.update(script.id, formData);
        toast.success("Roteiro atualizado com sucesso!");
      } else {
        await repository.save(formData);
        toast.success("Roteiro criado com sucesso!");
      }
      onSave();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao salvar roteiro: ${errorMessage}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <LabelWithTooltip
            htmlFor="name"
            tooltip="Nome identificador do roteiro. Este será usado para selecionar o roteiro ao criar agentes."
          >
            Nome do Roteiro *
          </LabelWithTooltip>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            placeholder="Ex: Roteiro Smart-Insp"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição (Opcional)</Label>
          <Textarea
            id="description"
            value={formData.description || ""}
            onChange={(e) =>
              handleFieldChange("description", e.target.value || null)
            }
            placeholder="Breve descrição do roteiro..."
            rows={2}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="scenario_detection_enabled"
            checked={formData.scenario_detection_enabled || false}
            onChange={(e) =>
              handleFieldChange("scenario_detection_enabled", e.target.checked)
            }
            className="rounded border-gray-300"
          />
          <LabelWithTooltip
            htmlFor="scenario_detection_enabled"
            tooltip="Quando ativado, o agente detecta automaticamente se ele iniciou a conversa (roteiro ativo) ou se o cliente iniciou (roteiro receptivo), e usa o roteiro apropriado."
          >
            Ativar Detecção Automática de Cenário
          </LabelWithTooltip>
        </div>
      </div>

      {formData.scenario_detection_enabled && (
        <Card className="p-6 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/5 to-primary/10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h4 className="text-lg font-semibold text-foreground">
                Roteiros de Conversação
              </h4>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-4 border-t border-border/50 pt-4">
                <h5 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <span className="text-red-500">🔴</span> Roteiro Ativo (Prospecção)
                </h5>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <LabelWithTooltip
                      htmlFor="proactive_opening_message"
                      tooltip="Mensagem inicial quando o agente aborda o cliente."
                    >
                      Mensagem de Abertura
                    </LabelWithTooltip>
                    <Textarea
                      id="proactive_opening_message"
                      value={formData.proactive_opening_message || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "proactive_opening_message",
                          e.target.value || null
                        )
                      }
                      placeholder="Oi, tudo bem? Tenho algumas dúvidas e queria esclarecer com vocês."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <LabelWithTooltip
                      htmlFor="proactive_hook_message"
                      tooltip="Mensagem gancho enviada após a resposta inicial do cliente."
                    >
                      Mensagem Gancho (Após Resposta)
                    </LabelWithTooltip>
                    <Textarea
                      id="proactive_hook_message"
                      value={formData.proactive_hook_message || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "proactive_hook_message",
                          e.target.value || null
                        )
                      }
                      placeholder="É que eu estava olhando o perfil de vocês e vi que a empresa já está bem posicionada. Minha dúvida é pontual: Hoje a equipe de campo de vocês já roda 100% digitalizada ou vocês ainda acabam dependendo de papel e prancheta pra fazer os relatórios?"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <LabelWithTooltip
                      htmlFor="proactive_development_paper"
                      tooltip="Mensagem quando o cliente responde que ainda usa papel/manual."
                    >
                      Desenvolvimento - Cliente Usa Papel
                    </LabelWithTooltip>
                    <Textarea
                      id="proactive_development_paper"
                      value={formData.proactive_development_paper || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "proactive_development_paper",
                          e.target.value || null
                        )
                      }
                      placeholder="A maioria fala que o pior é o tempo perdido passando pro computador depois, né? 😅 Por isso entrei em contato. Nossa solução elimina essa digitação. Quantos técnicos vocês têm na rua hoje?"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <LabelWithTooltip
                      htmlFor="proactive_development_system"
                      tooltip="Mensagem quando o cliente já tem um sistema."
                    >
                      Desenvolvimento - Cliente Já Tem Sistema
                    </LabelWithTooltip>
                    <Textarea
                      id="proactive_development_system"
                      value={formData.proactive_development_system || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "proactive_development_system",
                          e.target.value || null
                        )
                      }
                      placeholder="Ótimo! Que tal eu te mostrar um vídeo rápido de como nossa solução pode complementar o que vocês já têm?"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-border/50 pt-4">
                <h5 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <span className="text-green-500">🟢</span> Roteiro Receptivo (Atendimento)
                </h5>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <LabelWithTooltip
                      htmlFor="receptive_welcome_template"
                      tooltip="Template de acolhimento quando o cliente te chamou."
                    >
                      Template de Acolhimento + Pergunta de Filtro
                    </LabelWithTooltip>
                    <Textarea
                      id="receptive_welcome_template"
                      value={formData.receptive_welcome_template || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "receptive_welcome_template",
                          e.target.value || null
                        )
                      }
                      placeholder="Olá! Claro, posso te explicar como funciona. Mas pra eu te passar a informação certa pro seu caso: hoje a sua operação é focada em qual área?"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <LabelWithTooltip
                      htmlFor="receptive_qualification_question"
                      tooltip="Pergunta de qualificação após o cliente responder sobre o nicho/área."
                    >
                      Pergunta de Aprofundamento (Investigação)
                    </LabelWithTooltip>
                    <Textarea
                      id="receptive_qualification_question"
                      value={formData.receptive_qualification_question || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "receptive_qualification_question",
                          e.target.value || null
                        )
                      }
                      placeholder="Entendi, para [nicho do cliente] temos um módulo específico. E hoje, como seus colaboradores fazem o checklist? É no papelzinho, WhatsApp ou já usam algum app?"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <LabelWithTooltip
                      htmlFor="receptive_deepening_question"
                      tooltip="Pergunta adicional para entender melhor o cenário do cliente."
                    >
                      Pergunta de Aprofundamento Adicional (Opcional)
                    </LabelWithTooltip>
                    <Textarea
                      id="receptive_deepening_question"
                      value={formData.receptive_deepening_question || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "receptive_deepening_question",
                          e.target.value || null
                        )
                      }
                      placeholder="Quantos colaboradores vocês têm na equipe de campo?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <LabelWithTooltip
                      htmlFor="receptive_value_proposition"
                      tooltip="Proposta de valor que deve ser feita APENAS após entender o cenário do cliente."
                    >
                      Proposta de Valor (Após Entender Cenário)
                    </LabelWithTooltip>
                    <Textarea
                      id="receptive_value_proposition"
                      value={formData.receptive_value_proposition || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "receptive_value_proposition",
                          e.target.value || null
                        )
                      }
                      placeholder="Saquei. Muita gente nos procura justamente pra sair desse controle manual. Com nossa solução, você vai ter as fotos e a localização em tempo real. Pelo tamanho da sua operação, acho que vale a pena você ver funcionando. Posso agendar uma demonstração rápida com um especialista?"
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-border/50 pt-4">
                <h5 className="font-semibold text-sm text-foreground">
                  Informações da Empresa
                </h5>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <LabelWithTooltip
                      htmlFor="company_clients"
                      tooltip="Lista de clientes para mencionar quando perguntado. Separe por vírgula ou linha."
                    >
                      Clientes para Mencionar
                    </LabelWithTooltip>
                    <Textarea
                      id="company_clients"
                      value={
                        formData.company_clients
                          ? formData.company_clients.join(", ")
                          : ""
                      }
                      onChange={(e) => {
                        const clients = e.target.value
                          .split(/[,\n]/)
                          .map((c) => c.trim())
                          .filter((c) => c.length > 0);
                        handleFieldChange("company_clients", clients);
                      }}
                      placeholder="Grupo Taua, VLI, Multitex, Volvo, Tora"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      Separe os clientes por vírgula ou linha
                    </p>
                  </div>

                  <div className="space-y-2">
                    <LabelWithTooltip
                      htmlFor="total_clients"
                      tooltip="Número total de clientes para mencionar quando perguntado."
                    >
                      Total de Clientes
                    </LabelWithTooltip>
                    <Input
                      id="total_clients"
                      value={formData.total_clients || ""}
                      onChange={(e) =>
                        handleFieldChange("total_clients", e.target.value || null)
                      }
                      placeholder="Mais de 50 clientes ativos"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          {loading ? "Salvando..." : script ? "Atualizar" : "Criar Roteiro"}
        </Button>
      </div>
    </form>
  );
};
