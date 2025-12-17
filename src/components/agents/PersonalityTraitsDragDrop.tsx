import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PersonalityTraitsDragDropProps {
  traits: string[];
  availableTraits: string[];
  onTraitsChange: (traits: string[]) => void;
  agentContext?: {
    name?: string;
    conversation_focus?: string;
    main_objective?: string;
  };
}

const SortableTrait = ({
  trait,
  onRemove,
}: {
  trait: string;
  onRemove: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: trait });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-secondary rounded-md border border-border hover:border-primary/50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <Badge variant="secondary" className="flex-1 justify-start">
        {trait}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={onRemove}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
};

export const PersonalityTraitsDragDrop = ({
  traits,
  availableTraits,
  onTraitsChange,
  agentContext,
}: PersonalityTraitsDragDropProps) => {
  const [newTrait, setNewTrait] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = traits.indexOf(active.id as string);
      const newIndex = traits.indexOf(over.id as string);
      onTraitsChange(arrayMove(traits, oldIndex, newIndex));
    }
  };

  const handleAddTrait = () => {
    if (newTrait.trim() && !traits.includes(newTrait.trim())) {
      onTraitsChange([...traits, newTrait.trim()]);
      setNewTrait("");
    }
  };

  const handleRemoveTrait = (traitToRemove: string) => {
    onTraitsChange(traits.filter((t) => t !== traitToRemove));
  };

  const handleAddFromAvailable = (trait: string) => {
    if (!traits.includes(trait)) {
      onTraitsChange([...traits, trait]);
    }
  };

  const handleGenerateTraits = async () => {
    if (!agentContext) {
      toast.error("Preencha as informações básicas do agente primeiro");
      return;
    }

    const hasRequiredInfo =
      (agentContext.conversation_focus?.trim() &&
        agentContext.conversation_focus.trim().length > 0) ||
      (agentContext.main_objective?.trim() &&
        agentContext.main_objective.trim().length > 0) ||
      (agentContext.name?.trim() && agentContext.name.trim().length > 0);

    if (!hasRequiredInfo) {
      toast.error("Preencha pelo menos o nome, foco ou objetivo do agente");
      return;
    }

    if (isGenerating) return;

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-personality-traits",
        {
          body: {
            selectedTraits: traits,
            agentContext: agentContext,
          },
        }
      );

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const generatedTraits = data.traits || [];
      const normalizedGenerated = generatedTraits.map((t: string) =>
        t.toLowerCase().trim()
      );
      const normalizedCurrent = traits.map((t: string) =>
        t.toLowerCase().trim()
      );

      const newTraits = generatedTraits.filter(
        (trait: string, index: number) =>
          !normalizedCurrent.includes(normalizedGenerated[index])
      );

      if (newTraits.length === 0) {
        toast.info("Todos os traços gerados já estão selecionados");
        return;
      }

      onTraitsChange([...traits, ...newTraits]);
      toast.success(
        `${newTraits.length} novo(s) traço(s) gerado(s) e adicionado(s)!`
      );
    } catch (error: any) {
      console.error("Error generating traits:", error);
      toast.error(
        "Erro ao gerar traços: " + (error.message || "Erro desconhecido")
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const unusedTraits = availableTraits.filter((t) => !traits.includes(t));

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={traits} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[100px] p-4 border-2 border-dashed border-muted rounded-lg">
            {traits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Arraste traços aqui ou adicione novos abaixo
              </p>
            ) : (
              traits.map((trait) => (
                <SortableTrait
                  key={trait}
                  trait={trait}
                  onRemove={() => handleRemoveTrait(trait)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex-1">
          {agentContext && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateTraits}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar Traços com IA
                </>
              )}
            </Button>
          )}
        </div>
        {agentContext && (
          <p className="text-xs text-muted-foreground">
            Baseado nas informações do agente
          </p>
        )}
      </div>

      {unusedTraits.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Traços disponíveis:</p>
          <div className="flex flex-wrap gap-2">
            {unusedTraits.map((trait) => (
              <Badge
                key={trait}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleAddFromAvailable(trait)}
              >
                + {trait}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Adicionar novo traço..."
          value={newTrait}
          onChange={(e) => setNewTrait(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddTrait();
            }
          }}
        />
        <Button type="button" onClick={handleAddTrait} variant="outline">
          Adicionar
        </Button>
      </div>
    </div>
  );
};
