import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save, X, GripVertical, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useOrganization } from "@/hooks/useOrganization";
import { LeadStatusService, LeadStatus, CreateLeadStatusDTO, UpdateLeadStatusDTO } from "@/services/LeadStatusService";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableStatusItem = ({
  status,
  onEdit,
  onDelete,
}: {
  status: LeadStatus;
  onEdit: (status: LeadStatus) => void;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-4 space-y-3 relative ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-start gap-3">
        {!status.is_required && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="w-5 h-5" />
          </div>
        )}
        {status.is_required && (
          <div className="mt-1">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{status.label}</h3>
            {status.is_required && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Obrigatório
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Chave: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{status.status_key}</code>
          </p>
        </div>
        <div className="flex gap-2">
          {!status.is_required && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(status)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(status.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
          {status.is_required && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(status)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

const StatusManager = () => {
  const { organization } = useOrganization();
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    status_key: "",
    label: "",
  });

  const service = new LeadStatusService();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchStatuses = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const data = await service.getAll(organization.id);
      setStatuses(data);
    } catch (error: any) {
        toast.error(error.message || "Erro ao carregar etapas do funil");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [organization?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization?.id) {
      toast.error("Aguarde o carregamento da organização");
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        const dto: UpdateLeadStatusDTO = {
          label: formData.label,
        };
        await service.update(organization.id, editingId, dto);
        toast.success("Etapa do funil atualizada com sucesso!");
      } else {
        const dto: CreateLeadStatusDTO = {
          status_key: formData.status_key.toLowerCase().replace(/\s+/g, "_"),
          label: formData.label,
        };
        await service.create(organization.id, dto);
        toast.success("Etapa do funil criada com sucesso!");
      }

      setFormData({ status_key: "", label: "" });
      setEditingId(null);
      setIsDialogOpen(false);
      fetchStatuses();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar etapa do funil");
      console.error("Error saving status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (status: LeadStatus) => {
    setFormData({
      status_key: status.status_key,
      label: status.label,
    });
    setEditingId(status.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!organization?.id) return;

    if (!window.confirm("Tem certeza que deseja excluir esta etapa do funil?")) return;

    try {
      await service.delete(organization.id, id);
      toast.success("Etapa do funil excluída com sucesso!");
      fetchStatuses();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir etapa do funil");
      console.error(error);
    }
  };

  const handleCancel = () => {
    setFormData({ status_key: "", label: "" });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !organization?.id) {
      return;
    }

    const finishedStatus = statuses.find((s) => s.status_key === "finished");
    const customStatusesOnly = statuses.filter((s) => !s.is_required && s.status_key !== "finished");

    const oldIndex = customStatusesOnly.findIndex((s) => s.id === active.id);
    const newIndex = customStatusesOnly.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedCustom = arrayMove(customStatusesOnly, oldIndex, newIndex);
    const newStatuses = [
      ...statuses.filter((s) => s.is_required && s.status_key !== "finished"),
      ...reorderedCustom,
      ...(finishedStatus ? [finishedStatus] : [])
    ];
    setStatuses(newStatuses);

    try {
      const statusIds = reorderedCustom.map((s) => s.id);
      await service.reorder(organization.id, statusIds);
      toast.success("Ordem atualizada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao reordenar status");
      fetchStatuses();
    }
  };

  const customStatuses = statuses.filter((s) => !s.is_required && s.status_key !== "finished");
  const requiredStatuses = statuses.filter((s) => s.is_required && s.status_key !== "finished");
  const finishedStatus = statuses.find((s) => s.status_key === "finished");

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Funil de Vendas</h1>
            <p className="text-muted-foreground mt-1">
              Configure as etapas do seu funil de vendas. As etapas definidas aqui serão utilizadas para organizar seus leads. 
              Se a ferramenta de atualização automática estiver ativada, os status dos leads serão atualizados automaticamente conforme as interações.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Etapas obrigatórias:</strong> Novo, Conversa Iniciada, Proposta Enviada, Reunião Agendada e Finalizado.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingId(null); setFormData({ status_key: "", label: "" }); }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Etapa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Etapa do Funil" : "Nova Etapa do Funil"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingId && (
                  <div className="space-y-2">
                    <Label htmlFor="status_key">Chave da Etapa *</Label>
                    <Input
                      id="status_key"
                      value={formData.status_key}
                      onChange={(e) =>
                        setFormData({ ...formData, status_key: e.target.value })
                      }
                      required
                      placeholder="Ex: proposta_enviada"
                      disabled={!!editingId}
                    />
                    <p className="text-xs text-muted-foreground">
                      A chave será convertida para minúsculas e espaços serão substituídos por underscores
                    </p>
                  </div>
                )}
                {editingId && (
                  <div className="space-y-2">
                    <Label htmlFor="status_key">Chave da Etapa</Label>
                    <Input
                      id="status_key"
                      value={formData.status_key}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      A chave não pode ser alterada após a criação
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="label">Nome da Etapa *</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                    required
                    placeholder="Ex: Proposta Enviada"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome que será exibido no funil de vendas
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading || !organization?.id}>
                    <Save className="w-4 h-4 mr-2" />
                    {editingId ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading && statuses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando etapas do funil...</p>
          </div>
        ) : (
          <>
            {requiredStatuses.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Etapas Obrigatórias do Funil</h2>
                <div className="space-y-3">
                  {requiredStatuses.map((status) => (
                    <Card key={status.id} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{status.label}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              Obrigatório
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Chave: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{status.status_key}</code>
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(status)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {customStatuses.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Etapas Personalizadas do Funil</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Arraste para reordenar as etapas do funil. A ordem definida aqui será exibida no painel de leads.
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={customStatuses.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {customStatuses.map((status) => (
                        <SortableStatusItem
                          key={status.id}
                          status={status}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {finishedStatus && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Etapa Final do Funil</h2>
                <Card className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{finishedStatus.label}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Obrigatório
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Chave: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{finishedStatus.status_key}</code>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Esta etapa sempre aparece por último no funil de vendas
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(finishedStatus)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {statuses.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                <p className="text-muted-foreground">
                  Nenhuma etapa encontrada. As etapas obrigatórias do funil serão criadas automaticamente.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default StatusManager;

