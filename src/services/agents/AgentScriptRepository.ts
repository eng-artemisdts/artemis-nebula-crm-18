import { supabase } from "@/integrations/supabase/client";

export interface IAgentScript {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  scenario_detection_enabled: boolean;
  proactive_opening_message: string | null;
  proactive_hook_message: string | null;
  proactive_development_paper: string | null;
  proactive_development_system: string | null;
  receptive_welcome_template: string | null;
  receptive_qualification_question: string | null;
  receptive_deepening_question: string | null;
  receptive_value_proposition: string | null;
  company_clients: string[];
  total_clients: string | null;
  created_at: string;
  updated_at: string;
}

export interface IAgentScriptData {
  id?: string;
  organization_id: string;
  name: string;
  description?: string | null;
  scenario_detection_enabled?: boolean;
  proactive_opening_message?: string | null;
  proactive_hook_message?: string | null;
  proactive_development_paper?: string | null;
  proactive_development_system?: string | null;
  receptive_welcome_template?: string | null;
  receptive_qualification_question?: string | null;
  receptive_deepening_question?: string | null;
  receptive_value_proposition?: string | null;
  company_clients?: string[];
  total_clients?: string | null;
}

export class AgentScriptRepository {
  async findAll(organizationId: string): Promise<IAgentScript[]> {
    const { data, error } = await supabase
      .from("agent_scripts")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");

    if (error) {
      throw new Error(`Erro ao buscar roteiros: ${error.message}`);
    }

    return data || [];
  }

  async findById(id: string): Promise<IAgentScript | null> {
    const { data, error } = await supabase
      .from("agent_scripts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Erro ao buscar roteiro: ${error.message}`);
    }

    return data;
  }

  async save(script: IAgentScriptData): Promise<string> {
    const { data, error } = await supabase
      .from("agent_scripts")
      .insert([script])
      .select("id")
      .single();

    if (error) {
      throw new Error(`Erro ao salvar roteiro: ${error.message}`);
    }

    return data.id;
  }

  async update(id: string, script: Partial<IAgentScriptData>): Promise<void> {
    const { error } = await supabase
      .from("agent_scripts")
      .update(script)
      .eq("id", id);

    if (error) {
      throw new Error(`Erro ao atualizar roteiro: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("agent_scripts")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Erro ao excluir roteiro: ${error.message}`);
    }
  }
}
