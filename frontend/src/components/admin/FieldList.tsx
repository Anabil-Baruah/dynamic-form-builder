import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  GripVertical,
  Trash2,
  Type,
  Mail,
  Hash,
  Calendar,
  CheckSquare,
  Circle,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import type { FormFieldWithClientId } from "@/types/form";

interface FieldListProps {
  fields: FormFieldWithClientId[];
  selectedField: FormFieldWithClientId | null;
  onSelectField: (field: FormFieldWithClientId) => void;
  onDeleteField: (fieldId: string) => void;
  onReorder: (fields: FormFieldWithClientId[]) => void;
}

const fieldIcons: Record<string, any> = {
  text: Type,
  textarea: Type,
  email: Mail,
  number: Hash,
  date: Calendar,
  checkbox: CheckSquare,
  radio: Circle,
  select: ChevronDown,
};

interface SortableFieldItemProps {
  field: FormFieldWithClientId;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const SortableFieldItem = ({
  field,
  isSelected,
  onSelect,
  onDelete,
}: SortableFieldItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = fieldIcons[field.type] || Type;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-3 cursor-pointer transition-all ${
        isSelected
          ? "border-primary shadow-md"
          : "hover:border-muted-foreground/50"
      } ${isDragging ? "ring-2 ring-primary" : ""}`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <Icon className="w-4 h-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{field.label}</p>
          <p className="text-xs text-muted-foreground">{field.type}</p>
        </div>
        {field.required && (
          <Badge variant="secondary" className="text-xs">
            Required
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </Card>
  );
};

export const FieldList = ({
  fields,
  selectedField,
  onSelectField,
  onDeleteField,
  onReorder,
}: FieldListProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over.id);

      const reorderedFields = arrayMove(fields, oldIndex, newIndex);
      
      // Update order property for each field
      const fieldsWithUpdatedOrder = reorderedFields.map((field, index) => ({
        ...field,
        order: index,
      }));

      onReorder(fieldsWithUpdatedOrder);
    }
  };

  if (fields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No fields yet. Click "Add Field" to get started.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={fields.map((f) => f.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {fields.map((field) => (
            <SortableFieldItem
              key={field.id}
              field={field}
              isSelected={selectedField?.id === field.id}
              onSelect={() => onSelectField(field)}
              onDelete={() => onDeleteField(field.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
