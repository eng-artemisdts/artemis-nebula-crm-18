import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Processando callback OAuth...");

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (error) {
          setStatus("error");
          setMessage(
            errorDescription || error || "Erro desconhecido na autorização"
          );
          toast.error("Erro na autorização OAuth");
          setTimeout(() => {
            if (window.opener) {
              window.close();
            } else {
              navigate("/ai-interaction");
            }
          }, 3000);
          return;
        }

        if (!code || !state) {
          setStatus("error");
          setMessage("Código de autorização ou state não fornecido");
          toast.error("Parâmetros OAuth inválidos");
          setTimeout(() => {
            if (window.opener) {
              window.close();
            } else {
              navigate("/ai-interaction");
            }
          }, 3000);
          return;
        }

        let stateData: {
          component_id: string;
          provider: string;
          user_id: string;
        };
        try {
          stateData = JSON.parse(atob(state));
        } catch {
          setStatus("error");
          setMessage("State inválido");
          toast.error("State OAuth inválido");
          setTimeout(() => {
            if (window.opener) {
              window.close();
            } else {
              navigate("/ai-interaction");
            }
          }, 3000);
          return;
        }

        console.log("📋 Processando callback OAuth:", {
          code: code ? "presente" : "ausente",
          state: state ? "presente" : "ausente",
          stateData,
        });

        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;

        if (!accessToken) {
          console.error("❌ Token de autenticação não encontrado");
          throw new Error("Você precisa estar autenticado para conectar OAuth");
        }

        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/oauth-callback?code=${encodeURIComponent(
            code
          )}&state=${encodeURIComponent(state)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const data = await response.json();

        console.log("📥 Resposta do callback:", {
          success: data.success,
          error: data.error,
          details: data.details,
        });

        if (!data.success) {
          const errorMessage =
            data.error ||
            data.details ||
            "Erro desconhecido ao processar callback";
          console.error("❌ Erro no callback:", {
            error: errorMessage,
            fullResponse: data,
          });
          throw new Error(errorMessage);
        }

        setStatus("success");
        setMessage("Conexão realizada com sucesso!");
        toast.success("Conexão OAuth realizada com sucesso!");

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: "oauth-success",
              componentId: stateData.component_id,
              provider: stateData.provider,
            },
            "*"
          );
        }

        setTimeout(() => {
          if (window.opener) {
            window.close();
          } else {
            navigate(`/components/${stateData.component_id}/configure`);
          }
        }, 2000);
      } catch (error: unknown) {
        console.error("❌ Erro ao processar callback OAuth:", error);

        let errorMessage = "Erro ao processar callback OAuth";

        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === "object" && error !== null) {
          const errorObj = error as { error?: string; message?: string };
          errorMessage = errorObj.error || errorObj.message || errorMessage;
        }

        console.error("📋 Detalhes do erro:", {
          message: errorMessage,
          error,
          code: searchParams.get("code"),
          state: searchParams.get("state"),
        });

        setStatus("error");
        setMessage(errorMessage);
        toast.error(errorMessage, {
          duration: 5000,
        });
        setTimeout(() => {
          if (window.opener) {
            window.close();
          } else {
            navigate("/ai-interaction");
          }
        }, 5000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-background p-4">
      <Card className="w-full max-w-md p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
            <h1 className="text-2xl font-bold mb-2">Processando...</h1>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h1 className="text-2xl font-bold mb-2 text-green-600 dark:text-green-400">
              Conexão Bem-sucedida!
            </h1>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground mt-4">
              Esta janela será fechada automaticamente...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-bold mb-2 text-red-600 dark:text-red-400">
              Erro na Conexão
            </h1>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground mt-4">
              Esta janela será fechada automaticamente...
            </p>
          </>
        )}
      </Card>
    </div>
  );
};
