import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Save, Loader2 } from "lucide-react";
import { FieldList } from "./FieldList";
import { FieldEditor } from "./FieldEditor";
import { toast } from "sonner";
import type { FormField, FormFieldWithClientId, FormPayload } from "@/types/form";
import { fetchForm, createForm, updateForm, reorderFormFields } from "@/services/forms";
import { ApiError } from "@/lib/api-client";

interface FormBuilderProps {
  formId: string | null;
  onBack: () => void;
}

const generateClientId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `field_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const normalizeFieldForState = (field: FormField): FormFieldWithClientId => ({
  ...field,
  id: field._id ?? generateClientId(),
  conditionalFields: field.conditionalFields?.map(normalizeFieldForState),
});

const stripClientMeta = (field: FormFieldWithClientId): FormField => {
  const { id: _clientId, conditionalFields, ...rest } = field;
  return {
    ...rest,
    conditionalFields: conditionalFields?.map(stripClientMeta),
  };
};

const reindexFields = (fieldList: FormFieldWithClientId[]) =>
  fieldList
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((field, index) => ({ ...field, order: index }));

const extractErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    if (
      error.data &&
      typeof error.data === "object" &&
      "message" in error.data &&
      typeof (error.data as Record<string, unknown>).message === "string"
    ) {
      return (error.data as { message: string }).message;
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
};

export const FormBuilder = ({ formId, onBack }: FormBuilderProps) => {
  const queryClient = useQueryClient();
  const [formTitle, setFormTitle] = useState(formId ? "" : "New Form");
  const [formDescription, setFormDescription] = useState("");
  const [fields, setFields] = useState<FormFieldWithClientId[]>([]);
  const [selectedField, setSelectedField] = useState<FormFieldWithClientId | null>(null);

  const isEditing = !!formId;

  const formQuery = useQuery({
    queryKey: ["form", formId],
    queryFn: () => fetchForm(formId as string),
    enabled: isEditing,
  });

  useEffect(() => {
    if (!isEditing) {
      setFormTitle("New Form");
      setFormDescription("");
      setFields([]);
      setSelectedField(null);
    }
  }, [isEditing]);

  // Track if we've loaded the form data initially
  const [hasLoadedForm, setHasLoadedForm] = useState(false);
  // Track if we just saved to prevent reloading after save
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    // Only load form data on initial load, not on every data change
    // This preserves local changes (like reordered fields) when switching tabs
    // Also skip if we just saved (to preserve the order we just saved)
    if (formQuery.data && !hasLoadedForm && isEditing && !justSaved) {
      setFormTitle(formQuery.data.title);
      setFormDescription(formQuery.data.description ?? "");
      const stateFields = formQuery.data.fields.map(normalizeFieldForState);
      const reindexed = reindexFields(stateFields);
      setFields(reindexed);
      setSelectedField(reindexed[0] ?? null);
      setHasLoadedForm(true);
    }
  }, [formQuery.data, hasLoadedForm, isEditing, justSaved]);

  // Reset hasLoadedForm when formId changes
  useEffect(() => {
    setHasLoadedForm(false);
    setJustSaved(false);
  }, [formId]);

  const createFormMutation = useMutation({
    mutationFn: createForm,
    onSuccess: () => {
      toast.success("Form created successfully");
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      onBack();
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const updateFormMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FormPayload }) =>
      updateForm(id, payload),
    onSuccess: () => {
      toast.success("Form updated successfully");
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      // Note: Cache update is handled in handleSaveForm to use the correct fields
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
      setJustSaved(false);
    },
  });

  const isSaving = createFormMutation.isPending || updateFormMutation.isPending;

  const handleAddField = () => {
    const newField: FormFieldWithClientId = {
      id: generateClientId(),
      label: "New Field",
      type: "text",
      name: `field_${fields.length + 1}`,
      required: false,
      order: fields.length,
      options: [],
    };
    const updatedFields = [...fields, newField];
    setFields(reindexFields(updatedFields));
    setSelectedField(newField);
  };

  const handleUpdateField = (updatedField: FormFieldWithClientId) => {
    setFields((prev) =>
      prev.map((field) =>
        field.id === updatedField.id ? { ...updatedField } : field,
      ),
    );
    setSelectedField(updatedField);
  };

  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => {
      const filtered = prev.filter((field) => field.id !== fieldId);
      return reindexFields(filtered);
    });
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  const handleReorderFields = (reorderedFields: FormFieldWithClientId[]) => {
    // Only update local state - don't save to backend yet
    // The order will be saved when user clicks "Save Form"
    setFields(reorderedFields);
  };

  const handleSaveForm = async () => {
    const trimmedTitle = formTitle.trim();
    const trimmedDescription = formDescription.trim();

    if (!trimmedTitle) {
      toast.error("Please enter a form title");
      return;
    }

    if (fields.length === 0) {
      toast.error("Please add at least one field");
      return;
    }

    // Ensure fields are properly ordered before saving
    const orderedFields = reindexFields(fields);
    
    // Update local state with reindexed fields to ensure order is correct
    setFields(orderedFields);

    const payload: FormPayload = {
      title: trimmedTitle,
      description: trimmedDescription || undefined,
      fields: orderedFields.map(stripClientMeta),
      status: "active",
    };

    try {
      if (isEditing && formId) {
        // Store orderedFields for cache update
        const fieldsToSave = orderedFields;
        
        const savedForm = await updateFormMutation.mutateAsync({ id: formId, payload });
        
        // Update cache with the fields we just saved (correct order)
        // This prevents the query from refetching and overwriting our order
        queryClient.setQueryData(["form", formId], (oldData: any) => {
          if (!oldData) return savedForm;
          const savedFields = fieldsToSave.map((f) => {
            const { id: _clientId, ...rest } = f;
            return rest;
          });
          return {
            ...savedForm,
            title: trimmedTitle,
            description: trimmedDescription || undefined,
            fields: savedFields, // Use the fields we just saved with correct order
          };
        });
        setJustSaved(true);
        
        // After saving, also update the order via reorder endpoint to ensure consistency
        // This ensures the order is properly saved even if there are any issues
        try {
          const fieldOrders: Record<string, number> = {};
          orderedFields.forEach((field, index) => {
            // Use _id if available (from backend), otherwise skip (new fields will be saved with order)
            if (field._id) {
              fieldOrders[field._id] = index;
            }
          });
          // Only call reorder if we have existing fields with _id
          if (Object.keys(fieldOrders).length > 0) {
            await reorderFormFields(formId, fieldOrders);
          }
        } catch (reorderError) {
          // Reorder is optional - the main save already includes order
          console.warn("Failed to update field order separately:", reorderError);
        }
      } else {
        await createFormMutation.mutateAsync(payload);
      }
    } catch (error) {
      // Errors are handled in mutation onError, but catch prevents unhandled rejection warnings
    }
  };

  const currentSelectedField = useMemo(() => {
    if (!selectedField) return null;
    return fields.find((field) => field.id === selectedField.id) ?? null;
  }, [fields, selectedField]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isSaving}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Forms
        </Button>
        <Button
          onClick={handleSaveForm}
          className="bg-gradient-primary"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Form
            </>
          )}
        </Button>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Form Title</Label>
            <Input
              id="title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Enter form title"
              className="text-lg font-semibold"
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Enter form description"
              rows={3}
              disabled={isSaving}
            />
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Form Fields</h3>
              <Button size="sm" onClick={handleAddField} disabled={isSaving || formQuery.isLoading}>
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            </div>

            {isEditing && formQuery.isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading form details...
              </div>
            ) : (
              <FieldList
                fields={fields}
                selectedField={currentSelectedField}
                onSelectField={setSelectedField}
                onDeleteField={handleDeleteField}
                onReorder={handleReorderFields}
              />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <FieldEditor
            field={currentSelectedField}
            onUpdate={handleUpdateField}
          />
        </Card>
      </div>
    </div>
  );
};
