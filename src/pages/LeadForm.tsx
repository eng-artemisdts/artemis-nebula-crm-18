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

const LeadForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== "new";

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    status: "novo",
    contact_email: "",
    contact_whatsapp: "",
    source: "",
    integration_start_time: "09:00",
  });
  const [paymentData, setPaymentData] = useState({
    payment_link_url: "",
    payment_stripe_id: "",
    payment_status: "nao_criado",
  });

  useEffect(() => {
    fetchCategories();
    if (isEdit) {
      fetchLead();
    }
  }, [id]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("lead_categories").select("*");
    setCategories(data || []);
  };

  const fetchLead = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
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
        });
        setPaymentData({
          payment_link_url: data.payment_link_url || "",
          payment_stripe_id: data.payment_stripe_id || "",
          payment_status: data.payment_status,
        });
      }
    } catch (error: any) {
      toast.error("Erro ao carregar lead");
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const leadData = {
        ...formData,
        integration_start_time: `${formData.integration_start_time}:00+00`,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("leads")
          .update(leadData)
          .eq("id", id);
        if (error) throw error;
        toast.success("Lead atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("leads").insert([leadData]);
        if (error) throw error;
        toast.success("Lead criado com sucesso!");
      }
      navigate("/");
    } catch (error: any) {
      toast.error("Erro ao salvar lead");
      console.error(error);
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

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment-link", {
        body: { leadId: id },
      });

      if (error) throw error;
      
      setPaymentData({
        payment_link_url: data.url,
        payment_stripe_id: data.stripe_id,
        payment_status: "link_gerado",
      });
      
      await fetchLead();
      toast.success("Link de pagamento gerado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao gerar link de pagamento");
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
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
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
                  value={formData.contact_whatsapp}
                  onChange={(e) => setFormData({ ...formData, contact_whatsapp: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
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
