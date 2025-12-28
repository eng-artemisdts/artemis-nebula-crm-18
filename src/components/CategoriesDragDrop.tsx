import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Tag, CheckCircle2, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface CategoriesDragDropProps {
  categories: Category[];
  selectedCategories: string[];
  onSelectionChange: (categories: string[]) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
}

const SortableCategory = ({
  category,
  isSelected,
  onToggle,
}: {
  category: Category;
  isSelected: boolean;
  onToggle: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected
          ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
          : "hover:border-accent"
      )}
      onClick={onToggle}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <div
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isSelected ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Tag className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{category.name}</p>
            {category.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {category.description}
              </p>
            )}
          </div>
          {isSelected && (
            <div className="flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const CategoriesDragDrop = ({
  categories,
  selectedCategories,
  onSelectionChange,
  filter,
  onFilterChange,
}: CategoriesDragDropProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string[]>(selectedCategories);

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

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(filter.toLowerCase())
  );

  const selectedCategoriesData = selectedOrder
    .map((name) => categories.find((c) => c.name === name))
    .filter((c): c is Category => c !== undefined);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = selectedOrder.indexOf(active.id as string);
      const newIndex = selectedOrder.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(selectedOrder, oldIndex, newIndex);
        setSelectedOrder(newOrder);
        onSelectionChange(newOrder);
      }
    }
  };

  const handleToggle = (categoryName: string) => {
    if (selectedCategories.includes(categoryName)) {
      const newSelection = selectedCategories.filter((c) => c !== categoryName);
      setSelectedOrder(newSelection);
      onSelectionChange(newSelection);
    } else {
      const newSelection = [...selectedCategories, categoryName];
      setSelectedOrder(newSelection);
      onSelectionChange(newSelection);
    }
  };

  const handleSelectAll = () => {
    const allNames = filteredCategories.map((cat) => cat.name);
    setSelectedOrder(allNames);
    onSelectionChange(allNames);
  };

  const handleClearSelection = () => {
    setSelectedOrder([]);
    onSelectionChange([]);
  };

  const activeCategory = activeId
    ? categories.find((c) => c.id === activeId)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Categorias</h3>
        </div>
        {selectedCategories.length > 0 && (
          <Badge variant="secondary" className="gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {selectedCategories.length} selecionada{selectedCategories.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {selectedCategories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Arraste para reordenar as categorias selecionadas:</span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedOrder}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-dashed">
                {selectedCategoriesData.map((category) => (
                  <SortableCategory
                    key={category.id}
                    category={category}
                    isSelected={true}
                    onToggle={() => handleToggle(category.name)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeCategory ? (
                <Card className="opacity-90 shadow-lg">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{activeCategory.name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Buscar categorias..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={filteredCategories.length === 0}
            className="flex-1"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Selecionar Todas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSelection}
            disabled={selectedCategories.length === 0}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {filteredCategories.map((category) => {
            const isSelected = selectedCategories.includes(category.name);
            return (
              <Card
                key={category.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-sm",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:border-accent"
                )}
                onClick={() => handleToggle(category.name)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Tag className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{category.name}</p>
                      {category.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {category.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredCategories.length === 0 && filter && (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Nenhuma categoria encontrada com "{filter}"
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

