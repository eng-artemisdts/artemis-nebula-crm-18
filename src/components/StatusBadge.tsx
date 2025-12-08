import { Badge } from "@/components/ui/badge";

type Status = string;

const defaultStatusConfig: Record<string, { label: string; className: string }> = {
  new: { label: "Novo", className: "bg-status-novo/20 text-status-novo border-status-novo/30" },
  conversation_started: { label: "Conversa Iniciada", className: "bg-status-conversa/20 text-status-conversa border-status-conversa/30" },
  finished: { label: "Finalizado", className: "bg-green-500/20 text-green-600 border-green-500/30 dark:text-green-400" },
  proposta_enviada: { label: "Proposta Enviada", className: "bg-status-proposta/20 text-status-proposta border-status-proposta/30" },
  link_pagamento_enviado: { label: "Link de Pagamento Enviado", className: "bg-status-pagamento/20 text-status-pagamento border-status-pagamento/30" },
  pago: { label: "Pago", className: "bg-status-pago/20 text-status-pago border-status-pago/30" },
  perdido: { label: "Perdido", className: "bg-status-perdido/20 text-status-perdido border-status-perdido/30" },
  novo: { label: "Novo", className: "bg-status-novo/20 text-status-novo border-status-novo/30" },
  conversa_iniciada: { label: "Conversa Iniciada", className: "bg-status-conversa/20 text-status-conversa border-status-conversa/30" },
  finalizado: { label: "Finalizado", className: "bg-green-500/20 text-green-600 border-green-500/30 dark:text-green-400" },
};

const getStatusLabel = (status: string): string => {
  const config = defaultStatusConfig[status];
  if (config) {
    return config.label;
  }
  return status.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const getStatusClassName = (status: string): string => {
  const config = defaultStatusConfig[status];
  if (config) {
    return config.className;
  }
  return "bg-muted/20 text-muted-foreground border-muted/30";
};

export const StatusBadge = ({ status, label: providedLabel, className }: { status: Status; label?: string; className?: string }) => {
  const label = providedLabel || getStatusLabel(status);
  const statusClassName = getStatusClassName(status);

  return (
    <Badge variant="outline" className={`${statusClassName} border font-medium ${className || ''}`}>
      {label}
    </Badge>
  );
};
