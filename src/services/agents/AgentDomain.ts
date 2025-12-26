export interface IAgentData {
  id?: string;
  name: string;
  nickname: string | null;
  agent_description: string | null;
  conversation_focus: string;
  priority: string;
  rejection_action: string;
  tone: string;
  main_objective: string;
  additional_instructions: string | null;
  closing_instructions: string | null;
  personality_traits: string[];
  communication_style: string;
  expertise_level: string;
  response_length: string;
  empathy_level: string;
  formality_level: string;
  humor_level: string;
  proactivity_level: string;
  agent_avatar_url: string | null;
  agent_color: string;
  should_introduce_itself: boolean;
  memory_amount: string;
}

export class Agent {
  constructor(private data: IAgentData) {}

  getName(): string {
    return this.data.name;
  }

  getDescription(): string | null {
    return this.data.agent_description;
  }

  getPersonalityTraits(): string[] {
    return this.data.personality_traits || [];
  }

  addPersonalityTrait(trait: string): void {
    if (!this.data.personality_traits.includes(trait)) {
      this.data.personality_traits.push(trait);
    }
  }

  removePersonalityTrait(trait: string): void {
    this.data.personality_traits = this.data.personality_traits.filter(t => t !== trait);
  }

  reorderPersonalityTraits(fromIndex: number, toIndex: number): void {
    const traits = [...this.data.personality_traits];
    const [removed] = traits.splice(fromIndex, 1);
    traits.splice(toIndex, 0, removed);
    this.data.personality_traits = traits;
  }

  getData(): IAgentData {
    return { ...this.data };
  }

  updateField<K extends keyof IAgentData>(field: K, value: IAgentData[K]): void {
    this.data[field] = value;
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.data.name || this.data.name.trim().length === 0) {
      errors.push("Nome do agente é obrigatório");
    }

    if (!this.data.conversation_focus || this.data.conversation_focus.trim().length === 0) {
      errors.push("Foco da conversa é obrigatório");
    }

    if (!this.data.main_objective || this.data.main_objective.trim().length === 0) {
      errors.push("Objetivo principal é obrigatório");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export interface IAgentTemplate {
  name: string;
  description: string;
  icon: string;
  data: Partial<IAgentData>;
}

export class AgentTemplateService {
  static getTemplates(): IAgentTemplate[] {
    return [
      {
        name: "Vendedor Consultivo",
        description: "Focado em entender necessidades e oferecer soluções",
        icon: "💼",
        data: {
          conversation_focus: "vendas consultivas e qualificação de leads",
          priority: "high",
          rejection_action: "follow_up",
          tone: "professional",
          main_objective: "Identificar necessidades do cliente e agendar reunião comercial",
          communication_style: "consultative",
          expertise_level: "advanced",
          response_length: "medium",
          empathy_level: "high",
          formality_level: "professional",
          humor_level: "subtle",
          proactivity_level: "high",
          personality_traits: ["empático", "analítico", "persuasivo", "paciente"],
          agent_color: "#3b82f6"
        }
      },
      {
        name: "Atendimento ao Cliente",
        description: "Resolução rápida de problemas e suporte",
        icon: "🎧",
        data: {
          conversation_focus: "suporte e resolução de dúvidas",
          priority: "high",
          rejection_action: "offer_alternative",
          tone: "friendly",
          main_objective: "Resolver problemas e garantir satisfação do cliente",
          communication_style: "supportive",
          expertise_level: "expert",
          response_length: "short",
          empathy_level: "high",
          formality_level: "professional",
          humor_level: "subtle",
          proactivity_level: "high",
          personality_traits: ["empático", "paciente", "resolutivo", "prestativo"],
          agent_color: "#10b981"
        }
      },
      {
        name: "Prospecção Ativa",
        description: "Busca ativa de novos clientes",
        icon: "🚀",
        data: {
          conversation_focus: "prospecção e captação de leads",
          priority: "high",
          rejection_action: "ask_reason",
          tone: "enthusiastic",
          main_objective: "Qualificar leads e converter em oportunidades",
          communication_style: "direct",
          expertise_level: "advanced",
          response_length: "medium",
          empathy_level: "moderate",
          formality_level: "professional",
          humor_level: "moderate",
          proactivity_level: "high",
          personality_traits: ["persuasivo", "proativo", "entusiasmado", "focado"],
          agent_color: "#f59e0b"
        }
      },
      {
        name: "Retenção de Clientes",
        description: "Fidelização e redução de churn",
        icon: "💎",
        data: {
          conversation_focus: "retenção e fidelização de clientes",
          priority: "high",
          rejection_action: "ask_reason",
          tone: "empathetic",
          main_objective: "Identificar insatisfações e oferecer soluções para manter o cliente",
          communication_style: "supportive",
          expertise_level: "advanced",
          response_length: "medium",
          empathy_level: "high",
          formality_level: "professional",
          humor_level: "none",
          proactivity_level: "high",
          personality_traits: ["empático", "diplomático", "persuasivo", "atento"],
          agent_color: "#8b5cf6"
        }
      },
      {
        name: "Agendamento",
        description: "Organização de consultas e serviços",
        icon: "📅",
        data: {
          conversation_focus: "agendamento de serviços e consultas",
          priority: "medium",
          rejection_action: "offer_alternative",
          tone: "professional",
          main_objective: "Agendar horário coletando todas as informações necessárias",
          communication_style: "direct",
          expertise_level: "intermediate",
          response_length: "short",
          empathy_level: "moderate",
          formality_level: "professional",
          humor_level: "none",
          proactivity_level: "moderate",
          personality_traits: ["organizado", "eficiente", "claro", "prestativo"],
          agent_color: "#06b6d4"
        }
      },
      {
        name: "Pesquisa e Feedback",
        description: "Coleta de opiniões e avaliações",
        icon: "📊",
        data: {
          conversation_focus: "coleta de feedback e pesquisa de satisfação",
          priority: "low",
          rejection_action: "thank_and_close",
          tone: "friendly",
          main_objective: "Coletar feedback honesto sobre experiência do cliente",
          communication_style: "supportive",
          expertise_level: "intermediate",
          response_length: "short",
          empathy_level: "moderate",
          formality_level: "casual",
          humor_level: "subtle",
          proactivity_level: "passive",
          personality_traits: ["amigável", "curioso", "respeitoso", "objetivo"],
          agent_color: "#ec4899"
        }
      }
    ];
  }

  static applyTemplate(agent: Agent, template: IAgentTemplate): void {
    Object.entries(template.data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        agent.updateField(key as keyof IAgentData, value as any);
      }
    });
  }
}

