import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, DollarSign, ExternalLink } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { cleanPhoneNumber, formatPhoneDisplay } from "@/lib/utils";

const LeadForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== "new";
  const { organization } = useOrganization();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [aiInteractions, setAiInteractions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    status: "novo",
    contact_email: "",
    contact_whatsapp: "",
    source: "",
    integration_start_time: "09:00",
    payment_amount: "",
    ai_interaction_id: "",
  });
  const [paymentData, setPaymentData] = useState({
    payment_link_url: "",
    payment_stripe_id: "",
    payment_status: "nao_criado",
  });

  useEffect(() => {
    fetchCategories();
    fetchAIInteractions();
    if (isEdit) {
      fetchLead();
    }
  }, [id]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("lead_categories").select("*");
    setCategories(data || []);
  };

  const fetchAIInteractions = async () => {
    const { data } = await supabase
      .from("ai_interaction_settings")
      .select("*")
      .order("name");
    setAiInteractions(data || []);
  };


  const fetchLead = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Fetch lead error:", error);
        throw error;
      }
      
      if (data) {
        setFormData({
          name: data.name,
          description: data.description || "",
          category: data.category || "",
          status: data.status,
          contact_email: data.contact_email || "",
          contact_whatsapp: data.contact_whatsapp || "",
          source: data.source || "",
          integration_start_time: data.integration_start_time?.slice(0, 5) || "09:00",
          payment_amount: data.payment_amount 
            ? data.payment_amount.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "",
          ai_interaction_id: data.ai_interaction_id || "",
        });
        setPaymentData({
          payment_link_url: data.payment_link_url || "",
          payment_stripe_id: data.payment_stripe_id || "",
          payment_status: data.payment_status,
        });
      }
    } catch (error: any) {
      toast.error("Erro ao carregar lead");
      console.error("Fetch error:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate phone number if provided
      if (formData.contact_whatsapp) {
        const cleanedPhone = cleanPhoneNumber(formData.contact_whatsapp);
        if (cleanedPhone.length < 10 || cleanedPhone.length > 13) {
          toast.error("Número de WhatsApp inválido. Use formato: (11) 99999-9999");
          setLoading(false);
          return;
        }
      }

      // Parse payment amount from formatted string
      const paymentAmount = formData.payment_amount
        ? parseFloat(formData.payment_amount.replace(/\./g, "").replace(",", "."))
        : null;

      const cleanedPhone = formData.contact_whatsapp ? cleanPhoneNumber(formData.contact_whatsapp) : null;
      
      // Get correct remote_jid from Evolution API if phone exists
      let remoteJid = null;
      if (cleanedPhone) {
        try {
          const { data: checkData, error: checkError } = await supabase.functions.invoke('evolution-check-whatsapp', {
            body: { numbers: [cleanedPhone] }
          });

          if (checkError) {
            console.error("Error checking WhatsApp:", checkError);
            toast.error("Erro ao validar número no WhatsApp");
            setLoading(false);
            return;
          }

          if (checkData?.results?.[0]?.exists && checkData.results[0].jid) {
            remoteJid = checkData.results[0].jid;
            console.log("WhatsApp verified, jid:", remoteJid);
          } else {
            toast.error("Este número não está registrado no WhatsApp");
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error validating WhatsApp:", error);
          toast.error("Erro ao validar WhatsApp. Verifique se há uma instância conectada.");
          setLoading(false);
          return;
        }
      }
      
      const leadData = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        status: formData.status,
        contact_email: formData.contact_email || null,
        contact_whatsapp: cleanedPhone,
        remote_jid: remoteJid,
        whatsapp_verified: remoteJid ? true : false,
        source: formData.source || null,
        integration_start_time: formData.integration_start_time ? `${formData.integration_start_time}:00+00` : null,
        payment_amount: paymentAmount,
        ai_interaction_id: formData.ai_interaction_id || null,
        payment_link_url: paymentData.payment_link_url || null,
        payment_stripe_id: paymentData.payment_stripe_id || null,
        payment_status: paymentData.payment_status,
        ...(isEdit ? {} : { organization_id: organization?.id }),
      };

      if (isEdit) {
        const { error } = await supabase
          .from("leads")
          .update(leadData)
          .eq("id", id);
        if (error) {
          console.error("Update error:", error);
          throw error;
        }
        toast.success("Lead atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("leads").insert([leadData]);
        if (error) {
          console.error("Insert error:", error);
          throw error;
        }
        toast.success("Lead criado com sucesso!");
      }
      navigate("/");
    } catch (error: any) {
      const errorMessage = error?.message || "Erro ao salvar lead";
      toast.error(errorMessage);
      console.error("Save lead error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Tem certeza que deseja excluir este lead?")) return;

    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      toast.success("Lead excluído com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error("Erro ao excluir lead");
      console.error(error);
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!isEdit) {
      toast.error("Salve o lead primeiro antes de gerar um link de pagamento");
      return;
    }

    // Validate payment amount
    const amount = formData.payment_amount
      ? parseFloat(formData.payment_amount.replace(/\./g, "").replace(",", "."))
      : 0;
    
    if (!amount || amount <= 0) {
      toast.error("Defina um valor válido para a proposta antes de gerar o link");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment-link", {
        body: { 
          leadId: id,
          paymentAmount: amount 
        },
      });

      if (error) throw error;
      
      setPaymentData({
        payment_link_url: data.url,
        payment_stripe_id: data.stripe_id,
        payment_status: "link_gerado",
      });
      
      await fetchLead();
      
      // Open checkout in new tab
      window.open(data.url, '_blank');
      toast.success("Checkout aberto! Complete o pagamento na nova aba.");
    } catch (error: any) {
      toast.error("Erro ao gerar checkout de pagamento");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEdit ? "Editar Lead" : "Novo Lead"}
            </h1>
            <p className="text-muted-foreground">
              {isEdit ? "Atualize as informações do lead" : "Adicione um novo lead ao sistema"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Nome do lead"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category || "none"}
                  onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o lead..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="conversa_iniciada">Conversa Iniciada</SelectItem>
                    <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                    <SelectItem value="link_pagamento_enviado">Link de Pagamento Enviado</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Origem</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="Ex: Google Ads, Indicação..."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email de Contato</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_whatsapp">WhatsApp</Label>
                <Input
                  id="contact_whatsapp"
                  value={formData.contact_whatsapp ? formatPhoneDisplay(formData.contact_whatsapp) : ""}
                  onChange={(e) => {
                    const cleaned = cleanPhoneNumber(e.target.value);
                    setFormData({ ...formData, contact_whatsapp: cleaned });
                  }}
                  placeholder="(11) 99999-9999"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  Digite apenas números. Exemplo: 11999998888 ou 5511999998888
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai_interaction">
                <div className="flex items-center gap-2">
                  Configuração de IA para este Lead
                </div>
              </Label>
              <Select
                value={formData.ai_interaction_id || "default"}
                onValueChange={(value) => setFormData({ ...formData, ai_interaction_id: value === "default" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Usar configuração padrão ou escolher específica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Usar configuração padrão</SelectItem>
                  {aiInteractions.map((ai) => (
                    <SelectItem key={ai.id} value={ai.id}>
                      {ai.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se não selecionar, será usada a configuração padrão definida em Settings
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="integration_start_time">Horário de Integração (n8n)</Label>
              <Input
                id="integration_start_time"
                type="time"
                value={formData.integration_start_time}
                onChange={(e) => setFormData({ ...formData, integration_start_time: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Horário diário para iniciar o fluxo de automação
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_amount">Valor da Proposta (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  R$
                </span>
                <Input
                  id="payment_amount"
                  type="text"
                  value={formData.payment_amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value === "") {
                      setFormData({ ...formData, payment_amount: "" });
                      return;
                    }
                    const numbers = value;
                    const amount = parseFloat(numbers) / 100;
                    const formatted = amount.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                    setFormData({ ...formData, payment_amount: formatted });
                  }}
                  placeholder="0,00"
                  className="pl-12"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Valor individual desta proposta em Reais
              </p>
            </div>
          </Card>

          {/* Payment Section */}
          {isEdit && (
            <Card className="p-6 space-y-4 border-accent/30">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-semibold">Pagamento Stripe</h3>
              </div>

              {paymentData.payment_status === "nao_criado" ? (
                <Button
                  type="button"
                  onClick={handleGeneratePaymentLink}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Gerar Link de Pagamento
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <span className="text-sm font-medium">Status:</span>
                    <span className="text-sm capitalize">{paymentData.payment_status.replace("_", " ")}</span>
                  </div>
                  {paymentData.payment_link_url && (
                    <a
                      href={paymentData.payment_link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors text-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Abrir Link de Pagamento
                    </a>
                  )}
                  <Button
                    type="button"
                    onClick={handleGeneratePaymentLink}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    Regerar Link
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={loading} className="flex-1" size="lg">
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? "Salvar Alterações" : "Criar Lead"}
            </Button>
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                size="lg"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default LeadForm;
