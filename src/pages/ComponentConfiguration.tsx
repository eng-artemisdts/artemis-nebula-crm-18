import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  Calendar,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ComponentRepository } from "@/services/components/ComponentRepository";
import { IComponentData } from "@/services/components/ComponentDomain";
import { ComponentConfigService } from "@/services/components/ComponentConfig";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface ComponentConfig {
  [key: string]: any;
}

interface ConnectionStatus {
  connected: boolean;
  provider?: string;
  email?: string;
  accountName?: string;
}

export const ComponentConfiguration = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [component, setComponent] = useState<IComponentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [config, setConfig] = useState<ComponentConfig>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });
  const componentRepository = new ComponentRepository();

  useEffect(() => {
    if (id) {
      loadComponent();
    }
  }, [id]);

  useEffect(() => {
    if (id && component) {
      loadConfiguration();
    }
  }, [id, component]);

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
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar configuração:", error);
        return;
      }

      if (data?.config) {
        setConfig(data.config);
        updateConnectionStatus(data.config);
      } else {
        setConfig({});
        setConnectionStatus({ connected: false });
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
    }
  };

  const updateConnectionStatus = (configData: ComponentConfig) => {
    if (!component) {
      return;
    }

    const status: ConnectionStatus = {
      connected: false,
    };

    if (!configData || Object.keys(configData).length === 0) {
      setConnectionStatus(status);
      return;
    }

    switch (component.identifier) {
      case "email_sender":
        if (configData.oauth_provider && configData.oauth_token) {
          status.connected = true;
          status.provider = configData.oauth_provider;
          status.email = configData.connected_email;
          status.accountName = configData.account_name;
        }
        break;
      case "meeting_scheduler":
        if (configData.oauth_provider && configData.oauth_token) {
          status.connected = true;
          status.provider = configData.oauth_provider;
          status.email = configData.connected_email;
          status.accountName = configData.account_name;
        }
        break;
      default:
        if (
          configData.connected ||
          (configData.oauth_provider && configData.oauth_token)
        ) {
          status.connected = true;
          status.provider = configData.oauth_provider || configData.provider;
          status.email = configData.connected_email;
          status.accountName = configData.account_name;
        }
    }

    setConnectionStatus(status);
  };

  useEffect(() => {
    if (component && Object.keys(config).length > 0) {
      updateConnectionStatus(config);
    }
  }, [component]);

  const handleOAuthConnect = async (provider: string) => {
    if (!id || !component) return;

    setConnecting(true);
    try {
      const frontendUrl = window.location.origin;
      const redirectUri = `${frontendUrl}/oauth/callback`;

      console.log("🔗 OAuth Connect - URLs:", {
        frontendUrl,
        redirectUri,
        provider,
        message: `Certifique-se de que esta URL está registrada no Google Cloud Console: ${redirectUri}`,
      });

      const { data, error } = await supabase.functions.invoke("oauth-connect", {
        body: {
          component_id: id,
          provider,
          frontend_url: frontendUrl,
        },
      });

      if (error) throw error;

      if (data?.auth_url) {
        const popup = window.open(
          data.auth_url,
          "oauth-connect",
          "width=600,height=700,scrollbars=yes,resizable=yes"
        );

        if (!popup) {
          toast.error("Por favor, permita pop-ups para este site");
          setConnecting(false);
          return;
        }

        const messageHandler = (event: MessageEvent) => {
          if (event.data?.type === "oauth-success") {
            clearInterval(checkPopup);
            if (popup && !popup.closed) {
              popup.close();
            }
            window.removeEventListener("message", messageHandler);
            setConnecting(false);
            setTimeout(async () => {
              await loadConfiguration();
              toast.success("Conexão realizada com sucesso!");
            }, 1000);
          }
        };

        window.addEventListener("message", messageHandler);

        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            window.removeEventListener("message", messageHandler);
            setConnecting(false);
            setTimeout(async () => {
              await loadConfiguration();
            }, 1000);
          }
        }, 1000);
      } else {
        toast.error("Erro ao iniciar conexão OAuth");
        setConnecting(false);
      }
    } catch (error: any) {
      const errorMessage =
        error.message || "Erro ao conectar. Tente novamente mais tarde.";
      const redirectUri = `${window.location.origin}/oauth/callback`;

      console.error("❌ Erro OAuth:", error);
      console.error("🔗 URL de redirecionamento usada:", redirectUri);
      console.error(
        "💡 Certifique-se de que esta URL está registrada no Google Cloud Console"
      );

      if (
        errorMessage.includes("redirect_uri_mismatch") ||
        errorMessage.includes("redirect")
      ) {
        toast.error(
          `Erro de redirecionamento. Adicione esta URL no Google Cloud Console: ${redirectUri}`,
          { duration: 8000 }
        );
      } else {
        toast.error(errorMessage);
      }
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from("component_configurations")
        .update({
          config: {
            ...config,
            oauth_provider: null,
            oauth_token: null,
            connected_email: null,
            account_name: null,
            connected: false,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("component_id", id);

      if (error) throw error;

      setConnectionStatus({ connected: false });
      setConfig({});
      toast.success("Desconectado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao desconectar");
      console.error(error);
    }
  };

  const getConnectionOptions = () => {
    if (!component) return [];

    const oauthProviders = ComponentConfigService.getOAuthProviders(
      component.identifier
    );

    return oauthProviders.map((provider) => {
      const icon =
        component.identifier === "email_sender" ? (
          <Mail className="w-5 h-5" />
        ) : (
          <Calendar className="w-5 h-5" />
        );

      return {
        provider: provider.provider,
        name: provider.name,
        icon,
        description: provider.description,
      };
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

  const connectionOptions = getConnectionOptions();
  const needsConfiguration = connectionOptions.length > 0;

  if (!needsConfiguration) {
    return (
      <Layout>
        <div className="space-y-6 animate-in fade-in-50 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
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
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Componente sem configuração necessária</AlertTitle>
              <AlertDescription>
                Este componente não requer configuração adicional. Ele está
                pronto para uso.
              </AlertDescription>
            </Alert>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in-50 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
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

            {connectionStatus.connected ? (
              <div className="space-y-4">
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-700 dark:text-green-400">
                    Conectado com sucesso!
                  </AlertTitle>
                  <AlertDescription className="text-green-600 dark:text-green-300">
                    {connectionStatus.accountName && (
                      <div className="mt-2 space-y-1">
                        <p>
                          <strong>Conta:</strong> {connectionStatus.accountName}
                        </p>
                        {connectionStatus.email && (
                          <p>
                            <strong>Email:</strong> {connectionStatus.email}
                          </p>
                        )}
                        {connectionStatus.provider && (
                          <p>
                            <strong>Provedor:</strong>{" "}
                            {connectionStatus.provider
                              .replace("_", " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </p>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>

                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  className="w-full"
                >
                  Desconectar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Conecte sua conta</AlertTitle>
                  <AlertDescription>
                    Para usar este componente, você precisa conectar sua conta.
                    Clique no botão abaixo para iniciar o processo de conexão.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-2">
                  {connectionOptions.map((option) => (
                    <Card
                      key={option.provider}
                      className="p-4 border-2 hover:border-primary/50 transition-all"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            {option.icon}
                          </div>
                          <div>
                            <h4 className="font-semibold">{option.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {option.description}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleOAuthConnect(option.provider)}
                          disabled={connecting}
                          className="w-full"
                          variant="outline"
                        >
                          {connecting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Conectando...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Conectar com {option.name}
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};
