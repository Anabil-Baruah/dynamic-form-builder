import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { FormFieldWithClientId } from "@/types/form";

interface FieldEditorProps {
  field: FormFieldWithClientId | null;
  onUpdate: (field: FormFieldWithClientId) => void;
}

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio" },
  { value: "select", label: "Select" },
  { value: "file", label: "File Upload" },
];

export const FieldEditor = ({ field, onUpdate }: FieldEditorProps) => {
  const [localField, setLocalField] = useState<FormFieldWithClientId | null>(field);
  const [newOption, setNewOption] = useState("");

  useEffect(() => {
    setLocalField(field);
  }, [field]);

  if (!localField) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Select a field to edit its properties</p>
      </div>
    );
  }

  const handleChange = (key: keyof FormFieldWithClientId, value: unknown) => {
    const updated = { ...localField, [key]: value };
    setLocalField(updated);
    onUpdate(updated);
  };

  const handleValidationChange = (key: string, value: unknown) => {
    const current = localField?.validation || {};
    const nextValidation = { ...current, [key]: value };
    const updated = { ...localField!, validation: nextValidation } as FormFieldWithClientId;
    setLocalField(updated);
    onUpdate(updated);
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    const options = [...(localField.options || []), newOption];
    handleChange("options", options);
    setNewOption("");
  };

  const handleRemoveOption = (index: number) => {
    const options = localField.options?.filter((_, i) => i !== index);
    handleChange("options", options);
  };

  const showOptions = ["select", "radio", "checkbox"].includes(localField.type);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-4">Field Properties</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="field-label">Label</Label>
          <Input
            id="field-label"
            value={localField.label}
            onChange={(e) => handleChange("label", e.target.value)}
            placeholder="Enter field label"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="field-type">Field Type</Label>
          <Select value={localField.type} onValueChange={(value) => handleChange("type", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="field-name">Field Name (ID)</Label>
          <Input
            id="field-name"
            value={localField.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="field_name"
          />
          <p className="text-xs text-muted-foreground">Used to identify this field in submissions</p>
        </div>

        <div className="flex items-center justify-between p-3 border border-border rounded-lg">
          <div>
            <Label htmlFor="field-required">Required Field</Label>
            <p className="text-xs text-muted-foreground">User must fill this field</p>
          </div>
          <Switch
            id="field-required"
            checked={localField.required}
            onCheckedChange={(checked) => handleChange("required", checked)}
          />
        </div>

        {showOptions && (
          <div className="space-y-2">
            <Label>Options</Label>
            <div className="space-y-2">
              {localField.options?.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={option} readOnly className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveOption(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Add new option"
                  onKeyDown={(e) => e.key === "Enter" && handleAddOption()}
                />
                <Button onClick={handleAddOption} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {localField.type === "text" && (
          <Card className="p-4 bg-muted">
            <Label className="text-sm font-medium mb-3 block">Validation</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="min-length" className="text-xs">Min Length</Label>
                <Input
                  id="min-length"
                  type="number"
                  placeholder="0"
                  className="h-8"
                  value={localField.validation?.minLength ?? ""}
                  onChange={(e) =>
                    handleValidationChange(
                      "minLength",
                      e.target.value === "" ? undefined : Number(e.target.value)
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-length" className="text-xs">Max Length</Label>
                <Input
                  id="max-length"
                  type="number"
                  placeholder="100"
                  className="h-8"
                  value={localField.validation?.maxLength ?? ""}
                  onChange={(e) =>
                    handleValidationChange(
                      "maxLength",
                      e.target.value === "" ? undefined : Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>
          </Card>
        )}

        {localField.type === "number" && (
          <Card className="p-4 bg-muted">
            <Label className="text-sm font-medium mb-3 block">Validation</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="min-value" className="text-xs">Min Value</Label>
                <Input
                  id="min-value"
                  type="number"
                  placeholder="0"
                  className="h-8"
                  value={localField.validation?.min ?? ""}
                  onChange={(e) =>
                    handleValidationChange(
                      "min",
                      e.target.value === "" ? undefined : Number(e.target.value)
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-value" className="text-xs">Max Value</Label>
                <Input
                  id="max-value"
                  type="number"
                  placeholder="100"
                  className="h-8"
                  value={localField.validation?.max ?? ""}
                  onChange={(e) =>
                    handleValidationChange(
                      "max",
                      e.target.value === "" ? undefined : Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>
          </Card>
        )}

        {localField.type === "date" && (
          <Card className="p-4 bg-muted">
            <Label className="text-sm font-medium mb-3 block">Validation</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="min-date" className="text-xs">Minimum Date</Label>
                <Input
                  id="min-date"
                  type="date"
                  className="h-8"
                  value={localField.validation?.minDate ?? ""}
                  onChange={(e) => handleValidationChange("minDate", e.target.value || undefined)}
                />
              </div>
            </div>
          </Card>
        )}

        {(localField.type === "radio" || localField.type === "select") && (
          <Card className="p-4 bg-secondary border-accent">
            <Label className="text-sm font-medium mb-2 block">Conditional Logic</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Show additional fields based on the selected option
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Conditional Fields
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};
