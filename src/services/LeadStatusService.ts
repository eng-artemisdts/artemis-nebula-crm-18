import { supabase } from "@/integrations/supabase/client";

export interface LeadStatus {
  id: string;
  organization_id: string;
  status_key: string;
  label: string;
  is_required: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadStatusDTO {
  status_key: string;
  label: string;
  display_order?: number;
}

export interface UpdateLeadStatusDTO {
  label?: string;
  display_order?: number;
}

export class LeadStatusService {
  async getAll(organizationId: string): Promise<LeadStatus[]> {
    const { data, error } = await supabase
      .from("lead_statuses")
      .select("*")
      .eq("organization_id", organizationId)
      .order("display_order", { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar status: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    const finishedStatus = data.find(s => s.status_key === "finished");
    const otherStatuses = data.filter(s => s.status_key !== "finished");

    if (finishedStatus) {
      return [...otherStatuses, finishedStatus];
    }

    return data;
  }

  async getByKey(organizationId: string, statusKey: string): Promise<LeadStatus | null> {
    const { data, error } = await supabase
      .from("lead_statuses")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status_key", statusKey)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar status: ${error.message}`);
    }

    return data;
  }

  async create(organizationId: string, dto: CreateLeadStatusDTO): Promise<LeadStatus> {
    if (dto.status_key === "new" || dto.status_key === "conversation_started" || dto.status_key === "finished") {
      throw new Error("Não é possível criar status com as chaves 'new', 'conversation_started' ou 'finished'. Estes são status obrigatórios.");
    }

    const existingStatus = await this.getByKey(organizationId, dto.status_key);
    if (existingStatus) {
      throw new Error(`Já existe um status com a chave '${dto.status_key}'`);
    }

    const finishedStatus = await this.getByKey(organizationId, "finished");
    const maxOrder = finishedStatus
      ? finishedStatus.display_order - 1
      : await this.getMaxDisplayOrderForCustom(organizationId);
    const displayOrder = dto.display_order ?? maxOrder + 1;

    const { data, error } = await supabase
      .from("lead_statuses")
      .insert({
        organization_id: organizationId,
        status_key: dto.status_key,
        label: dto.label,
        is_required: false,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar status: ${error.message}`);
    }

    return data;
  }

  async update(organizationId: string, statusId: string, dto: UpdateLeadStatusDTO): Promise<LeadStatus> {
    const status = await this.getById(statusId);
    if (!status) {
      throw new Error("Status não encontrado");
    }

    if (status.organization_id !== organizationId) {
      throw new Error("Você não tem permissão para atualizar este status");
    }

    if (status.is_required && dto.label) {
      const { data, error } = await supabase
        .from("lead_statuses")
        .update({
          label: dto.label,
          display_order: dto.display_order ?? status.display_order,
        })
        .eq("id", statusId)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar status: ${error.message}`);
      }

      return data;
    }

    const { data, error } = await supabase
      .from("lead_statuses")
      .update({
        label: dto.label ?? status.label,
        display_order: dto.display_order ?? status.display_order,
      })
      .eq("id", statusId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar status: ${error.message}`);
    }

    return data;
  }

  async delete(organizationId: string, statusId: string): Promise<void> {
    const status = await this.getById(statusId);
    if (!status) {
      throw new Error("Status não encontrado");
    }

    if (status.organization_id !== organizationId) {
      throw new Error("Você não tem permissão para deletar este status");
    }

    if (status.is_required || status.status_key === "finished") {
      throw new Error("Não é possível deletar status obrigatórios");
    }

    const leadsWithStatus = await this.countLeadsWithStatus(organizationId, status.status_key);
    if (leadsWithStatus > 0) {
      throw new Error(`Não é possível deletar este status. Existem ${leadsWithStatus} lead(s) usando este status.`);
    }

    const { error } = await supabase
      .from("lead_statuses")
      .delete()
      .eq("id", statusId);

    if (error) {
      throw new Error(`Erro ao deletar status: ${error.message}`);
    }
  }

  async reorder(organizationId: string, statusIds: string[]): Promise<void> {
    const finishedStatus = await this.getByKey(organizationId, "finished");
    if (!finishedStatus) {
      throw new Error("Status 'finished' não encontrado. Execute a migration para criar os status obrigatórios.");
    }

    const updates = statusIds
      .filter(id => id !== finishedStatus.id)
      .map((id, index) => ({
        id,
        display_order: index + 1,
      }));

    for (const update of updates) {
      const { error } = await supabase
        .from("lead_statuses")
        .update({ display_order: update.display_order })
        .eq("id", update.id)
        .eq("organization_id", organizationId);

      if (error) {
        throw new Error(`Erro ao reordenar status: ${error.message}`);
      }
    }

    const maxOrder = updates.length > 0
      ? Math.max(...updates.map(u => u.display_order))
      : 0;

    const { error: finishedError } = await supabase
      .from("lead_statuses")
      .update({ display_order: maxOrder + 1 })
      .eq("id", finishedStatus.id)
      .eq("organization_id", organizationId);

    if (finishedError) {
      throw new Error(`Erro ao atualizar ordem do status finished: ${finishedError.message}`);
    }
  }

  private async getById(statusId: string): Promise<LeadStatus | null> {
    const { data, error } = await supabase
      .from("lead_statuses")
      .select("*")
      .eq("id", statusId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar status: ${error.message}`);
    }

    return data;
  }

  private async getMaxDisplayOrder(organizationId: string): Promise<number> {
    const { data, error } = await supabase
      .from("lead_statuses")
      .select("display_order")
      .eq("organization_id", organizationId)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar ordem máxima: ${error.message}`);
    }

    return data?.display_order ?? 0;
  }

  private async getMaxDisplayOrderForCustom(organizationId: string): Promise<number> {
    const finishedStatus = await this.getByKey(organizationId, "finished");
    if (finishedStatus) {
      return finishedStatus.display_order - 1;
    }

    const { data, error } = await supabase
      .from("lead_statuses")
      .select("display_order")
      .eq("organization_id", organizationId)
      .neq("status_key", "finished")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar ordem máxima: ${error.message}`);
    }

    return data?.display_order ?? 0;
  }

  private async countLeadsWithStatus(organizationId: string, statusKey: string): Promise<number> {
    const { count, error } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", statusKey);

    if (error) {
      throw new Error(`Erro ao contar leads: ${error.message}`);
    }

    return count ?? 0;
  }
}
