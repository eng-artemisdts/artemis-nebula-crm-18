import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    id: "",
    default_integration_start_time: "09:00",
    n8n_webhook_url: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .single();

      if (error) throw error;
      if (data) {
        setSettings({
          id: data.id,
          default_integration_start_time: data.default_integration_start_time?.slice(0, 5) || "09:00",
          n8n_webhook_url: data.n8n_webhook_url || "",
        });
      }
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("settings")
        .update({
          default_integration_start_time: `${settings.default_integration_start_time}:00+00`,
          n8n_webhook_url: settings.n8n_webhook_url,
        })
        .eq("id", settings.id);

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar configurações");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">Gerencie as configurações globais do sistema</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">Configurações Gerais</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="default_time">
                    Horário Padrão de Integração
                  </Label>
                  <Input
                    id="default_time"
                    type="time"
                    value={settings.default_integration_start_time}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_integration_start_time: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Horário padrão usado para novos leads (pode ser alterado individualmente)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook_url">URL do Webhook n8n</Label>
                  <Input
                    id="webhook_url"
                    type="url"
                    value={settings.n8n_webhook_url}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        n8n_webhook_url: e.target.value,
                      })
                    }
                    placeholder="https://your-n8n-instance.com/webhook/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    URL do webhook do n8n para automações de leads
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-muted/50 border-accent/30">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="text-accent">💡</span>
                Dicas de Integração
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Configure o webhook do n8n para receber informações dos leads</li>
                <li>Use o horário de integração para agendar automações diárias</li>
                <li>O horário pode ser personalizado para cada lead individualmente</li>
              </ul>
            </div>
          </Card>

          <Button type="submit" disabled={loading} size="lg" className="w-full gap-2">
            <Save className="w-4 h-4" />
            Salvar Configurações
          </Button>
        </form>
      </div>
    </Layout>
  );
};

export default Settings;
