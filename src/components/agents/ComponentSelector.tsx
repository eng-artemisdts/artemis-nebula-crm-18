import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock } from "lucide-react";
import { ComponentRepository } from "@/services/components/ComponentRepository";
import { IComponentData } from "@/services/components/ComponentDomain";
import { cn } from "@/lib/utils";

interface ComponentSelectorProps {
  selectedComponentIds: string[];
  availableComponentIds: string[];
  onSelectionChange: (componentIds: string[]) => void;
  organizationId: string | null;
}

export const ComponentSelector = ({
  selectedComponentIds,
  availableComponentIds,
  onSelectionChange,
  organizationId,
}: ComponentSelectorProps) => {
  const [components, setComponents] = useState<IComponentData[]>([]);
  const [loading, setLoading] = useState(true);
  const repository = new ComponentRepository();

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    try {
      setLoading(true);
      const allComponents = await repository.findAll();
      setComponents(allComponents);
    } catch (error) {
      console.error("Erro ao carregar componentes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (componentId: string) => {
    if (!availableComponentIds.includes(componentId)) {
      return;
    }

    const newSelection = selectedComponentIds.includes(componentId)
      ? selectedComponentIds.filter((id) => id !== componentId)
      : [...selectedComponentIds, componentId];

    onSelectionChange(newSelection);
  };

  const isAvailable = (componentId: string) => {
    return availableComponentIds.includes(componentId);
  };

  const isSelected = (componentId: string) => {
    return selectedComponentIds.includes(componentId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {components.map((component) => {
          const available = isAvailable(component.id);
          const selected = isSelected(component.id);

          return (
            <Card
              key={component.id}
              className={cn(
                "p-4 cursor-pointer transition-all",
                available
                  ? "hover:border-primary/50 hover:bg-muted/50"
                  : "opacity-60 cursor-not-allowed",
                selected && available && "border-primary bg-primary/5"
              )}
              onClick={() => available && handleToggle(component.id)}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selected}
                  disabled={!available}
                  onCheckedChange={() => handleToggle(component.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Label
                      htmlFor={`component-${component.id}`}
                      className={cn(
                        "font-medium text-sm cursor-pointer",
                        !available && "text-muted-foreground"
                      )}
                    >
                      {component.name}
                    </Label>
                    {!available && (
                      <Badge variant="secondary" className="text-xs">
                        <Lock className="w-3 h-3 mr-1" />
                        Indisponível
                      </Badge>
                    )}
                    {selected && available && (
                      <Badge variant="default" className="text-xs">
                        Selecionado
                      </Badge>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-xs text-muted-foreground",
                      !available && "opacity-70"
                    )}
                  >
                    {component.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {components.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum componente disponível
        </div>
      )}
    </div>
  );
};












