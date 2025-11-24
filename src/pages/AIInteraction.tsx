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
import { Plus, Pencil, Trash2, Eye, Copy, CheckSquare, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface AIInteractionSetting {
  id: string;
  name: string;
  conversation_focus: string;
  priority: string;
  rejection_action: string;
  tone: string;
  main_objective: string;
  additional_instructions: string | null;
  closing_instructions: string | null;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    conversation_focus: "",
    priority: "medium",
    rejection_action: "follow_up",
    tone: "professional",
    main_objective: "",
    additional_instructions: "",
    closing_instructions: "",
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

${data.closing_instructions ? `COMO FINALIZAR QUANDO NÃO FECHAR:\n${data.closing_instructions}` : ""}

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
      closing_instructions: setting.closing_instructions || "",
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
      closing_instructions: setting.closing_instructions || "",
    });
    setPreviewPrompt(prompt);
    setPreviewOpen(true);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(previewPrompt);
    toast.success("Prompt copiado para a área de transferência!");
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === settings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(settings.map(s => s.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!confirm(`Deseja realmente excluir ${selectedIds.length} configuração(ões)?`)) return;

    setLoading(true);
    const { error } = await supabase
      .from("ai_interaction_settings")
      .delete()
      .in("id", selectedIds);

    if (error) {
      toast.error("Erro ao excluir configurações");
      console.error(error);
    } else {
      toast.success(`${selectedIds.length} configuração(ões) excluída(s) com sucesso!`);
      setSelectedIds([]);
      setIsSelectionMode(false);
      fetchSettings();
    }
    setLoading(false);
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
      closing_instructions: "",
    });
  };

  const createDefaultSettings = async () => {
    setLoading(true);
    
    try {
      // Buscar o organization_id do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) {
        toast.error("Organização não encontrada");
        return;
      }

      const defaultConfigs = [
        {
          name: "Black Friday - Chatbot WhatsApp",
          conversation_focus: "implementação urgente de chatbot para Black Friday",
          priority: "high",
          rejection_action: "ask_reason",
          tone: "enthusiastic",
          main_objective: "Criar urgência e convencer o lead a contratar um chatbot WhatsApp para não perder vendas durante a Black Friday",
          additional_instructions: "URGÊNCIA É FUNDAMENTAL! Enfatize que a Black Friday está chegando e o lead pode perder muitas vendas por não conseguir atender todos os clientes. Destaque: volume alto de mensagens simultâneas, chatbot responde instantaneamente, não perde nenhum cliente, atende 24/7 durante o evento, qualifica leads automaticamente direcionando para vendedores apenas clientes prontos para comprar. Mencione que a implementação é rápida (pode estar pronto antes da Black Friday) e o ROI é imediato no evento. Use dados: 'loja que não responde em até 5 minutos perde 80% das vendas'. Ofereça condição especial com desconto para quem fechar hoje.",
          closing_instructions: "Reforce a URGÊNCIA: 'Cada dia sem chatbot é dinheiro deixado na mesa'. Se não fechar agora, mencione que para o próximo ano precisa planejar com antecedência. Ofereça último desconto válido só nas próximas 24h. Envie estudo de caso de loja que faturou 3x mais na Black Friday com chatbot. Se realmente não der, capture compromisso de conversar em janeiro para preparar próximas datas sazonais.",
          organization_id: profile.organization_id
        },
        {
          name: "Prospecção e Vendas Ativas",
          conversation_focus: "prospecção e qualificação de leads para vendas",
          priority: "high",
          rejection_action: "follow_up",
          tone: "professional",
          main_objective: "Identificar a dor do cliente, qualificar o lead e agendar reunião comercial com o time de vendas",
          additional_instructions: "Faça perguntas abertas para entender: tamanho da empresa, desafios atuais, orçamento disponível e decisores. Use método BANT (Budget, Authority, Need, Timeline). Seja consultivo, não empurre produto. Foque em resolver problemas reais. Registre todas as informações coletadas para passar ao vendedor.",
          closing_instructions: "Se não qualificar agora, identifique quando seria o melhor momento. Ofereça enviar material educativo sobre o problema identificado. Peça permissão para adicionar em lista VIP de conteúdos exclusivos. Agende follow-up em 30-60 dias.",
          organization_id: profile.organization_id
        },
        {
          name: "Atendimento ao Cliente",
          conversation_focus: "suporte e resolução de dúvidas de clientes",
          priority: "medium",
          rejection_action: "offer_alternative",
          tone: "friendly",
          main_objective: "Resolver dúvidas e problemas dos clientes de forma rápida e eficiente, garantindo satisfação",
          additional_instructions: "Seja empático e paciente. Entenda completamente o problema antes de oferecer solução. Use linguagem clara e evite jargões técnicos. Se não souber responder, seja honesto e encaminhe para especialista. Sempre confirme se a solução resolveu o problema. Aproveite para identificar oportunidades de upsell sutilmente.",
          closing_instructions: "Agradeça pela confiança. Pergunte se há algo mais em que possa ajudar. Envie pesquisa de satisfação. Ofereça canais alternativos de contato. Convide para seguir nas redes sociais para dicas e novidades.",
          organization_id: profile.organization_id
        },
        {
          name: "Retenção e Fidelização",
          conversation_focus: "retenção de clientes e redução de churn",
          priority: "high",
          rejection_action: "ask_reason",
          tone: "empathetic",
          main_objective: "Identificar motivos de insatisfação e oferecer soluções para manter o cliente",
          additional_instructions: "Demonstre que a empresa valoriza o cliente. Ouça ativamente as reclamações sem interromper. Reconheça os problemas e assuma responsabilidade. Ofereça compensações proporcionais (desconto, upgrade temporário, extensão de trial). Apresente melhorias recentes do produto/serviço. Mostre casos de clientes que tiveram problemas similares e ficaram satisfeitos.",
          closing_instructions: "Se cliente decidir cancelar, faça oferta final irrecusável (desconto significativo por 3 meses). Pergunte o que faria ele voltar. Mantenha porta aberta para retorno. Envie pesquisa de saída. Adicione em lista de win-back para campanha futura.",
          organization_id: profile.organization_id
        },
        {
          name: "Agendamento de Serviços",
          conversation_focus: "agendamento de consultas, avaliações e serviços",
          priority: "medium",
          rejection_action: "offer_alternative",
          tone: "professional",
          main_objective: "Agendar horário para serviço, coletando todas as informações necessárias",
          additional_instructions: "Seja objetivo e eficiente. Apresente opções de horários disponíveis. Confirme: data, horário, local (presencial/online), dados de contato e necessidades especiais. Envie confirmação por WhatsApp e e-mail. Explique o que cliente deve levar/preparar. Mencione política de cancelamento.",
          closing_instructions: "Confirme todos os dados. Envie lembretes 24h e 2h antes. Pergunte se tem dúvidas sobre como chegar (se presencial) ou como acessar (se online). Agradeça pela preferência e reforce que estão ansiosos para atender.",
          organization_id: profile.organization_id
        },
        {
          name: "Recuperação de Carrinho Abandonado",
          conversation_focus: "recuperação de vendas de carrinhos abandonados",
          priority: "high",
          rejection_action: "offer_alternative",
          tone: "friendly",
          main_objective: "Entender motivo do abandono e incentivar finalização da compra",
          additional_instructions: "Aborde de forma não invasiva. Pergunte se teve dúvidas sobre produto, frete, pagamento ou prazo de entrega. Ofereça ajuda personalizada. Se for preço, ofereça cupom de desconto especial (5-10%). Se for dúvida sobre produto, forneça informações detalhadas. Se for frete, mencione promoções ou frete grátis acima de X valor. Crie senso de urgência (estoque limitado, promoção acabando).",
          closing_instructions: "Se não converter, pergunte o que faria ele finalizar a compra. Ofereça guardar carrinho por 48h com desconto exclusivo. Envie avaliações de outros clientes sobre os produtos do carrinho. Adicione em lista de remarketing.",
          organization_id: profile.organization_id
        },
        {
          name: "Pesquisa de Satisfação",
          conversation_focus: "coleta de feedback e avaliação de satisfação",
          priority: "low",
          rejection_action: "thank_and_close",
          tone: "friendly",
          main_objective: "Coletar feedback honesto sobre experiência do cliente com produto/serviço",
          additional_instructions: "Seja breve e direto. Agradeça o tempo do cliente. Faça perguntas claras e objetivas (NPS, escala de 1-10, múltipla escolha). Permita resposta aberta para comentários. Se cliente estiver insatisfeito, demonstre que vai repassar para time responsável. Se muito satisfeito, peça avaliação pública (Google, site).",
          closing_instructions: "Agradeça pela participação. Mencione que feedback é essencial para melhorias. Se negativo, garanta que será analisado pela gestão. Se positivo, pergunte se pode usar como depoimento (com autorização). Ofereça pequeno desconto/brinde como agradecimento.",
          organization_id: profile.organization_id
        },
        {
          name: "Suporte Técnico",
          conversation_focus: "resolução de problemas técnicos e troubleshooting",
          priority: "high",
          rejection_action: "offer_alternative",
          tone: "professional",
          main_objective: "Diagnosticar e resolver problemas técnicos de forma eficiente",
          additional_instructions: "Seja paciente com clientes não técnicos. Faça perguntas para entender contexto: quando começou, mensagens de erro, tentativas anteriores. Use linguagem simples. Ofereça soluções passo a passo. Se necessário, solicite prints ou vídeos do problema. Sempre teste se a solução funcionou. Se não resolver, escale para nível 2.",
          closing_instructions: "Confirme que problema foi resolvido. Explique como evitar no futuro. Ofereça documentação ou tutorial. Pergunte se tem outras dúvidas. Deixe canal aberto caso problema volte. Registre solução para base de conhecimento.",
          organization_id: profile.organization_id
        }
      ];

      const { error } = await supabase
        .from("ai_interaction_settings")
        .insert(defaultConfigs);

      if (error) throw error;
      
      toast.success(`${defaultConfigs.length} configurações padrão criadas com sucesso!`);
      fetchSettings();
    } catch (error: any) {
      toast.error("Erro ao criar configurações padrão");
      console.error(error);
    } finally {
      setLoading(false);
    }
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
          <div className="flex gap-2">
            {settings.length === 0 && (
              <Button
                variant="outline"
                onClick={createDefaultSettings}
                disabled={loading}
              >
                Criar Configurações Padrão
              </Button>
            )}
            {settings.length > 0 && (
              <>
                {isSelectionMode ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={toggleSelectAll}
                    >
                      {selectedIds.length === settings.length ? (
                        <>
                          <Square className="w-4 h-4 mr-2" />
                          Desmarcar Todos
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-4 h-4 mr-2" />
                          Selecionar Todos
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleBulkDelete}
                      disabled={selectedIds.length === 0 || loading}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir {selectedIds.length > 0 && `(${selectedIds.length})`}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedIds([]);
                      }}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsSelectionMode(true)}
                  >
                    Selecionar Múltiplos
                  </Button>
                )}
              </>
            )}
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
                  <Label htmlFor="closing_instructions">
                    Como Finalizar Quando Não Fechar (Opcional)
                  </Label>
                  <Textarea
                    id="closing_instructions"
                    value={formData.closing_instructions}
                    onChange={(e) =>
                      setFormData({ ...formData, closing_instructions: e.target.value })
                    }
                    placeholder="Ex: Agradeça o tempo, envie material educativo, agende follow-up"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Instruções específicas sobre como encerrar a conversa de forma estratégica quando o lead não converter
                  </p>
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
              <Card 
                key={setting.id} 
                className={`p-6 space-y-4 relative transition-colors ${
                  isSelectionMode ? 'cursor-pointer hover:bg-accent/50' : ''
                } ${
                  selectedIds.includes(setting.id) ? 'ring-2 ring-primary bg-accent/30' : ''
                }`}
                onClick={() => isSelectionMode && toggleSelection(setting.id)}
              >
                {isSelectionMode && (
                  <div className="absolute top-4 right-4 pointer-events-none">
                    <Checkbox
                      checked={selectedIds.includes(setting.id)}
                      onCheckedChange={() => toggleSelection(setting.id)}
                    />
                  </div>
                )}
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

                {!isSelectionMode && (
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
                )}
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