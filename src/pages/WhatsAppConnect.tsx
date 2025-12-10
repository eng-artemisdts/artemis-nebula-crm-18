import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Smartphone,
  QrCode,
  CheckCircle2,
  Trash2,
  RefreshCw,
  MessageCircle,
  Zap,
  Star,
  Heart,
  Rocket,
  Crown,
  Sparkles,
  Trophy,
  Gem,
  Flame,
  Sun,
  Moon,
  Cloud,
  Leaf
} from "lucide-react";
import { Layout } from "@/components/Layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const INSTANCE_ICONS = [
  MessageCircle,
  Zap,
  Star,
  Heart,
  Rocket,
  Crown,
  Sparkles,
  Trophy,
  Gem,
  Flame,
  Sun,
  Moon,
  Cloud,
  Leaf,
];

const getInstanceIcon = (instanceId: string) => {
  let hash = 0;
  for (let i = 0; i < instanceId.length; i++) {
    hash = ((hash << 5) - hash) + instanceId.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % INSTANCE_ICONS.length;
  return INSTANCE_ICONS[index];
};

const WhatsAppConnect = () => {
  const [instanceName, setInstanceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<any>(null);
  const [instanceToDelete, setInstanceToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadInstances();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
    }
  };

  const loadInstances = async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInstances(data || []);
    } catch (error: any) {
      console.error("Error loading instances:", error);
    }
  };

  const createInstance = async () => {
    if (!instanceName.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um nome para a instância",
        variant: "destructive",
      });
      return;
    }

    // Verificar limite de 3 instâncias antes de criar
    if (instances.length >= 3) {
      toast({
        title: "Limite atingido",
        description: "Você já possui 3 instâncias. Delete uma instância existente para criar uma nova.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("evolution-create-instance", {
        body: { instanceName: instanceName.trim() },
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Instância criada com sucesso",
      });

      setInstanceName("");
      await loadInstances();
      setSelectedInstance(data.instance);
    } catch (error: any) {
      console.error("Error creating instance:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar instância",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const connectInstance = async (instance: any) => {
    setIsConnecting(true);
    setSelectedInstance(instance);

    try {
      const { data, error } = await supabase.functions.invoke("evolution-connect-instance", {
        body: { instanceName: instance.instance_name },
      });

      if (error) throw error;

      if (data.qrcode) {
        setQrCode(data.qrcode);
        // Poll for connection status
        startStatusPolling(instance.instance_name);
      }
    } catch (error: any) {
      console.error("Error connecting instance:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao conectar instância",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const reconnectInstance = async (instance: any) => {
    setIsConnecting(true);
    setSelectedInstance(instance);

    try {
      const { data, error } = await supabase.functions.invoke("evolution-connect-instance", {
        body: { instanceName: instance.instance_name },
      });

      if (error) {
        if (error.error) {
          throw new Error(error.error);
        }
        throw error;
      }

      if (data.qrcode) {
        setQrCode(data.qrcode);
        startStatusPolling(instance.instance_name);
        toast({
          title: "Reconectando...",
          description: "Escaneie o novo QR Code para reconectar",
        });
      } else {
        throw new Error("QR Code não recebido");
      }
    } catch (error: any) {
      console.error("Error reconnecting instance:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao reconectar instância",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const startStatusPolling = (instanceName: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("evolution-instance-status", {
          body: { instanceName },
        });

        if (error) {
          if (error.message?.includes("Já existe uma instância conectada")) {
            clearInterval(pollInterval);
            setQrCode(null);
            setIsConnecting(false);
            toast({
              title: "Erro",
              description: error.message || "Já existe uma instância conectada com este número de WhatsApp",
              variant: "destructive",
            });
            await loadInstances();
            return;
          }
          throw error;
        }

        const stateIsOpen = data.status === "open" || data.connected;

        const { data: updatedInstance } = await supabase
          .from("whatsapp_instances")
          .select("phone_number, whatsapp_jid, instance_name, status")
          .eq("instance_name", instanceName)
          .single();

        if (!updatedInstance) {
          console.error("Instance not found after connection");
          return;
        }

        const dbConnected = updatedInstance.status === "connected";
        const resolvedConnected = stateIsOpen || dbConnected;

        if (!resolvedConnected) {
          console.log("Instance not marked as connected yet, waiting...");
          return;
        }

        if (updatedInstance?.phone_number || updatedInstance?.whatsapp_jid) {
          const { data: duplicateInstances, error: checkError } = await supabase
            .from("whatsapp_instances")
            .select("instance_name, phone_number, whatsapp_jid")
            .eq("status", "connected")
            .neq("instance_name", instanceName);

          if (!checkError && duplicateInstances) {
            const hasDuplicate = duplicateInstances.some((inst) => {
              if (updatedInstance.phone_number && inst.phone_number === updatedInstance.phone_number) {
                return true;
              }
              if (updatedInstance.whatsapp_jid && inst.whatsapp_jid === updatedInstance.whatsapp_jid) {
                return true;
              }
              return false;
            });

            if (hasDuplicate) {
              const duplicate = duplicateInstances.find(
                (inst) =>
                  (updatedInstance.phone_number && inst.phone_number === updatedInstance.phone_number) ||
                  (updatedInstance.whatsapp_jid && inst.whatsapp_jid === updatedInstance.whatsapp_jid)
              );

              clearInterval(pollInterval);
              setQrCode(null);
              setIsConnecting(false);
              toast({
                title: "Erro",
                description: `Já existe uma instância conectada com este número de WhatsApp: ${duplicate?.instance_name}`,
                variant: "destructive",
              });
              await loadInstances();
              return;
            }
          }
        }

        clearInterval(pollInterval);
        setQrCode(null);
        setIsConnecting(false);
        toast({
          title: "Conectado!",
          description: "WhatsApp conectado com sucesso",
        });
        await loadInstances();
      } catch (error: any) {
        if (error.message?.includes("Já existe uma instância conectada")) {
          clearInterval(pollInterval);
          setQrCode(null);
          setIsConnecting(false);
          toast({
            title: "Erro",
            description: error.message || "Já existe uma instância conectada com este número de WhatsApp",
            variant: "destructive",
          });
          await loadInstances();
        } else {
          console.error("Error checking status:", error);
        }
      }
    }, 3000); // Check every 3 seconds

    // Stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsConnecting(false);
    }, 120000);
  };

  const deleteInstance = async () => {
    if (!instanceToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("evolution-delete-instance", {
        body: { instanceName: instanceToDelete.instance_name },
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Instância deletada com sucesso",
      });

      await loadInstances();
      setInstanceToDelete(null);
    } catch (error: any) {
      console.error("Error deleting instance:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao deletar instância",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Conectar WhatsApp</h1>
            <p className="text-muted-foreground">
              Gerencie suas instâncias do WhatsApp Business
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Nova Instância
              </CardTitle>
              <CardDescription>
                Crie uma nova instância do WhatsApp para começar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-start">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="instanceName">Nome da Instância</Label>
                  <Input
                    id="instanceName"
                    placeholder="Ex: atendimento-vendas"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    disabled={isCreating || instances.length >= 3}
                  />
                  <p className="text-sm text-muted-foreground">
                    {instances.length >= 3
                      ? "Limite de 3 instâncias atingido. Delete uma instância para criar uma nova."
                      : `${instances.length}/3 instâncias criadas`
                    }
                  </p>
                </div>
                <div className="flex items-center pt-8">
                  <Button
                    onClick={createInstance}
                    disabled={isCreating || !instanceName.trim() || instances.length >= 3}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar Instância"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {qrCode && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Escaneie o QR Code
                </CardTitle>
                <CardDescription>
                  Abra o WhatsApp no seu celular e escaneie o código abaixo
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg">
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Aguardando conexão...
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Instâncias Existentes</CardTitle>
              <CardDescription>
                Lista de todas as suas instâncias do WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              {instances.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma instância criada ainda
                </p>
              ) : (
                <div className="space-y-4">
                  {instances.map((instance) => {
                    const InstanceIcon = getInstanceIcon(instance.id);
                    return (
                      <div
                        key={instance.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <InstanceIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{instance.instance_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Status: {instance.status}
                            </p>
                            {instance.phone_number && (
                              <p className="text-sm font-medium text-primary mt-1">
                                Número: {instance.phone_number}
                              </p>
                            )}
                            {instance.connected_at && (
                              <p className="text-xs text-muted-foreground">
                                Conectado em: {new Date(instance.connected_at).toLocaleString("pt-BR")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {instance.status === "connected" ? (
                            <>
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="text-sm font-medium">Conectado</span>
                              </div>
                              <Button
                                onClick={() => reconnectInstance(instance)}
                                disabled={isConnecting && selectedInstance?.id === instance.id}
                                variant="outline"
                                size="sm"
                              >
                                {isConnecting && selectedInstance?.id === instance.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Reconectando...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Reconectar
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={() => connectInstance(instance)}
                              disabled={isConnecting && selectedInstance?.id === instance.id}
                              size="sm"
                            >
                              {isConnecting && selectedInstance?.id === instance.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Conectando...
                                </>
                              ) : (
                                "Conectar"
                              )}
                            </Button>
                          )}
                          <Button
                            onClick={() => setInstanceToDelete(instance)}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!instanceToDelete} onOpenChange={() => setInstanceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Instância</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a instância "{instanceToDelete?.instance_name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteInstance}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deletando...
                </>
              ) : (
                "Deletar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default WhatsAppConnect;