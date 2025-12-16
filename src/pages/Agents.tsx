import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  agent_description: string | null;
  conversation_focus: string;
  priority: string;
  rejection_action: string;
  tone: string;
  main_objective: string;
  additional_instructions: string | null;
  closing_instructions: string | null;
  personality_traits: string[] | null;
  communication_style: string;
  expertise_level: string;
  response_length: string;
  empathy_level: string;
  formality_level: string;
  humor_level: string;
  proactivity_level: string;
  agent_avatar_url: string | null;
  agent_color: string;
  created_at: string;
  updated_at: string;
}

const Agents = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_interaction_settings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar agentes");
      console.error(error);
    } else {
      setAgents(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (agent: Agent) => {
    navigate(`/ai-interaction/edit/${agent.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este agente?")) return;

    const { error } = await supabase
      .from("ai_interaction_settings")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir agente");
      console.error(error);
    } else {
      toast.success("Agente excluído com sucesso!");
      fetchAgents();
    }
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in-50 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Agentes de IA
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Crie e gerencie agentes personalizados para interagir com seus leads
            </p>
          </div>
          <Button
            size="lg"
            className="gap-2 transition-all hover:scale-105"
            onClick={() => navigate("/ai-interaction/create")}
          >
            <Plus className="w-5 h-5" />
            Novo Agente
          </Button>
        </div>

        {loading && agents.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Carregando agentes...</p>
          </Card>
        ) : agents.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <Sparkles className="w-16 h-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Nenhum agente criado ainda</h3>
              <p className="text-muted-foreground mb-6">
                Crie seu primeiro agente personalizado para começar a interagir com seus leads
              </p>
              <Button
                onClick={() => navigate("/ai-interaction/create")}
                className="transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Agente
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                className="p-6 space-y-4 hover:shadow-lg transition-all duration-300 group relative overflow-hidden animate-in fade-in-50 slide-in-from-bottom-4"
                style={{
                  borderLeft: `4px solid ${agent.agent_color || "#3b82f6"}`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg transition-transform group-hover:scale-110"
                          style={{ backgroundColor: agent.agent_color || "#3b82f6" }}
                        >
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{agent.name}</h3>
                          {agent.agent_description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {agent.agent_description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(agent)}
                        className="transition-all hover:scale-110"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(agent.id)}
                        className="transition-all hover:scale-110 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {agent.conversation_focus}
                  </p>

                  {agent.personality_traits && agent.personality_traits.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {agent.personality_traits.slice(0, 3).map((trait) => (
                        <Badge key={trait} variant="secondary" className="text-xs">
                          {trait}
                        </Badge>
                      ))}
                      {agent.personality_traits.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{agent.personality_traits.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Estilo: </span>
                      <span className="font-medium capitalize">
                        {agent.communication_style === "direct"
                          ? "Direto"
                          : agent.communication_style === "consultative"
                          ? "Consultivo"
                          : agent.communication_style === "supportive"
                          ? "Suportivo"
                          : "Equilibrado"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expertise: </span>
                      <span className="font-medium capitalize">
                        {agent.expertise_level === "beginner"
                          ? "Iniciante"
                          : agent.expertise_level === "intermediate"
                          ? "Intermediário"
                          : agent.expertise_level === "advanced"
                          ? "Avançado"
                          : "Especialista"}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Agents;
