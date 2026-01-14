import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IAgentTemplate } from "@/services/agents/AgentDomain";
import { Sparkles } from "lucide-react";

interface TemplateSelectorProps {
  templates: IAgentTemplate[];
  onSelectTemplate: (template: IAgentTemplate) => void;
}

export const TemplateSelector = ({
  templates,
  onSelectTemplate,
}: TemplateSelectorProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Escolha um Template</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Comece com uma configuração pré-definida ou crie do zero
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card
            key={template.name}
            className="p-4 hover:border-primary transition-all cursor-pointer group"
            onClick={() => onSelectTemplate(template)}
          >
            <div className="flex items-start gap-3">
              <div className="text-3xl">{template.icon}</div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{template.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
            >
              Usar Template
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};















