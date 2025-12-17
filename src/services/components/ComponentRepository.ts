import { supabase } from "@/integrations/supabase/client";
import { IComponentData, IComponentRepository } from "./ComponentDomain";

export class ComponentRepository implements IComponentRepository {
  async findAll(): Promise<IComponentData[]> {
    const { data, error } = await supabase
      .from("components")
      .select("*")
      .order("name");

    if (error) {
      throw new Error(`Erro ao buscar componentes: ${error.message}`);
    }

    return data || [];
  }

  async findById(id: string): Promise<IComponentData | null> {
    const { data, error } = await supabase
      .from("components")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Erro ao buscar componente: ${error.message}`);
    }

    return data;
  }

  async findByIdentifier(identifier: string): Promise<IComponentData | null> {
    const { data, error } = await supabase
      .from("components")
      .select("*")
      .eq("identifier", identifier)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Erro ao buscar componente: ${error.message}`);
    }

    return data;
  }

  async findAvailableForOrganization(
    organizationId: string
  ): Promise<IComponentData[]> {
    const { data, error } = await supabase
      .from("organization_components")
      .select("components(*)")
      .eq("organization_id", organizationId);

    if (error) {
      throw new Error(
        `Erro ao buscar componentes da organização: ${error.message}`
      );
    }

    interface OrganizationComponentRow {
      components: IComponentData | null;
    }

    return (data || [])
      .map((item: OrganizationComponentRow) => item.components)
      .filter((component): component is IComponentData => component !== null);
  }

  async findEnabledForAgent(agentId: string): Promise<IComponentData[]> {
    const { data, error } = await supabase
      .from("agent_components")
      .select("components(*)")
      .eq("agent_id", agentId);

    if (error) {
      throw new Error(`Erro ao buscar componentes do agente: ${error.message}`);
    }

    interface AgentComponentRow {
      components: IComponentData | null;
    }

    return (data || [])
      .map((item: AgentComponentRow) => item.components)
      .filter((component): component is IComponentData => component !== null);
  }

  async enableForAgent(
    agentId: string,
    componentIds: string[]
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("agent_components")
      .delete()
      .eq("agent_id", agentId);

    if (deleteError) {
      throw new Error(
        `Erro ao remover componentes do agente: ${deleteError.message}`
      );
    }

    if (componentIds.length === 0) {
      return;
    }

    const records = componentIds.map((componentId) => ({
      agent_id: agentId,
      component_id: componentId,
    }));

    const { error: insertError } = await supabase
      .from("agent_components")
      .insert(records);

    if (insertError) {
      throw new Error(
        `Erro ao adicionar componentes ao agente: ${insertError.message}`
      );
    }
  }

  async enableForOrganization(
    organizationId: string,
    componentIds: string[]
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("organization_components")
      .delete()
      .eq("organization_id", organizationId);

    if (deleteError) {
      throw new Error(
        `Erro ao remover componentes da organização: ${deleteError.message}`
      );
    }

    if (componentIds.length === 0) {
      return;
    }

    const records = componentIds.map((componentId) => ({
      organization_id: organizationId,
      component_id: componentId,
    }));

    const { error: insertError } = await supabase
      .from("organization_components")
      .insert(records);

    if (insertError) {
      throw new Error(
        `Erro ao adicionar componentes à organização: ${insertError.message}`
      );
    }
  }
}

