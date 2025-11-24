import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";

interface PlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const plans = [
  {
    id: "free",
    name: "Free",
    price: "R$ 0",
    features: [
      "1 usuário",
      "Até 10 leads",
      "Recursos básicos",
      "Suporte por email",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "R$ 97",
    popular: true,
    features: [
      "Até 3 usuários",
      "Até 100 leads",
      "Recursos avançados",
      "Suporte prioritário",
      "Integrações",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "R$ 297",
    features: [
      "Usuários ilimitados",
      "Leads ilimitados",
      "Todos os recursos",
      "Suporte 24/7",
      "API personalizada",
      "Gerente de conta dedicado",
    ],
  },
];

export const PlanModal = ({ open, onOpenChange }: PlanModalProps) => {
  const { organization, loading } = useOrganization();
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleUpdatePlan = async () => {
    if (!selectedPlan || !organization) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ plan: selectedPlan })
        .eq("id", organization.id);

      if (error) throw error;

      toast({
        title: "Plano atualizado!",
        description: "Seu plano foi alterado com sucesso.",
      });
      
      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      console.error("Error updating plan:", error);
      toast({
        title: "Erro ao atualizar plano",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Escolha seu Plano
          </DialogTitle>
          <DialogDescription>
            Selecione o plano que melhor atende às suas necessidades
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-6 cursor-pointer transition-all duration-300 hover:scale-105 ${
                selectedPlan === plan.id
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                  : "border-border hover:border-primary/50"
              } ${
                plan.popular
                  ? "ring-2 ring-primary ring-offset-2"
                  : ""
              } ${
                organization?.plan === plan.id
                  ? "bg-accent/30"
                  : ""
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
                  Mais Popular
                </div>
              )}
              {organization?.plan === plan.id && (
                <div className="absolute -top-3 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  Plano Atual
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {plan.price}
                </div>
                <p className="text-sm text-muted-foreground mt-1">/mês</p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpdatePlan}
            disabled={!selectedPlan || selectedPlan === organization?.plan || isUpdating}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {isUpdating ? "Atualizando..." : "Confirmar Mudança"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
