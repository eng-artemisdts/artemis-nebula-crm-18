import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, Copy } from "lucide-react";

interface AIInteractionSetting {
  id: string;
  name: string;
  conversation_focus: string;
  priority: string;
  rejection_action: string;
  tone: string;
  main_objective: string;
  additional_instructions: string | null;
  created_at: string;
  updated_at: string;
}

const AIInteraction = () => {
  const [settings, setSettings] = useState<AIInteractionSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPrompt, setPreviewPrompt] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    conversation_focus: "",
    priority: "medium",
    rejection_action: "follow_up",
    tone: "professional",
    main_objective: "",
    additional_instructions: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_interaction_settings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar configurações");
      console.error(error);
    } else {
      setSettings(data || []);
    }
    setLoading(false);
  };

  const generatePrompt = (data: typeof formData) => {
    return `Você é um assistente de vendas especializado em ${data.conversation_focus}.

OBJETIVO PRINCIPAL: ${data.main_objective}

PRIORIDADE DA CONVERSA: ${data.priority === "high" ? "Alta - Aja com urgência" : data.priority === "medium" ? "Média - Mantenha o equilíbrio" : "Baixa - Seja paciente e gradual"}

TOM DE VOZ: ${data.tone === "professional" ? "Profissional e formal" : data.tone === "friendly" ? "Amigável e casual" : data.tone === "enthusiastic" ? "Entusiasmado e motivador" : "Direto e objetivo"}

ESTRATÉGIA QUANDO O LEAD REJEITAR: ${
      data.rejection_action === "follow_up"
        ? "Agende um follow-up educado para o futuro"
        : data.rejection_action === "offer_alternative"
        ? "Ofereça alternativas ou soluções diferentes"
        : data.rejection_action === "ask_reason"
        ? "Pergunte educadamente o motivo da rejeição"
        : "Agradeça educadamente e encerre a conversa"
    }

${data.additional_instructions ? `INSTRUÇÕES ADICIONAIS:\n${data.additional_instructions}` : ""}

DIRETRIZES:
- Seja empático e ouça ativamente o lead
- Faça perguntas abertas para entender necessidades
- Apresente soluções baseadas nas necessidades identificadas
- Mantenha a conversa focada no objetivo principal
- Respeite o tempo e as decisões do lead
- Registre informações importantes durante a conversa`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("ai_interaction_settings")
          .update(formData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Configuração atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("ai_interaction_settings")
          .insert([formData]);

        if (error) throw error;
        toast.success("Configuração criada com sucesso!");
      }

      setDialogOpen(false);
      resetForm();
      fetchSettings();
    } catch (error: any) {
      toast.error("Erro ao salvar configuração");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (setting: AIInteractionSetting) => {
    setEditingId(setting.id);
    setFormData({
      name: setting.name,
      conversation_focus: setting.conversation_focus,
      priority: setting.priority,
      rejection_action: setting.rejection_action,
      tone: setting.tone,
      main_objective: setting.main_objective,
      additional_instructions: setting.additional_instructions || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta configuração?")) return;

    const { error } = await supabase
      .from("ai_interaction_settings")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir configuração");
      console.error(error);
    } else {
      toast.success("Configuração excluída com sucesso!");
      fetchSettings();
    }
  };

  const handlePreview = (setting: AIInteractionSetting) => {
    const prompt = generatePrompt({
      name: setting.name,
      conversation_focus: setting.conversation_focus,
      priority: setting.priority,
      rejection_action: setting.rejection_action,
      tone: setting.tone,
      main_objective: setting.main_objective,
      additional_instructions: setting.additional_instructions || "",
    });
    setPreviewPrompt(prompt);
    setPreviewOpen(true);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(previewPrompt);
    toast.success("Prompt copiado para a área de transferência!");
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      conversation_focus: "",
      priority: "medium",
      rejection_action: "follow_up",
      tone: "professional",
      main_objective: "",
      additional_instructions: "",
    });
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Interações com IA</h1>
            <p className="text-muted-foreground mt-1">
              Configure como a IA deve interagir com cada lead
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Configuração
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Configuração" : "Nova Configuração"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Configuração *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Venda de Chatbot WhatsApp"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conversation_focus">Foco da Conversa *</Label>
                  <Input
                    id="conversation_focus"
                    value={formData.conversation_focus}
                    onChange={(e) =>
                      setFormData({ ...formData, conversation_focus: e.target.value })
                    }
                    placeholder="Ex: vendas de soluções de automação"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="main_objective">Objetivo Principal *</Label>
                  <Textarea
                    id="main_objective"
                    value={formData.main_objective}
                    onChange={(e) =>
                      setFormData({ ...formData, main_objective: e.target.value })
                    }
                    placeholder="Ex: Convencer o lead a agendar uma demonstração do produto"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        setFormData({ ...formData, priority: value })
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
                      value={formData.tone}
                      onValueChange={(value) => setFormData({ ...formData, tone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Profissional</SelectItem>
                        <SelectItem value="friendly">Amigável</SelectItem>
                        <SelectItem value="enthusiastic">Entusiasmado</SelectItem>
                        <SelectItem value="direct">Direto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rejection_action">Ação quando Lead Rejeitar</Label>
                  <Select
                    value={formData.rejection_action}
                    onValueChange={(value) =>
                      setFormData({ ...formData, rejection_action: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="follow_up">Agendar Follow-up</SelectItem>
                      <SelectItem value="offer_alternative">Oferecer Alternativas</SelectItem>
                      <SelectItem value="ask_reason">Perguntar Motivo</SelectItem>
                      <SelectItem value="polite_end">Encerrar Educadamente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_instructions">
                    Instruções Adicionais (Opcional)
                  </Label>
                  <Textarea
                    id="additional_instructions"
                    value={formData.additional_instructions}
                    onChange={(e) =>
                      setFormData({ ...formData, additional_instructions: e.target.value })
                    }
                    placeholder="Ex: Mencione sempre nosso diferencial de suporte 24/7"
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading && settings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Carregando configurações...</p>
          </Card>
        ) : settings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Nenhuma configuração criada ainda. Clique em "Nova Configuração" para começar.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {settings.map((setting) => (
              <Card key={setting.id} className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{setting.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {setting.conversation_focus}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Prioridade:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        setting.priority === "high"
                          ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          : setting.priority === "medium"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      }`}
                    >
                      {setting.priority === "high"
                        ? "Alta"
                        : setting.priority === "medium"
                        ? "Média"
                        : "Baixa"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Tom:</span>
                    <span className="px-2 py-1 bg-secondary rounded text-xs">
                      {setting.tone === "professional"
                        ? "Profissional"
                        : setting.tone === "friendly"
                        ? "Amigável"
                        : setting.tone === "enthusiastic"
                        ? "Entusiasmado"
                        : "Direto"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePreview(setting)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(setting)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(setting.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Preview do Prompt
                <Button variant="outline" size="sm" onClick={copyPrompt}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="bg-muted p-4 rounded-md overflow-y-auto max-h-[60vh]">
              <pre className="whitespace-pre-wrap text-sm">{previewPrompt}</pre>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AIInteraction;