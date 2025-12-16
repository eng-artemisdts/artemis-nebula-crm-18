import { supabase } from "@/integrations/supabase/client";
import { IAgentData } from "./AgentDomain";

export interface IAgentRepository {
  save(agent: IAgentData): Promise<string>;
  update(id: string, agent: Partial<IAgentData>): Promise<void>;
  findById(id: string): Promise<IAgentData | null>;
}

export class AgentRepository implements IAgentRepository {
  async save(agent: IAgentData): Promise<string> {
    const { data, error } = await supabase
      .from("ai_interaction_settings")
      .insert([agent])
      .select("id")
      .single();

    if (error) {
      throw new Error(`Erro ao salvar agente: ${error.message}`);
    }

    return data.id;
  }

  async update(id: string, agent: Partial<IAgentData>): Promise<void> {
    const { error } = await supabase
      .from("ai_interaction_settings")
      .update(agent)
      .eq("id", id);

    if (error) {
      throw new Error(`Erro ao atualizar agente: ${error.message}`);
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
}



