import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  Bot,
  MoreVertical,
  Eye,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOrganization } from "@/hooks/useOrganization";
import {
  AgentScriptRepository,
  IAgentScript,
} from "@/services/agents/AgentScriptRepository";
import { AgentScriptForm } from "@/components/agents/AgentScriptForm";

const AgentScripts = () => {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [scripts, setScripts] = useState<IAgentScript[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedScript, setSelectedScript] = useState<IAgentScript | null>(
    null
  );
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const repository = useMemo(() => new AgentScriptRepository(), []);

  const fetchScripts = useCallback(async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const data = await repository.findAll(organization.id);
      setScripts(data);
    } catch (error) {
      toast.error("Erro ao carregar roteiros");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [repository, organization?.id]);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  const handleView = (script: IAgentScript) => {
    setSelectedScript(script);
    setViewModalOpen(true);
  };

  const handleEdit = (script: IAgentScript) => {
    setSelectedScript(script);
    setEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este roteiro?")) return;

    try {
      await repository.delete(id);
      toast.success("Roteiro excluído com sucesso!");
      fetchScripts();
    } catch (error) {
      toast.error("Erro ao excluir roteiro");
      console.error(error);
    }
  };

  const handleDuplicate = async (script: IAgentScript) => {
    try {
      const { id, organization_id, created_at, updated_at, ...scriptData } =
        script;
      const newScript = {
        ...scriptData,
        name: `${script.name} (Cópia)`,
        organization_id: organization_id,
      };
      await repository.save(newScript);
      toast.success("Roteiro duplicado com sucesso!");
      fetchScripts();
    } catch (error) {
      toast.error("Erro ao duplicar roteiro");
      console.error(error);
    }
  };

  const handleSave = async () => {
    await fetchScripts();
    setCreateModalOpen(false);
    setEditModalOpen(false);
    setSelectedScript(null);
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in-50 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Roteiros de Conversação
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Crie e gerencie roteiros reutilizáveis para seus agentes de IA
            </p>
          </div>
          <Button
            size="lg"
            className="gap-2 transition-all hover:scale-105"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-5 h-5" />
            Novo Roteiro
          </Button>
        </div>

        {loading && scripts.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Carregando roteiros...</p>
          </Card>
        ) : scripts.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Nenhum roteiro criado ainda
              </h3>
              <p className="text-muted-foreground mb-6">
                Crie seu primeiro roteiro para definir como seus agentes devem
                conversar
              </p>
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Roteiro
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {scripts.map((script, index) => (
              <Card
                key={script.id}
                className="group relative overflow-hidden border-2 transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-2 animate-in fade-in-50 slide-in-from-bottom-4"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <div className="absolute top-0 left-0 w-full h-1.5 transition-all duration-500 group-hover:h-2 bg-primary" />
                <div className="relative p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                        <h3 className="font-bold text-xl truncate group-hover:text-primary transition-colors">
                          {script.name}
                        </h3>
                      </div>
                      {script.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {script.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            script.scenario_detection_enabled
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {script.scenario_detection_enabled
                            ? "Detecção Ativa"
                            : "Detecção Inativa"}
                        </Badge>
                        {script.company_clients &&
                          script.company_clients.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {script.company_clients.length} cliente
                              {script.company_clients.length !== 1 ? "s" : ""}
                            </Badge>
                          )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(script)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(script)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(script)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(script.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedScript?.name}</DialogTitle>
            <DialogDescription>
              {selectedScript?.description || "Detalhes do roteiro"}
            </DialogDescription>
          </DialogHeader>
          {selectedScript && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Configuração</h4>
                <p className="text-sm text-muted-foreground">
                  Detecção de Cenário:{" "}
                  {selectedScript.scenario_detection_enabled ? "Ativada" : "Desativada"}
                </p>
              </div>

              {selectedScript.scenario_detection_enabled && (
                <>
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-semibold text-sm text-red-500">
                      🔴 Roteiro Ativo (Prospecção)
                    </h4>
                    {selectedScript.proactive_opening_message && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Abertura:
                        </p>
                        <p className="text-sm">{selectedScript.proactive_opening_message}</p>
                      </div>
                    )}
                    {selectedScript.proactive_hook_message && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Gancho:
                        </p>
                        <p className="text-sm">{selectedScript.proactive_hook_message}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-semibold text-sm text-green-500">
                      🟢 Roteiro Receptivo (Atendimento)
                    </h4>
                    {selectedScript.receptive_welcome_template && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Acolhimento:
                        </p>
                        <p className="text-sm">{selectedScript.receptive_welcome_template}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {selectedScript.company_clients &&
                selectedScript.company_clients.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Clientes</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedScript.company_clients.map((client, idx) => (
                        <Badge key={idx} variant="outline">
                          {client}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Roteiro</DialogTitle>
            <DialogDescription>
              Configure um roteiro de conversação reutilizável para seus agentes
            </DialogDescription>
          </DialogHeader>
          {organization?.id && (
            <AgentScriptForm
              organizationId={organization.id}
              onSave={handleSave}
              onCancel={() => setCreateModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Roteiro</DialogTitle>
            <DialogDescription>
              Atualize as configurações do roteiro
            </DialogDescription>
          </DialogHeader>
          {selectedScript && organization?.id && (
            <AgentScriptForm
              organizationId={organization.id}
              script={selectedScript}
              onSave={handleSave}
              onCancel={() => {
                setEditModalOpen(false);
                setSelectedScript(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AgentScripts;
