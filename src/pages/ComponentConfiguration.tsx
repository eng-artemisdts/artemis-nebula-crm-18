import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ComponentRepository } from "@/services/components/ComponentRepository";
import { IComponentData } from "@/services/components/ComponentDomain";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ComponentConfig {
  [key: string]: string;
}

export const ComponentConfiguration = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [component, setComponent] = useState<IComponentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ComponentConfig>({});
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());
  const componentRepository = new ComponentRepository();

  useEffect(() => {
    if (id) {
      loadComponent();
      loadConfiguration();
    }
  }, [id]);

  const loadComponent = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await componentRepository.findById(id);
      if (data) {
        setComponent(data);
      } else {
        toast.error("Componente não encontrado");
        navigate("/ai-interaction");
      }
    } catch (error) {
      toast.error("Erro ao carregar componente");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadConfiguration = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("component_configurations")
        .select("*")
        .eq("component_id", id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data?.config) {
        setConfig(data.config);
        const sensitiveFields = getSensitiveFields();
        sensitiveFields.forEach((field) => {
          setHiddenFields((prev) => new Set(prev).add(field));
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
    }
  };

  const getSensitiveFields = (): string[] => {
    if (!component) return [];
    const identifier = component.identifier;
    
    const sensitiveFieldsMap: Record<string, string[]> = {
      email_sender: ["api_key", "api_secret", "smtp_password"],
      whatsapp_integration: ["api_key", "api_secret", "webhook_secret"],
      meeting_scheduler: ["api_key", "api_secret", "calendar_token"],
      crm_query: ["api_key", "api_secret"],
      proposal_creator: ["api_key", "api_secret"],
      auto_followup: ["api_key", "api_secret"],
      sentiment_analysis: ["api_key", "api_secret"],
      report_generator: ["api_key", "api_secret"],
    };

    return sensitiveFieldsMap[identifier] || ["api_key", "api_secret"];
  };

  const getDefaultFields = (): Array<{ key: string; label: string; type: string }> => {
    if (!component) return [];
    const identifier = component.identifier;

    const fieldsMap: Record<string, Array<{ key: string; label: string; type: string }>> = {
      email_sender: [
        { key: "smtp_host", label: "SMTP Host", type: "text" },
        { key: "smtp_port", label: "SMTP Porta", type: "number" },
        { key: "smtp_user", label: "Usuário SMTP", type: "text" },
        { key: "smtp_password", label: "Senha SMTP", type: "password" },
        { key: "from_email", label: "Email Remetente", type: "email" },
        { key: "from_name", label: "Nome Remetente", type: "text" },
      ],
      whatsapp_integration: [
        { key: "api_key", label: "API Key", type: "password" },
        { key: "api_secret", label: "API Secret", type: "password" },
        { key: "webhook_url", label: "Webhook URL", type: "url" },
        { key: "webhook_secret", label: "Webhook Secret", type: "password" },
        { key: "instance_id", label: "Instance ID", type: "text" },
      ],
      meeting_scheduler: [
        { key: "api_key", label: "API Key", type: "password" },
        { key: "api_secret", label: "API Secret", type: "password" },
        { key: "calendar_id", label: "Calendar ID", type: "text" },
        { key: "calendar_token", label: "Calendar Token", type: "password" },
        { key: "timezone", label: "Timezone", type: "text" },
      ],
      crm_query: [
        { key: "api_key", label: "API Key", type: "password" },
        { key: "api_secret", label: "API Secret", type: "password" },
        { key: "base_url", label: "Base URL", type: "url" },
      ],
      proposal_creator: [
        { key: "api_key", label: "API Key", type: "password" },
        { key: "api_secret", label: "API Secret", type: "password" },
        { key: "template_path", label: "Caminho dos Templates", type: "text" },
      ],
      auto_followup: [
        { key: "api_key", label: "API Key", type: "password" },
        { key: "api_secret", label: "API Secret", type: "password" },
        { key: "interval_days", label: "Intervalo (dias)", type: "number" },
      ],
      sentiment_analysis: [
        { key: "api_key", label: "API Key", type: "password" },
        { key: "api_secret", label: "API Secret", type: "password" },
        { key: "model", label: "Modelo", type: "text" },
      ],
      report_generator: [
        { key: "api_key", label: "API Key", type: "password" },
        { key: "api_secret", label: "API Secret", type: "password" },
        { key: "storage_path", label: "Caminho de Armazenamento", type: "text" },
      ],
    };

    return fieldsMap[identifier] || [
      { key: "api_key", label: "API Key", type: "password" },
      { key: "api_secret", label: "API Secret", type: "password" },
    ];
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("component_configurations")
        .upsert({
          component_id: id,
          config,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("Configuração salva com sucesso!");
      navigate(-1);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configuração");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const toggleFieldVisibility = (fieldKey: string) => {
    setHiddenFields((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fieldKey)) {
        newSet.delete(fieldKey);
      } else {
        newSet.add(fieldKey);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (!component) {
    return null;
  }

  const defaultFields = getDefaultFields();

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in-50 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Configurar Componente
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                {component.name}
              </p>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Informações do Componente
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {component.description}
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>
                As informações de chaves e secrets são sensíveis. Certifique-se
                de manter essas informações seguras e não compartilhá-las.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configurações</h3>
              {defaultFields.map((field) => {
                const isPassword = field.type === "password";
                const isHidden = hiddenFields.has(field.key);

                return (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <div className="relative">
                      <Input
                        id={field.key}
                        type={isPassword && isHidden ? "password" : "text"}
                        value={config[field.key] || ""}
                        onChange={(e) =>
                          setConfig({ ...config, [field.key]: e.target.value })
                        }
                        placeholder={`Digite ${field.label.toLowerCase()}`}
                        className={isPassword ? "pr-10" : ""}
                      />
                      {isPassword && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => toggleFieldVisibility(field.key)}
                        >
                          {isHidden ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

