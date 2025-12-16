import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Agent,
  AgentTemplateService,
  IAgentData,
} from "@/services/agents/AgentDomain";
import { AgentRepository } from "@/services/agents/AgentRepository";
import { PersonalityTraitsDragDrop } from "@/components/agents/PersonalityTraitsDragDrop";
import { VisualLevelSelector } from "@/components/agents/VisualLevelSelector";
import { AgentPreview } from "@/components/agents/AgentPreview";
import { StepNavigation } from "@/components/agents/StepNavigation";
import { Save, ArrowLeft, Sparkles } from "lucide-react";
import { IconSelector } from "@/components/agents/IconSelector";
import { ColorPicker } from "@/components/agents/ColorPicker";

const AVAILABLE_TRAITS = [
  "empático",
  "analítico",
  "persuasivo",
  "paciente",
  "proativo",
  "criativo",
  "resolutivo",
  "prestativo",
  "entusiasmado",
  "focado",
  "diplomático",
  "atento",
  "organizado",
  "eficiente",
  "claro",
  "amigável",
  "curioso",
  "respeitoso",
  "objetivo",
];

const AgentCreate = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrganization();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [agent, setAgent] = useState<Agent>(
    new Agent({
      name: "",
      agent_description: null,
      conversation_focus: "",
      priority: "medium",
      rejection_action: "follow_up",
      tone: "professional",
      main_objective: "",
      additional_instructions: null,
      closing_instructions: null,
      personality_traits: [],
      communication_style: "balanced",
      expertise_level: "intermediate",
      response_length: "medium",
      empathy_level: "moderate",
      formality_level: "professional",
      humor_level: "none",
      proactivity_level: "moderate",
      agent_avatar_url: null,
      agent_color: "#3b82f6",
    })
  );

  const repository = new AgentRepository();

  const steps = [
    { id: "basic", label: "Básico", description: "Informações principais" },
    {
      id: "visual",
      label: "Visual",
      description: "Personalização visual",
    },
    {
      id: "personality",
      label: "Personalidade",
      description: "Traços e comportamento",
    },
    {
      id: "advanced",
      label: "Avançado",
      description: "Configurações detalhadas",
    },
    { id: "review", label: "Revisão", description: "Confirme e salve" },
  ];

  useEffect(() => {
    if (id) {
      loadAgent(id);
    }
  }, [id]);

  const loadAgent = async (agentId: string) => {
    setLoading(true);
    try {
      const data = await repository.findById(agentId);
      if (data) {
        setAgent(new Agent(data));
        setCurrentStep(0);
      }
    } catch (error) {
      toast.error("Erro ao carregar agente");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (
    template: ReturnType<typeof AgentTemplateService.getTemplates>[0]
  ) => {
    const newAgent = new Agent({
      name: "",
      agent_description: null,
      conversation_focus: "",
      priority: "medium",
      rejection_action: "follow_up",
      tone: "professional",
      main_objective: "",
      additional_instructions: null,
      closing_instructions: null,
      personality_traits: [],
      communication_style: "balanced",
      expertise_level: "intermediate",
      response_length: "medium",
      empathy_level: "moderate",
      formality_level: "professional",
      humor_level: "none",
      proactivity_level: "moderate",
      agent_avatar_url: template.icon ? `emoji:${template.icon}` : null,
      agent_color: "#3b82f6",
    });
    AgentTemplateService.applyTemplate(newAgent, template);
    setAgent(newAgent);
    toast.success(`Template "${template.name}" aplicado!`);
  };

  const handleFieldChange = <K extends keyof IAgentData>(
    field: K,
    value: IAgentData[K]
  ) => {
    const newAgent = new Agent(agent.getData());
    newAgent.updateField(field, value);
    setAgent(newAgent);
  };

  const handleTraitsChange = (traits: string[]) => {
    handleFieldChange("personality_traits", traits);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    const validation = agent.validate();
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }

    if (!organization?.id) {
      toast.error("Organização não encontrada");
      return;
    }

    setLoading(true);
    try {
      const agentData = agent.getData();
      const dataToSave = {
        ...agentData,
        organization_id: organization.id,
      };

      if (id) {
        await repository.update(id, dataToSave);
        toast.success("Agente atualizado com sucesso!");
      } else {
        await repository.save(dataToSave);
        toast.success("Agente criado com sucesso!");
      }

      navigate("/ai-interaction");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar agente");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const agentData = agent.getData();

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in-50 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/ai-interaction")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {id ? "Editar Agente" : "Criar Novo Agente"}
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Configure seu agente de IA de forma interativa e intuitiva
              </p>
            </div>
          </div>
        </div>

        <StepNavigation
          steps={steps}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          onNext={handleNext}
          onPrevious={handlePrevious}
          canGoNext={currentStep < steps.length - 1}
          canGoPrevious={currentStep > 0}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Informações Básicas
                    </h3>

                    <div className="space-y-4 mb-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome do Agente *</Label>
                        <Input
                          id="name"
                          value={agentData.name}
                          onChange={(e) =>
                            handleFieldChange("name", e.target.value)
                          }
                          placeholder="Ex: Vendedor Consultivo"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          value={agentData.agent_description || ""}
                          onChange={(e) =>
                            handleFieldChange(
                              "agent_description",
                              e.target.value || null
                            )
                          }
                          placeholder="Breve descrição do agente..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="conversation_focus">
                          Foco da Conversa *
                        </Label>
                        <Input
                          id="conversation_focus"
                          value={agentData.conversation_focus}
                          onChange={(e) =>
                            handleFieldChange(
                              "conversation_focus",
                              e.target.value
                            )
                          }
                          placeholder="Ex: vendas de soluções de automação"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="main_objective">
                          Objetivo Principal *
                        </Label>
                        <Textarea
                          id="main_objective"
                          value={agentData.main_objective}
                          onChange={(e) =>
                            handleFieldChange("main_objective", e.target.value)
                          }
                          placeholder="Ex: Identificar necessidades e agendar reunião comercial"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="priority">Prioridade</Label>
                          <Select
                            value={agentData.priority}
                            onValueChange={(value) =>
                              handleFieldChange("priority", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Baixa</SelectItem>
                              <SelectItem value="medium">Média</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="tone">Tom de Voz</Label>
                          <Select
                            value={agentData.tone}
                            onValueChange={(value) =>
                              handleFieldChange("tone", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="professional">
                                Profissional
                              </SelectItem>
                              <SelectItem value="friendly">Amigável</SelectItem>
                              <SelectItem value="enthusiastic">
                                Entusiasmado
                              </SelectItem>
                              <SelectItem value="direct">Direto</SelectItem>
                              <SelectItem value="empathetic">
                                Empático
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rejection_action">
                          Ação quando Lead Rejeitar
                        </Label>
                        <Select
                          value={agentData.rejection_action}
                          onValueChange={(value) =>
                            handleFieldChange("rejection_action", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="follow_up">
                              Agendar Follow-up
                            </SelectItem>
                            <SelectItem value="offer_alternative">
                              Oferecer Alternativas
                            </SelectItem>
                            <SelectItem value="ask_reason">
                              Perguntar Motivo
                            </SelectItem>
                            <SelectItem value="thank_and_close">
                              Encerrar Educadamente
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm text-muted-foreground">
                          Template (Opcional)
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Comece com uma configuração pré-definida ou pule para
                        criar do zero
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {AgentTemplateService.getTemplates().map((template) => (
                          <button
                            key={template.name}
                            type="button"
                            onClick={() => handleTemplateSelect(template)}
                            className="p-2 border rounded-md hover:border-primary/50 hover:bg-muted/50 transition-all text-left group"
                          >
                            <div className="flex items-start gap-2">
                              <div className="text-xl">{template.icon}</div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-xs mb-0.5 truncate">
                                  {template.name}
                                </h4>
                                <p className="text-[10px] text-muted-foreground line-clamp-2">
                                  {template.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Personalização Visual
                    </h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label>Ícone do Agente</Label>
                        <IconSelector
                          value={agentData.agent_avatar_url}
                          onChange={(value) =>
                            handleFieldChange("agent_avatar_url", value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <ColorPicker
                          value={agentData.agent_color}
                          onChange={(value) =>
                            handleFieldChange("agent_color", value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Personalidade e Comportamento
                    </h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label>Traços de Personalidade</Label>
                        <PersonalityTraitsDragDrop
                          traits={agentData.personality_traits}
                          availableTraits={AVAILABLE_TRAITS}
                          onTraitsChange={handleTraitsChange}
                        />
                      </div>

                      <VisualLevelSelector
                        label="Estilo de Comunicação"
                        value={agentData.communication_style}
                        onChange={(value) =>
                          handleFieldChange("communication_style", value)
                        }
                        options={[
                          {
                            value: "direct",
                            label: "Direto",
                            emoji: "🎯",
                            description: "Objetivo e direto ao ponto",
                          },
                          {
                            value: "consultative",
                            label: "Consultivo",
                            emoji: "💡",
                            description: "Foca em entender e aconselhar",
                          },
                          {
                            value: "supportive",
                            label: "Suportivo",
                            emoji: "🤝",
                            description: "Empático e acolhedor",
                          },
                          {
                            value: "balanced",
                            label: "Equilibrado",
                            emoji: "⚖️",
                            description: "Combina diferentes estilos",
                          },
                        ]}
                      />

                      <VisualLevelSelector
                        label="Nível de Expertise"
                        value={agentData.expertise_level}
                        onChange={(value) =>
                          handleFieldChange("expertise_level", value)
                        }
                        options={[
                          {
                            value: "beginner",
                            label: "Iniciante",
                            emoji: "🌱",
                            description: "Básico e simples",
                          },
                          {
                            value: "intermediate",
                            label: "Intermediário",
                            emoji: "📚",
                            description: "Conhecimento moderado",
                          },
                          {
                            value: "advanced",
                            label: "Avançado",
                            emoji: "🎓",
                            description: "Alto conhecimento",
                          },
                          {
                            value: "expert",
                            label: "Especialista",
                            emoji: "🏆",
                            description: "Máximo conhecimento",
                          },
                        ]}
                      />

                      <VisualLevelSelector
                        label="Comprimento da Resposta"
                        value={agentData.response_length}
                        onChange={(value) =>
                          handleFieldChange("response_length", value)
                        }
                        options={[
                          { value: "short", label: "Curta", emoji: "📝" },
                          { value: "medium", label: "Média", emoji: "📄" },
                          { value: "long", label: "Longa", emoji: "📑" },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Configurações Avançadas
                    </h3>
                    <div className="space-y-6">
                      <VisualLevelSelector
                        label="Nível de Empatia"
                        value={agentData.empathy_level}
                        onChange={(value) =>
                          handleFieldChange("empathy_level", value)
                        }
                        options={[
                          { value: "low", label: "Baixa", emoji: "😐" },
                          { value: "moderate", label: "Moderada", emoji: "🙂" },
                          { value: "high", label: "Alta", emoji: "😊" },
                        ]}
                      />

                      <VisualLevelSelector
                        label="Nível de Formalidade"
                        value={agentData.formality_level}
                        onChange={(value) =>
                          handleFieldChange("formality_level", value)
                        }
                        options={[
                          { value: "casual", label: "Casual", emoji: "👕" },
                          {
                            value: "professional",
                            label: "Profissional",
                            emoji: "👔",
                          },
                          { value: "formal", label: "Formal", emoji: "🎩" },
                        ]}
                      />

                      <VisualLevelSelector
                        label="Nível de Humor"
                        value={agentData.humor_level}
                        onChange={(value) =>
                          handleFieldChange("humor_level", value)
                        }
                        options={[
                          { value: "none", label: "Nenhum", emoji: "😐" },
                          { value: "subtle", label: "Sutil", emoji: "😊" },
                          { value: "moderate", label: "Moderado", emoji: "😄" },
                          { value: "high", label: "Alto", emoji: "😂" },
                        ]}
                      />

                      <VisualLevelSelector
                        label="Nível de Proatividade"
                        value={agentData.proactivity_level}
                        onChange={(value) =>
                          handleFieldChange("proactivity_level", value)
                        }
                        options={[
                          { value: "passive", label: "Passivo", emoji: "⏸️" },
                          { value: "moderate", label: "Moderado", emoji: "▶️" },
                          { value: "high", label: "Alto", emoji: "🚀" },
                        ]}
                      />

                      <div className="space-y-2">
                        <Label htmlFor="closing_instructions">
                          Instruções de Fechamento (Opcional)
                        </Label>
                        <Textarea
                          id="closing_instructions"
                          value={agentData.closing_instructions || ""}
                          onChange={(e) =>
                            handleFieldChange(
                              "closing_instructions",
                              e.target.value || null
                            )
                          }
                          placeholder="Como finalizar quando não fechar a venda..."
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="additional_instructions">
                          Instruções Adicionais (Opcional)
                        </Label>
                        <Textarea
                          id="additional_instructions"
                          value={agentData.additional_instructions || ""}
                          onChange={(e) =>
                            handleFieldChange(
                              "additional_instructions",
                              e.target.value || null
                            )
                          }
                          placeholder="Instruções específicas adicionais..."
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Revisão Final
                    </h3>
                    <div className="space-y-4">
                      <Card className="p-4">
                        <h4 className="font-semibold mb-2">
                          Informações Básicas
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">Nome:</span>{" "}
                            {agentData.name || "Não definido"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Foco:</span>{" "}
                            {agentData.conversation_focus || "Não definido"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              Objetivo:
                            </span>{" "}
                            {agentData.main_objective || "Não definido"}
                          </p>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <h4 className="font-semibold mb-2">Personalidade</h4>
                        <div className="flex flex-wrap gap-2">
                          {agentData.personality_traits.length > 0 ? (
                            agentData.personality_traits.map((trait) => (
                              <span
                                key={trait}
                                className="px-2 py-1 bg-secondary rounded text-sm"
                              >
                                {trait}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Nenhum traço definido
                            </span>
                          )}
                        </div>
                      </Card>

                      <Card className="p-4">
                        <h4 className="font-semibold mb-2">Configurações</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p>
                            <span className="text-muted-foreground">
                              Prioridade:
                            </span>{" "}
                            <span className="capitalize">
                              {agentData.priority}
                            </span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Tom:</span>{" "}
                            <span className="capitalize">{agentData.tone}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              Estilo:
                            </span>{" "}
                            <span className="capitalize">
                              {agentData.communication_style}
                            </span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              Expertise:
                            </span>{" "}
                            <span className="capitalize">
                              {agentData.expertise_level}
                            </span>
                          </p>
                        </div>
                      </Card>

                      <div className="flex gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePrevious}
                          className="flex-1"
                        >
                          Voltar
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSave}
                          disabled={loading}
                          className="flex-1"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {loading
                            ? "Salvando..."
                            : id
                            ? "Atualizar"
                            : "Criar Agente"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-1">
            <AgentPreview
              agent={agentData}
              onIconChange={(value) =>
                handleFieldChange("agent_avatar_url", value)
              }
              onColorChange={(value) => handleFieldChange("agent_color", value)}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AgentCreate;
