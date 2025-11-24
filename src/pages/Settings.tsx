import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Settings as SettingsIcon, Building2, Upload, CreditCard } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { PlanModal } from "@/components/PlanModal";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { organization } = useOrganization();
  const [settings, setSettings] = useState({
    id: "",
    default_integration_start_time: "09:00",
    n8n_webhook_url: "",
  });
  const [companyInfo, setCompanyInfo] = useState({
    company_name: "",
    cnpj: "",
    phone: "",
    address: "",
    website: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
    if (organization) {
      setCompanyInfo({
        company_name: organization.company_name || "",
        cnpj: organization.cnpj || "",
        phone: organization.phone || "",
        address: organization.address || "",
        website: organization.website || "",
      });
      setLogoPreview(organization.logo_url);
    }
  }, [organization]);

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

  const handleCompanyInfoSave = async () => {
    if (!organization) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("organizations")
        .update(companyInfo)
        .eq("id", organization.id);

      if (error) throw error;
      toast.success("Informações da empresa atualizadas!");
    } catch (error: any) {
      toast.error("Erro ao atualizar informações");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 2MB");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !organization) return;
    setUploadingLogo(true);

    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${organization.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: publicUrl })
        .eq("id", organization.id);

      if (updateError) throw updateError;

      toast.success("Logo atualizada com sucesso!");
      setLogoFile(null);
      window.location.reload(); // Refresh to show new logo
    } catch (error: any) {
      toast.error("Erro ao fazer upload da logo");
      console.error(error);
    } finally {
      setUploadingLogo(false);
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

        <div className="space-y-6">
          {/* Plan Management Section */}
          <Card className="p-6 space-y-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Plano Atual</h3>
                  <p className="text-sm text-muted-foreground">
                    Você está no plano{" "}
                    <span className="font-semibold text-primary capitalize">
                      {organization?.plan || "free"}
                    </span>
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setIsPlanModalOpen(true)}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                Mudar de Plano
              </Button>
            </div>
          </Card>

          {/* Company Information Section */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold">Informações da Empresa</h3>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_logo">Logo da Empresa</Label>
                <div className="flex items-center gap-4">
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-20 h-20 object-contain rounded-lg border border-border"
                    />
                  )}
                  <div className="flex-1">
                    <Input
                      id="company_logo"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleLogoChange}
                      disabled={uploadingLogo}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG ou JPEG (máx. 2MB)
                    </p>
                  </div>
                  {logoFile && (
                    <Button
                      type="button"
                      onClick={handleLogoUpload}
                      disabled={uploadingLogo}
                      size="sm"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingLogo ? "Enviando..." : "Enviar"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Nome da Empresa</Label>
                <Input
                  id="company_name"
                  value={companyInfo.company_name}
                  onChange={(e) =>
                    setCompanyInfo({ ...companyInfo, company_name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={companyInfo.cnpj}
                    onChange={(e) =>
                      setCompanyInfo({ ...companyInfo, cnpj: e.target.value })
                    }
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={companyInfo.phone}
                    onChange={(e) =>
                      setCompanyInfo({ ...companyInfo, phone: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={companyInfo.address}
                  onChange={(e) =>
                    setCompanyInfo({ ...companyInfo, address: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={companyInfo.website}
                  onChange={(e) =>
                    setCompanyInfo({ ...companyInfo, website: e.target.value })
                  }
                  placeholder="https://www.exemplo.com.br"
                />
              </div>

              <Button
                type="button"
                onClick={handleCompanyInfoSave}
                disabled={loading}
                className="w-full gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Informações da Empresa
              </Button>
            </div>
          </Card>

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
      </div>

      <PlanModal open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen} />
    </Layout>
  );
};

export default Settings;
