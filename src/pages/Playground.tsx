import { useState, useEffect, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import {
  ygdrasilChatService,
  IYgdrasilChatRequest,
} from "@/services/YgdrasilChatService";
import { AgentWithComponents } from "@/components/agents/types";
import { ComponentRepository } from "@/services/components/ComponentRepository";
import { splitResponse } from "@/utils/messageSplitter";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { PlaygroundLoading } from "@/components/PlaygroundLoading";
import {
  Bot,
  Send,
  Loader2,
  MessageSquare,
  Sparkles,
  GripVertical,
  X,
} from "lucide-react";
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

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AgentComponent {
  id: string;
  agent_id: string;
  component_id: string;
  created_at: string;
  components?: {
    id: string;
    name: string;
    description: string;
    identifier: string;
    created_at: string;
    updated_at: string;
  };
}

interface AgentComponentConfiguration {
  id: string;
  agent_id: string;
  component_id: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  components?: {
    id: string;
    name: string;
    description: string;
    identifier: string;
  };
}

interface SortableMessageProps {
  message: ChatMessage;
  agentColor?: string;
}

const SortableMessage = ({ message, agentColor }: SortableMessageProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: message.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isUser = message.role === "user";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex w-full gap-3 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback
            style={{
              backgroundColor: agentColor || "#3b82f6",
            }}
            className="text-white"
          >
            <Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={`group relative max-w-[80%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 ${
          isUser
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
            : "bg-muted/70 text-foreground border border-border"
        }`}
      >
        <div className="flex items-start gap-2">
          {!isUser && (
            <button
              {...attributes}
              {...listeners}
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing mt-1"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <p className="text-sm leading-relaxed flex-1">{message.content}</p>
        </div>
        <span
          className={`text-[11px] block mt-1 ${
            isUser ? "text-primary-foreground/80" : "text-muted-foreground"
          }`}
        >
          {message.timestamp.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <MessageSquare className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

const Playground = () => {
  const { organization } = useOrganization();
  const [agents, setAgents] = useState<AgentWithComponents[]>([]);
  const [selectedAgent, setSelectedAgent] =
    useState<AgentWithComponents | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [agentComponents, setAgentComponents] = useState<AgentComponent[]>([]);
  const [agentComponentConfigurations, setAgentComponentConfigurations] =
    useState<AgentComponentConfiguration[]>([]);
  const [mockLeadId] = useState(
    () => `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  const componentRepository = useMemo(() => new ComponentRepository(), []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchAgents = useCallback(async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_interaction_settings")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Erro ao carregar agentes");
        console.error(error);
        return;
      }

      const agentsWithComponents = await Promise.all(
        (data || []).map(async (agent) => {
          try {
            const components = await componentRepository.findEnabledForAgent(
              agent.id
            );
            return {
              ...agent,
              components: components.map((c) => ({
                id: c.id,
                name: c.name,
                identifier: c.identifier,
              })),
            };
          } catch (error) {
            console.error(
              `Erro ao buscar componentes do agente ${agent.id}:`,
              error
            );
            return { ...agent, components: [] };
          }
        })
      );
      setAgents(agentsWithComponents);
    } catch (error) {
      console.error("Erro ao buscar agentes:", error);
      toast.error("Erro ao carregar agentes");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [organization?.id, componentRepository]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const fetchAgentComponents = useCallback(
    async (agentId: string) => {
      if (!organization?.id) return;

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const accessToken = session?.access_token || supabaseKey;

        const componentsResponse = await fetch(
          `${supabaseUrl}/rest/v1/agent_components?agent_id=eq.${agentId}&select=id,agent_id,component_id,created_at,components(id,name,description,identifier,created_at,updated_at)`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "accept-profile": "public",
            },
          }
        );

        if (componentsResponse.ok) {
          const componentsData = await componentsResponse.json();
          console.log("Agent components loaded:", componentsData);
          setAgentComponents((componentsData || []) as AgentComponent[]);
        } else {
          const errorText = await componentsResponse.text();
          console.error(
            "Error loading agent components:",
            componentsResponse.status,
            errorText
          );
        }

        const configsResponse = await fetch(
          `${supabaseUrl}/rest/v1/agent_component_configurations?agent_id=eq.${agentId}&select=id,agent_id,component_id,config,created_at,updated_at,components(id,name,description,identifier)`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "accept-profile": "public",
            },
          }
        );

        if (configsResponse.ok) {
          const configsData = await configsResponse.json();
          console.log("Agent component configurations loaded:", configsData);
          setAgentComponentConfigurations(
            (configsData || []) as AgentComponentConfiguration[]
          );
        } else {
          const errorText = await configsResponse.text();
          console.error(
            "Error loading agent component configurations:",
            configsResponse.status,
            errorText
          );
        }
      } catch (error) {
        console.error("Erro ao buscar componentes do agente:", error);
      }
    },
    [organization?.id]
  );

  useEffect(() => {
    if (selectedAgent?.id) {
      fetchAgentComponents(selectedAgent.id);
    } else {
      setAgentComponents([]);
      setAgentComponentConfigurations([]);
    }
  }, [selectedAgent?.id, fetchAgentComponents]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent || !organization) {
      return;
    }

    let currentAgentComponents = agentComponents;
    let currentAgentComponentConfigurations = agentComponentConfigurations;

    if (
      currentAgentComponents.length === 0 &&
      currentAgentComponentConfigurations.length === 0
    ) {
      console.log("Buscando componentes do agente antes de enviar mensagem...");
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token || supabaseKey;

      try {
        const componentsResponse = await fetch(
          `${supabaseUrl}/rest/v1/agent_components?agent_id=eq.${selectedAgent.id}&select=id,agent_id,component_id,created_at,components(id,name,description,identifier,created_at,updated_at)`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "accept-profile": "public",
            },
          }
        );

        if (componentsResponse.ok) {
          const componentsData = await componentsResponse.json();
          currentAgentComponents = (componentsData || []) as AgentComponent[];
          setAgentComponents(currentAgentComponents);
          console.log(
            "Agent components carregados antes do envio:",
            currentAgentComponents
          );
        } else {
          const errorText = await componentsResponse.text();
          console.error(
            "Error loading agent components before send:",
            componentsResponse.status,
            errorText
          );
        }

        const configsResponse = await fetch(
          `${supabaseUrl}/rest/v1/agent_component_configurations?agent_id=eq.${selectedAgent.id}&select=id,agent_id,component_id,config,created_at,updated_at,components(id,name,description,identifier)`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "accept-profile": "public",
            },
          }
        );

        if (configsResponse.ok) {
          const configsData = await configsResponse.json();
          currentAgentComponentConfigurations = (configsData ||
            []) as AgentComponentConfiguration[];
          setAgentComponentConfigurations(currentAgentComponentConfigurations);
          console.log(
            "Agent component configurations carregadas antes do envio:",
            currentAgentComponentConfigurations
          );
        }
      } catch (error) {
        console.error("Erro ao buscar componentes antes do envio:", error);
      }
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setSending(true);

    try {
      const mockLead = {
        id: mockLeadId,
        name: "Lead de Teste",
        description: null,
        category: null,
        status: "conversation_started",
        contact_email: null,
        contact_whatsapp: "553189572307",
        source: "playground",
        integration_start_time: null,
        payment_link_url: null,
        payment_stripe_id: null,
        payment_status: "nao_criado",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payment_amount: null,
        paid_at: null,
        whatsapp_verified: true,
        ai_interaction_id: selectedAgent.id,
        remote_jid: "553189572307@s.whatsapp.net",
        organization_id: organization.id,
      };

      const mockOrganization = {
        id: organization.id,
        name: organization.name || "Organização",
        plan: organization.plan || "pro",
        trial_ends_at:
          organization.trial_ends_at ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        stripe_customer_id: null,
        logo_url: organization.logo_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        company_name:
          organization.company_name || organization.name || "Organização",
        cnpj: organization.cnpj || "",
        phone: organization.phone || "",
        address: organization.address || "",
        website: organization.website || null,
      };

      type LeadStatus = {
        id: string;
        organization_id: string;
        status_key: string;
        label: string;
        is_required: boolean;
        display_order: number;
        created_at: string;
        updated_at: string;
      };

      type CachedLeadStatuses = {
        data: LeadStatus[];
        timestamp: number;
        organization_id: string;
      };

      const CACHE_KEY = `lead_statuses_cache_${organization.id}`;
      const CACHE_DURATION = 10 * 60 * 1000;

      let leadStatusesData: LeadStatus[] = [];

      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const now = Date.now();

        if (cachedData) {
          const parsed: CachedLeadStatuses = JSON.parse(cachedData);
          const timeDiff = now - parsed.timestamp;

          if (
            parsed.organization_id === organization.id &&
            timeDiff < CACHE_DURATION
          ) {
            leadStatusesData = parsed.data;
          } else {
            localStorage.removeItem(CACHE_KEY);
          }
        }

        if (leadStatusesData.length === 0) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

          const {
            data: { session },
          } = await supabase.auth.getSession();
          const accessToken = session?.access_token || supabaseKey;

          const response = await fetch(
            `${supabaseUrl}/rest/v1/lead_statuses?select=*&organization_id=eq.${organization.id}&order=display_order.asc`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "accept-profile": "public",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            leadStatusesData = (data || []) as LeadStatus[];

            const cacheData: CachedLeadStatuses = {
              data: leadStatusesData,
              timestamp: now,
              organization_id: organization.id,
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
          } else {
            const errorText = await response.text();
            console.error(
              "Erro ao buscar status dos leads:",
              response.status,
              errorText
            );
            toast.error("Erro ao buscar status dos leads");
          }
        }
      } catch (error) {
        console.error("Erro ao buscar status dos leads:", error);
        toast.error("Erro ao buscar status dos leads");
      }

      const messageContent = inputMessage.trim();

      const request: IYgdrasilChatRequest = {
        event: "messages.upsert",
        instance: "playground-instance",
        lead: mockLead,
        organization: mockOrganization,
        ai_config: {
          id: selectedAgent.id,
          name: selectedAgent.name,
          conversation_focus: selectedAgent.conversation_focus,
          priority: selectedAgent.priority,
          rejection_action: selectedAgent.rejection_action,
          tone: selectedAgent.tone,
          main_objective: selectedAgent.main_objective,
          additional_instructions: selectedAgent.additional_instructions,
          created_at: selectedAgent.created_at,
          updated_at: selectedAgent.updated_at,
          closing_instructions: selectedAgent.closing_instructions,
          organization_id: organization.id,
        },
        agent_components: currentAgentComponents,
        agent_component_configurations: currentAgentComponentConfigurations,
        lead_statuses: leadStatusesData,
        message: {
          conversation: messageContent,
        },
        messageType: "conversation",
        conversation: messageContent,
        messageId: `msg-${Date.now()}`,
        contactName: "Lead de Teste",
        phoneNumber: "553189572307",
        remoteJid: "553189572307@s.whatsapp.net",
        fromMe: false,
        timestamp: new Date().toISOString(),
        msg_content: messageContent,
      };

      console.log("Request sendo enviado:", {
        msg_content: request.msg_content,
        conversation: request.conversation,
        message: request.message,
        agent_components: request.agent_components,
        agent_component_configurations: request.agent_component_configurations,
        agent_components_count: request.agent_components?.length || 0,
        agent_component_configurations_count:
          request.agent_component_configurations?.length || 0,
      });

      setIsTyping(true);
      const response = await ygdrasilChatService.sendMessage(request);

      if (response.success && response.response) {
        const messageParts = splitResponse(response.response, 300);

        for (let i = 0; i < messageParts.length; i++) {
          const part = messageParts[i];
          const delay = i * 500;

          await new Promise((resolve) => setTimeout(resolve, delay));

          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}-${i}`,
            role: "assistant",
            content: part,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
        }
      } else {
        toast.error(response.error || "Erro ao enviar mensagem");
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Desculpe, ocorreu um erro ao processar sua mensagem.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }

      setIsTyping(false);
    } catch (error: unknown) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua mensagem.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMessages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const activeMessage = items[oldIndex];
        const overMessage = items[newIndex];

        if (
          activeMessage.role === "assistant" &&
          overMessage.role === "assistant"
        ) {
          const assistantMessages = items.filter(
            (msg) => msg.role === "assistant"
          );
          const userMessages = items.filter((msg) => msg.role === "user");

          const assistantOldIndex = assistantMessages.findIndex(
            (msg) => msg.id === active.id
          );
          const assistantNewIndex = assistantMessages.findIndex(
            (msg) => msg.id === over.id
          );

          const reorderedAssistants = arrayMove(
            assistantMessages,
            assistantOldIndex,
            assistantNewIndex
          );

          const result = [...userMessages, ...reorderedAssistants].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
          );

          return result;
        }

        return items;
      });
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success("Chat limpo");
  };

  const assistantMessages = messages.filter((msg) => msg.role === "assistant");

  if (initialLoading) {
    return <PlaygroundLoading />;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.08),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(236,72,153,0.07),transparent_30%)] animate-pulse" />
          <CardHeader className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/80 via-primary to-secondary text-primary-foreground grid place-items-center shadow-lg shadow-primary/30 animate-[pulse_4s_ease-in-out_infinite]">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-2xl">
                    Playground de Agentes
                  </CardTitle>
                  <Badge variant="secondary" className="gap-1">
                    <Bot className="h-4 w-4" />
                    Teste seus agentes
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Selecione um agente e teste conversas interativas com drag &
                  drop
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="col-span-1 border-border/80 shadow-sm">
            <CardHeader className="space-y-3">
              <CardTitle className="text-lg">Configuração</CardTitle>
              <div className="space-y-2">
                <label className="text-sm font-medium">Selecionar Agente</label>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Select
                    value={selectedAgent?.id || ""}
                    onValueChange={(value) => {
                      const agent = agents.find((a) => a.id === value);
                      setSelectedAgent(agent || null);
                      setMessages([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um agente" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: agent.agent_color || "#3b82f6",
                              }}
                            />
                            <span>{agent.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {selectedAgent && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={selectedAgent.agent_avatar_url || undefined}
                      />
                      <AvatarFallback
                        style={{
                          backgroundColor:
                            selectedAgent.agent_color || "#3b82f6",
                        }}
                        className="text-white"
                      >
                        <Bot className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {selectedAgent.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedAgent.conversation_focus}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={clearChat}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Limpar Chat
                  </Button>
                </div>
              )}
            </CardHeader>
          </Card>

          <Card className="col-span-3 border-border/80 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Chat</CardTitle>
                {selectedAgent && (
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary"
                    style={{
                      borderColor: selectedAgent.agent_color || "#3b82f6",
                      color: selectedAgent.agent_color || "#3b82f6",
                    }}
                  >
                    {selectedAgent.name}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              {selectedAgent ? (
                <>
                  <ScrollArea className="flex-1 px-6 py-4">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3">
                        <MessageSquare className="h-12 w-12 opacity-50" />
                        <p className="text-lg font-medium">
                          Nenhuma mensagem ainda
                        </p>
                        <p className="text-sm">
                          Comece uma conversa com {selectedAgent.name}
                        </p>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={assistantMessages.map((m) => m.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3">
                            {messages.map((message) => (
                              <SortableMessage
                                key={message.id}
                                message={message}
                                agentColor={selectedAgent.agent_color}
                              />
                            ))}
                            {isTyping && (
                              <div className="flex w-full gap-3 justify-start">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarFallback
                                    style={{
                                      backgroundColor:
                                        selectedAgent.agent_color || "#3b82f6",
                                    }}
                                    className="text-white"
                                  >
                                    <Bot className="w-4 h-4" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="group relative max-w-[80%] rounded-2xl px-4 py-3 shadow-sm bg-muted/70 text-foreground border border-border">
                                  <div className="flex items-center gap-1">
                                    <span
                                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                                      style={{ animationDelay: "0ms" }}
                                    ></span>
                                    <span
                                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                                      style={{ animationDelay: "150ms" }}
                                    ></span>
                                    <span
                                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                                      style={{ animationDelay: "300ms" }}
                                    ></span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </ScrollArea>
                  <div className="border-t border-border/80 p-4 bg-card/60 backdrop-blur flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="Digite sua mensagem..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="bg-muted/60 border-border focus-visible:ring-primary"
                        disabled={sending}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={sending || !inputMessage.trim()}
                        className="gap-2"
                        style={{
                          backgroundColor:
                            selectedAgent?.agent_color || undefined,
                        }}
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Enviar
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-3">
                  <Bot className="h-12 w-12 opacity-50" />
                  <p className="text-lg font-medium">
                    Selecione um agente para começar
                  </p>
                  <p className="text-sm">Escolha um agente no painel lateral</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Playground;
