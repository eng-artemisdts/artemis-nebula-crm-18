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
import { GripVertical, X, User, CheckCircle2, Search, Sparkles, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  contact_whatsapp: string | null;
  remote_jid: string | null;
  whatsapp_verified: boolean;
}

interface LeadsDragDropProps {
  leads: Lead[];
  selectedLeadIds: string[];
  onSelectionChange: (leadIds: string[]) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
}

const SortableLead = ({
  lead,
  isSelected,
  onToggle,
}: {
  lead: Lead;
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
  } = useSortable({ id: lead.id });

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
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{lead.name}</p>
            {lead.contact_whatsapp && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {formatPhoneDisplay(lead.contact_whatsapp)}
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

export const LeadsDragDrop = ({
  leads,
  selectedLeadIds,
  onSelectionChange,
  filter,
  onFilterChange,
}: LeadsDragDropProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string[]>(selectedLeadIds);

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

  const filteredLeads = leads.filter((lead) =>
    lead.name.toLowerCase().includes(filter.toLowerCase()) ||
    (lead.contact_whatsapp && formatPhoneDisplay(lead.contact_whatsapp).includes(filter))
  );

  const selectedLeadsData = selectedOrder
    .map((id) => leads.find((l) => l.id === id))
    .filter((l): l is Lead => l !== undefined);

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

  const handleToggle = (leadId: string) => {
    if (selectedLeadIds.includes(leadId)) {
      const newSelection = selectedLeadIds.filter((id) => id !== leadId);
      setSelectedOrder(newSelection);
      onSelectionChange(newSelection);
    } else {
      const newSelection = [...selectedLeadIds, leadId];
      setSelectedOrder(newSelection);
      onSelectionChange(newSelection);
    }
  };

  const handleSelectAll = () => {
    const allIds = filteredLeads.map((lead) => lead.id);
    setSelectedOrder(allIds);
    onSelectionChange(allIds);
  };

  const handleClearSelection = () => {
    setSelectedOrder([]);
    onSelectionChange([]);
  };

  const activeLead = activeId
    ? leads.find((l) => l.id === activeId)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Leads</h3>
        </div>
        {selectedLeadIds.length > 0 && (
          <Badge variant="secondary" className="gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {selectedLeadIds.length} selecionado{selectedLeadIds.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {selectedLeadIds.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Arraste para reordenar os leads selecionados:</span>
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
                {selectedLeadsData.map((lead) => (
                  <SortableLead
                    key={lead.id}
                    lead={lead}
                    isSelected={true}
                    onToggle={() => handleToggle(lead.id)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeLead ? (
                <Card className="opacity-90 shadow-lg">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{activeLead.name}</p>
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
            placeholder="Buscar leads..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={filteredLeads.length === 0}
            className="flex-1"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Selecionar Todos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSelection}
            disabled={selectedLeadIds.length === 0}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {filteredLeads.map((lead) => {
            const isSelected = selectedLeadIds.includes(lead.id);
            return (
              <Card
                key={lead.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-sm",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:border-accent"
                )}
                onClick={() => handleToggle(lead.id)}
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
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{lead.name}</p>
                      {lead.contact_whatsapp && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {formatPhoneDisplay(lead.contact_whatsapp)}
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
          {filteredLeads.length === 0 && filter && (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Nenhum lead encontrado com "{filter}"
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

