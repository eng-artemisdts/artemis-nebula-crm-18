import { Badge } from "@/components/ui/badge";

type Status =
  | "novo"
  | "conversa_iniciada"
  | "proposta_enviada"
  | "link_pagamento_enviado"
  | "pago"
  | "perdido";

const statusConfig: Record<Status, { label: string; className: string }> = {
  novo: { label: "Novo", className: "bg-status-novo/20 text-status-novo border-status-novo/30" },
  conversa_iniciada: { label: "Conversa Iniciada", className: "bg-status-conversa/20 text-status-conversa border-status-conversa/30" },
  proposta_enviada: { label: "Proposta Enviada", className: "bg-status-proposta/20 text-status-proposta border-status-proposta/30" },
  link_pagamento_enviado: { label: "Link de Pagamento Enviado", className: "bg-status-pagamento/20 text-status-pagamento border-status-pagamento/30" },
  pago: { label: "Pago", className: "bg-status-pago/20 text-status-pago border-status-pago/30" },
  perdido: { label: "Perdido", className: "bg-status-perdido/20 text-status-perdido border-status-perdido/30" },
};

export const StatusBadge = ({ status }: { status: Status }) => {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={`${config.className} border font-medium`}>
      {config.label}
    </Badge>
  );
};
