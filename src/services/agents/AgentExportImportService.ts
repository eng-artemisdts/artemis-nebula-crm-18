import { supabase } from "@/integrations/supabase/client";
import { IAgentData } from "./AgentDomain";
import { ComponentRepository } from "@/services/components/ComponentRepository";

export interface ExportedAgent {
  version: string;
  exportedAt: string;
  agent: Omit<IAgentData, "id">;
  components: Array<{
    identifier: string;
    config?: Record<string, any>;
  }>;
}

export class AgentExportImportService {
  private componentRepository = new ComponentRepository();

  async exportAgent(agentId: string): Promise<ExportedAgent> {
    const agentData = await this.getAgentData(agentId);
    if (!agentData) {
      throw new Error("Agente não encontrado");
    }

    const components = await this.componentRepository.findEnabledForAgent(agentId);
    const componentConfigs = await this.getAgentComponentConfigs(agentId);

    const exportedComponents = components.map((component) => {
      const config = componentConfigs.find(
        (cfg) => cfg.component_id === component.id
      );
      return {
        identifier: component.identifier,
        config: config?.config || undefined,
      };
    });

    const exportedAgent: ExportedAgent = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      agent: {
        name: agentData.name,
        nickname: agentData.nickname,
        agent_description: agentData.agent_description,
        conversation_focus: agentData.conversation_focus,
        priority: agentData.priority,
        rejection_action: agentData.rejection_action,
        tone: agentData.tone,
        main_objective: agentData.main_objective,
        additional_instructions: agentData.additional_instructions,
        closing_instructions: agentData.closing_instructions,
        personality_traits: agentData.personality_traits || [],
        communication_style: agentData.communication_style,
        expertise_level: agentData.expertise_level,
        response_length: agentData.response_length,
        empathy_level: agentData.empathy_level,
        formality_level: agentData.formality_level,
        humor_level: agentData.humor_level,
        proactivity_level: agentData.proactivity_level,
        agent_avatar_url: agentData.agent_avatar_url,
        agent_color: agentData.agent_color,
        should_introduce_itself: agentData.should_introduce_itself,
        memory_amount: agentData.memory_amount,
        scenario_detection_enabled: agentData.scenario_detection_enabled,
        proactive_opening_message: agentData.proactive_opening_message,
        proactive_hook_message: agentData.proactive_hook_message,
        proactive_development_paper: agentData.proactive_development_paper,
        proactive_development_system: agentData.proactive_development_system,
        receptive_welcome_template: agentData.receptive_welcome_template,
        receptive_qualification_question: agentData.receptive_qualification_question,
        receptive_deepening_question: agentData.receptive_deepening_question,
        receptive_value_proposition: agentData.receptive_value_proposition,
        company_clients: agentData.company_clients || [],
        total_clients: agentData.total_clients,
      },
      components: exportedComponents,
    };

    return exportedAgent;
  }

  async importAgent(
    exportedAgent: ExportedAgent,
    organizationId: string
  ): Promise<string> {
    this.validateExportedAgent(exportedAgent);

    const agentData = {
      ...exportedAgent.agent,
      organization_id: organizationId,
    };

    const { data: insertedAgent, error: agentError } = await supabase
      .from("ai_interaction_settings")
      .insert([agentData])
      .select("id")
      .single();

    if (agentError) {
      throw new Error(`Erro ao criar agente: ${agentError.message}`);
    }

    const agentId = insertedAgent.id;

    if (exportedAgent.components && exportedAgent.components.length > 0) {
      await this.importComponents(agentId, exportedAgent.components);
    }

    return agentId;
  }

  private async getAgentData(agentId: string): Promise<IAgentData | null> {
    const { data, error } = await supabase
      .from("ai_interaction_settings")
      .select("*")
      .eq("id", agentId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Erro ao buscar agente: ${error.message}`);
    }

    return data;
  }

  private async getAgentComponentConfigs(agentId: string) {
    const { data, error } = await supabase
      .from("agent_component_configurations")
      .select("component_id, config")
      .eq("agent_id", agentId);

    if (error) {
      throw new Error(
        `Erro ao buscar configurações de componentes: ${error.message}`
      );
    }

    return data || [];
  }

  private async importComponents(
    agentId: string,
    exportedComponents: Array<{ identifier: string; config?: Record<string, any> }>
  ) {
    const componentIds: string[] = [];
    const componentConfigs: Array<{
      component_id: string;
      config: Record<string, any>;
    }> = [];

    for (const exportedComponent of exportedComponents) {
      const component = await this.componentRepository.findByIdentifier(
        exportedComponent.identifier
      );

      if (!component) {
        console.warn(
          `Componente com identifier "${exportedComponent.identifier}" não encontrado. Pulando...`
        );
        continue;
      }

      componentIds.push(component.id);

      if (exportedComponent.config) {
        componentConfigs.push({
          component_id: component.id,
          config: exportedComponent.config,
        });
      }
    }

    if (componentIds.length > 0) {
      await this.componentRepository.enableForAgent(agentId, componentIds);
    }

    if (componentConfigs.length > 0) {
      const configRecords = componentConfigs.map((cfg) => ({
        agent_id: agentId,
        component_id: cfg.component_id,
        config: cfg.config,
      }));

      const { error: configError } = await supabase
        .from("agent_component_configurations")
        .upsert(configRecords, {
          onConflict: "agent_id,component_id",
        });

      if (configError) {
        console.error(
          "Erro ao salvar configurações de componentes:",
          configError
        );
      }
    }
  }

  private validateExportedAgent(exportedAgent: ExportedAgent): void {
    if (!exportedAgent.version) {
      throw new Error("Versão do arquivo de exportação não encontrada");
    }

    if (!exportedAgent.agent) {
      throw new Error("Dados do agente não encontrados no arquivo");
    }

    if (!exportedAgent.agent.name || exportedAgent.agent.name.trim().length === 0) {
      throw new Error("Nome do agente é obrigatório");
    }

    if (
      !exportedAgent.agent.conversation_focus ||
      exportedAgent.agent.conversation_focus.trim().length === 0
    ) {
      throw new Error("Foco da conversa é obrigatório");
    }

    if (
      !exportedAgent.agent.main_objective ||
      exportedAgent.agent.main_objective.trim().length === 0
    ) {
      throw new Error("Objetivo principal é obrigatório");
    }
  }

  downloadAsJson(exportedAgent: ExportedAgent, filename?: string): void {
    const jsonString = JSON.stringify(exportedAgent, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `agente-${exportedAgent.agent.name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async parseJsonFile(file: File): Promise<ExportedAgent> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content) as ExportedAgent;
          resolve(parsed);
        } catch (error) {
          reject(
            new Error(
              `Erro ao processar arquivo JSON: ${
                error instanceof Error ? error.message : "Erro desconhecido"
              }`
            )
          );
        }
      };

      reader.onerror = () => {
        reject(new Error("Erro ao ler arquivo"));
      };

      reader.readAsText(file);
    });
  }
}
