import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Bot, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const AIConfiguration = () => {
  const [loading, setLoading] = useState(false);
  const [settingsId, setSettingsId] = useState("");
  const [defaultAIInteractionId, setDefaultAIInteractionId] = useState("");
  const [aiInteractions, setAiInteractions] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchAIInteractions();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettingsId(data.id);
        setDefaultAIInteractionId(data.default_ai_interaction_id || "none");
      } else {
        // Create settings record if it doesn't exist
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", (await supabase.auth.getUser()).data.user?.id)
          .single();
        
        if (profile) {
          const { data: newSettings, error: createError } = await supabase
            .from("settings")
            .insert({ organization_id: profile.organization_id })
            .select()
            .single();
          
          if (createError) throw createError;
          if (newSettings) {
            setSettingsId(newSettings.id);
            setDefaultAIInteractionId("none");
          }
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao carregar configurações");
    }
  };

  const fetchAIInteractions = async () => {
    const { data } = await supabase
      .from("ai_interaction_settings")
      .select("*")
      .order("name");
    setAiInteractions(data || []);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settingsId) {
      toast.error("Aguarde o carregamento das configurações");
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from("settings")
        .update({
          default_ai_interaction_id: defaultAIInteractionId === "none" ? null : defaultAIInteractionId,
        })
        .eq("id", settingsId);

      if (error) throw error;
      toast.success("Configuração de IA salva com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar configuração");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Configuração de IA Padrão</h1>
            <p className="text-muted-foreground">
              Defina qual configuração de IA será usada por padrão para novos leads
            </p>
          </div>
        </div>

        {/* Alert de Importância */}
        <Alert className="border-primary/50 bg-primary/5">
          <AlertCircle className="h-5 w-5 text-primary" />
          <AlertTitle className="text-lg font-semibold">Importante!</AlertTitle>
          <AlertDescription className="text-base mt-2">
            Configure uma IA padrão para automatizar o atendimento dos seus leads. 
            Essa configuração será aplicada automaticamente a todos os novos leads criados, 
            mas você poderá escolher uma configuração diferente para cada lead individualmente.
            <br /><br />
            <strong>Sem uma configuração padrão, você precisará selecionar manualmente a IA para cada lead.</strong>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Configuração de IA Padrão
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="default_ai_interaction" className="text-base">
                    Selecione a configuração padrão
                  </Label>
                  <Select
                    value={defaultAIInteractionId}
                    onValueChange={setDefaultAIInteractionId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione uma configuração padrão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma (escolher manualmente por lead)</SelectItem>
                      {aiInteractions.map((ai) => (
                        <SelectItem key={ai.id} value={ai.id}>
                          {ai.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Esta configuração será usada automaticamente para novos leads, mas você pode 
                    escolher uma diferente para cada lead no momento da criação ou edição.
                  </p>
                </div>

                {aiInteractions.length === 0 && (
                  <Alert className="border-amber-500/50 bg-amber-500/5">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <AlertDescription>
                      Você ainda não tem configurações de IA criadas. Vá para "Interações com IA" 
                      no menu lateral para criar suas primeiras configurações.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-muted/50 border-accent/30">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="text-accent">💡</span>
                Dicas
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Escolha a configuração que melhor representa seu negócio como padrão</li>
                <li>Você pode ter diferentes configurações para diferentes tipos de leads</li>
                <li>A configuração pode ser alterada individualmente para cada lead</li>
                <li>Configure múltiplas interações de IA na página "Interações com IA"</li>
              </ul>
            </div>
          </Card>

          <Button 
            type="submit" 
            disabled={loading} 
            size="lg" 
            className="w-full gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar Configuração
          </Button>
        </form>
      </div>
    </Layout>
  );
};

export default AIConfiguration;
