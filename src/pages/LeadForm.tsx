import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, DollarSign, ExternalLink, MessageCircle, AlertTriangle, Info, RefreshCw, CheckCircle } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { cleanPhoneNumber, formatPhoneDisplay, formatWhatsAppNumber } from "@/lib/utils";
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

const LeadForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== "new";
  const { organization } = useOrganization();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [aiInteractions, setAiInteractions] = useState<any[]>([]);
  const [invalidWhatsAppConfirmed, setInvalidWhatsAppConfirmed] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [isValidatingWhatsApp, setIsValidatingWhatsApp] = useState(false);
  const [leadRemoteJid, setLeadRemoteJid] = useState<string | null>(null);
  const [leadWhatsappVerified, setLeadWhatsappVerified] = useState<boolean>(false);
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
        setLeadRemoteJid(data.remote_jid);
        setLeadWhatsappVerified(data.whatsapp_verified || false);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar lead");
      console.error("Fetch error:", error);
    }
  };

  const handleSubmitWithoutValidation = async () => {
    setLoading(true);
    try {
      const cleanedPhone = formData.contact_whatsapp ? formatWhatsAppNumber(formData.contact_whatsapp) : null;

      // Continua sem validação do WhatsApp
      const remoteJid = null;
      const whatsappVerified = false;

      const paymentAmount = formData.payment_amount
        ? parseFloat(formData.payment_amount.replace(/\./g, "").replace(",", "."))
        : null;

      const leadData = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        status: formData.status,
        contact_email: formData.contact_email || null,
        contact_whatsapp: cleanedPhone,
        remote_jid: remoteJid,
        whatsapp_verified: whatsappVerified,
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
        if (error) throw error;
        toast.success("Lead atualizado! ⚠️ WhatsApp não verificado - mensagens automáticas desabilitadas.");
      } else {
        const { error } = await supabase.from("leads").insert([leadData]);
        if (error) throw error;
        toast.success("Lead criado! ⚠️ WhatsApp não verificado - mensagens automáticas desabilitadas.");
      }

      setInvalidWhatsAppConfirmed(false);
      navigate("/");
    } catch (error: any) {
      const errorMessage = error?.message || "Erro ao salvar lead";
      toast.error(errorMessage);
      console.error("Save lead error:", error);
    } finally {
      setLoading(false);
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

      const cleanedPhone = formData.contact_whatsapp ? formatWhatsAppNumber(formData.contact_whatsapp) : null;

      // Get correct remote_jid from Evolution API if phone exists
      let remoteJid = null;
      let whatsappVerified = false;

      if (cleanedPhone && !invalidWhatsAppConfirmed) {
        try {
          const { data: checkData, error: checkError } = await supabase.functions.invoke('evolution-check-whatsapp', {
            body: { numbers: [cleanedPhone] }
          });

          if (checkError) {
            console.error("Error checking WhatsApp:", checkError);

            // Verifica se é erro de instância não conectada
            const isNoInstanceError = checkError.message?.includes("No connected WhatsApp instance") ||
              checkError.message?.includes("connected WhatsApp instance");

            if (isNoInstanceError) {
              // Mostra diálogo informativo sobre instância não conectada
              setLoading(false);
              setShowWhatsAppDialog(true);
              return;
            }

            // Para outros erros, pergunta se quer continuar
            const shouldContinue = window.confirm(
              "Não foi possível validar o número no WhatsApp. Deseja cadastrar mesmo assim?\n\n" +
              "⚠️ Atenção: Não será possível enviar mensagens automaticamente para este lead."
            );

            if (!shouldContinue) {
              setLoading(false);
              return;
            }

            // Continua sem validação
            remoteJid = null;
            whatsappVerified = false;
          } else if (checkData?.results?.[0]?.exists && checkData.results[0].jid) {
            remoteJid = checkData.results[0].jid;
            whatsappVerified = true;
            console.log("WhatsApp verified, jid:", remoteJid);
          } else {
            // Número não existe no WhatsApp - pedir confirmação
            const shouldContinue = window.confirm(
              "⚠️ Este número não está registrado no WhatsApp!\n\n" +
              "Deseja cadastrar o lead mesmo assim?\n\n" +
              "Nota: Não será possível enviar mensagens automaticamente para este lead."
            );

            if (!shouldContinue) {
              setLoading(false);
              return;
            }

            // Usuário confirmou, salvar sem remote_jid
            setInvalidWhatsAppConfirmed(true);
            remoteJid = null;
            whatsappVerified = false;
          }
        } catch (error) {
          console.error("Error validating WhatsApp:", error);

          const shouldContinue = window.confirm(
            "Erro ao validar WhatsApp. Deseja cadastrar mesmo assim?\n\n" +
            "⚠️ Verifique se há uma instância WhatsApp conectada.\n" +
            "Não será possível enviar mensagens automaticamente para este lead."
          );

          if (!shouldContinue) {
            setLoading(false);
            return;
          }

          remoteJid = null;
          whatsappVerified = false;
        }
      } else if (cleanedPhone && invalidWhatsAppConfirmed) {
        // Já foi confirmado anteriormente nesta sessão
        remoteJid = null;
        whatsappVerified = false;
      }

      const leadData = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        status: formData.status,
        contact_email: formData.contact_email || null,
        contact_whatsapp: cleanedPhone,
        remote_jid: remoteJid,
        whatsapp_verified: whatsappVerified,
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

        if (whatsappVerified) {
          toast.success("Lead atualizado com sucesso! ✅ WhatsApp verificado - pronto para agendar interações.");
        } else if (cleanedPhone) {
          toast.warning("Lead atualizado! ⚠️ WhatsApp não verificado. Não será possível agendar interações ou iniciar conversas automáticas até que o WhatsApp seja verificado. Configure uma instância WhatsApp conectada e tente novamente.");
        } else {
          toast.success("Lead atualizado com sucesso! ⚠️ Para agendar interações, adicione um WhatsApp válido.");
        }
      } else {
        const { error } = await supabase.from("leads").insert([leadData]);
        if (error) {
          console.error("Insert error:", error);
          throw error;
        }

        if (whatsappVerified) {
          toast.success("Lead criado com sucesso! ✅ WhatsApp verificado - pronto para agendar interações.");
        } else if (cleanedPhone) {
          toast.warning("Lead criado! ⚠️ WhatsApp não verificado. Não será possível agendar interações ou iniciar conversas automáticas até que o WhatsApp seja verificado. Configure uma instância WhatsApp conectada e tente novamente.");
        } else {
          toast.success("Lead criado com sucesso! ⚠️ Para agendar interações, adicione um WhatsApp válido.");
        }
      }

      // Reset confirmation state
      setInvalidWhatsAppConfirmed(false);
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

  const handleValidateWhatsApp = async () => {
    if (!formData.contact_whatsapp) {
      toast.error("Adicione um número de WhatsApp primeiro");
      return;
    }

    setIsValidatingWhatsApp(true);

    try {
      const cleanedPhone = cleanPhoneNumber(formData.contact_whatsapp);

      if (cleanedPhone.length < 10 || cleanedPhone.length > 13) {
        toast.error("Número de WhatsApp inválido. Use formato: (11) 99999-9999");
        setIsValidatingWhatsApp(false);
        return;
      }

      const { data: checkData, error: checkError } = await supabase.functions.invoke('evolution-check-whatsapp', {
        body: { numbers: [cleanedPhone] }
      });

      if (checkError) {
        console.error("Error checking WhatsApp:", checkError);

        const isNoInstanceError = checkError.message?.includes("No connected WhatsApp instance") ||
          checkError.message?.includes("connected WhatsApp instance");

        if (isNoInstanceError) {
          setShowWhatsAppDialog(true);
          setIsValidatingWhatsApp(false);
          return;
        }

        toast.error("Erro ao validar WhatsApp: " + (checkError.message || "Erro desconhecido"));
        setIsValidatingWhatsApp(false);
        return;
      }

      if (checkData?.results?.[0]?.exists && checkData.results[0].jid) {
        const remoteJid = checkData.results[0].jid;

        if (isEdit && id) {
          const { error: updateError } = await supabase
            .from("leads")
            .update({
              remote_jid: remoteJid,
              whatsapp_verified: true
            })
            .eq("id", id);

          if (updateError) {
            console.error("Error updating lead:", updateError);
            toast.error("Erro ao atualizar lead");
            setIsValidatingWhatsApp(false);
            return;
          }

          setLeadRemoteJid(remoteJid);
          setLeadWhatsappVerified(true);
          toast.success("WhatsApp validado com sucesso! ✅ Agora é possível agendar interações.");
        } else {
          setLeadRemoteJid(remoteJid);
          setLeadWhatsappVerified(true);
          toast.success("WhatsApp validado! ✅ O remote_jid será salvo quando você salvar o lead.");
        }
      } else {
        toast.warning("Este número não está registrado no WhatsApp. Verifique se o número está correto.");
      }
    } catch (error: any) {
      console.error("Error validating WhatsApp:", error);
      toast.error("Erro ao validar WhatsApp: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsValidatingWhatsApp(false);
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
                <Alert className="border-amber-500/50 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    Importante para Agendar Interações
                  </AlertTitle>
                  <AlertDescription className="text-xs text-amber-700/90 dark:text-amber-400/90 mt-1">
                    Para poder agendar interações com IA e iniciar conversas automáticas, este lead precisa ter:
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>WhatsApp válido e verificado</li>
                      <li>Remote JID configurado (gerado automaticamente quando o número é verificado)</li>
                    </ul>
                    {isEdit && formData.contact_whatsapp && (!leadRemoteJid || !leadWhatsappVerified) && (
                      <div className="mt-2 pt-2 border-t border-amber-500/30">
                        <p className="mb-2 font-medium">WhatsApp não verificado</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleValidateWhatsApp}
                          disabled={isValidatingWhatsApp}
                          className="w-full gap-2 border-amber-500/50 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
                        >
                          <RefreshCw className={`w-4 h-4 ${isValidatingWhatsApp ? "animate-spin" : ""}`} />
                          {isValidatingWhatsApp ? "Validando..." : "Validar WhatsApp Agora"}
                        </Button>
                      </div>
                    )}
                    {isEdit && leadRemoteJid && leadWhatsappVerified && (
                      <div className="mt-2 pt-2 border-t border-amber-500/30">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">WhatsApp verificado e pronto para agendar interações</span>
                        </div>
                      </div>
                    )}
                    {!isEdit && (
                      <p className="mt-2">O sistema tentará validar o número automaticamente ao salvar. Se a validação falhar, o lead poderá ser salvo, mas não será possível agendar interações até que o WhatsApp seja verificado.</p>
                    )}
                  </AlertDescription>
                </Alert>
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
                disabled={loading}
                size="lg"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* WhatsApp Instance Dialog */}
      <AlertDialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-warning" />
              WhatsApp Não Configurado
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Não há nenhuma instância WhatsApp conectada no momento.
              </p>
              <p>
                Para validar números de WhatsApp e enviar mensagens automáticas, você precisa:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Criar uma instância WhatsApp</li>
                <li>Conectar a instância escaneando o QR Code</li>
                <li>Aguardar a conexão ser estabelecida</li>
              </ul>
              <p className="mt-3 font-medium">
                Deseja configurar o WhatsApp agora ou cadastrar o lead sem validação?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowWhatsAppDialog(false);
              setLoading(false);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowWhatsAppDialog(false);
                navigate("/whatsapp");
              }}
              className="bg-primary"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Configurar WhatsApp
            </AlertDialogAction>
            <AlertDialogAction
              onClick={async () => {
                setShowWhatsAppDialog(false);
                // Continua sem validação - marca como confirmado
                setInvalidWhatsAppConfirmed(true);
                // Salva o lead sem validação do WhatsApp
                await handleSubmitWithoutValidation();
              }}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Continuar Sem Validação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default LeadForm;
