import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentScriptRepository, IAgentScript } from "@/services/agents/AgentScriptRepository";
import { Loader2 } from "lucide-react";

interface AgentScriptSelectorProps {
  organizationId: string;
  value: string | null;
  onChange: (scriptId: string | null) => void;
}

export const AgentScriptSelector = ({
  organizationId,
  value,
  onChange,
}: AgentScriptSelectorProps) => {
  const [scripts, setScripts] = useState<IAgentScript[]>([]);
  const [loading, setLoading] = useState(false);
  const repository = new AgentScriptRepository();

  useEffect(() => {
    if (!organizationId) return;

    const loadScripts = async () => {
      setLoading(true);
      try {
        const data = await repository.findAll(organizationId);
        setScripts(data);
      } catch (error) {
        console.error("Erro ao carregar roteiros:", error);
      } finally {
        setLoading(false);
      }
    };

    loadScripts();
  }, [organizationId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Carregando roteiros...</span>
      </div>
    );
  }

  return (
    <Select
      value={value || ""}
      onValueChange={(val) => onChange(val === "" ? null : val)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Selecione um roteiro ou deixe em branco" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Nenhum roteiro</SelectItem>
        {scripts.map((script) => (
          <SelectItem key={script.id} value={script.id}>
            {script.name}
            {script.description && (
              <span className="text-muted-foreground ml-2">
                - {script.description}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
