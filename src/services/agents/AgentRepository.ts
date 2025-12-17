import { supabase } from "@/integrations/supabase/client";
import { IAgentData } from "./AgentDomain";
import { ComponentRepository } from "../components/ComponentRepository";

export interface IAgentRepository {
  save(agent: IAgentData, componentIds?: string[]): Promise<string>;
  update(id: string, agent: Partial<IAgentData>, componentIds?: string[]): Promise<void>;
  findById(id: string): Promise<IAgentData | null>;
  getAgentComponentIds(agentId: string): Promise<string[]>;
}

export class AgentRepository implements IAgentRepository {
  private componentRepository = new ComponentRepository();

  async save(agent: IAgentData, componentIds?: string[]): Promise<string> {
    const { data, error } = await supabase
      .from("ai_interaction_settings")
      .insert([agent])
      .select("id")
      .single();

    if (error) {
      throw new Error(`Erro ao salvar agente: ${error.message}`);
    }

    const agentId = data.id;

    if (componentIds && componentIds.length > 0) {
      await this.componentRepository.enableForAgent(agentId, componentIds);
    }

    return agentId;
  }

  async update(id: string, agent: Partial<IAgentData>, componentIds?: string[]): Promise<void> {
    const { error } = await supabase
      .from("ai_interaction_settings")
      .update(agent)
      .eq("id", id);

    if (error) {
      throw new Error(`Erro ao atualizar agente: ${error.message}`);
    }

    if (componentIds !== undefined) {
      await this.componentRepository.enableForAgent(id, componentIds);
    }
  }

  async findById(id: string): Promise<IAgentData | null> {
    const { data, error } = await supabase
      .from("ai_interaction_settings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Erro ao buscar agente: ${error.message}`);
    }

    return data;
  }

  async getAgentComponentIds(agentId: string): Promise<string[]> {
    const components = await this.componentRepository.findEnabledForAgent(agentId);
    return components.map((c) => c.id);
  }
}



