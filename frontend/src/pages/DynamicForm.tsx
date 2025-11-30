import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { fetchFormSchema } from "@/services/forms";
import { submitForm } from "@/services/submissions";
import { toast } from "sonner";

type SchemaFieldType =
  | "text"
  | "number"
  | "select"
  | "multi-select"
  | "date"
  | "textarea"
  | "switch";

type SchemaField = {
  _id?: string;
  label: string;
  type: SchemaFieldType;
  name: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minDate?: string;
    minSelected?: number;
    maxSelected?: number;
  };
  order?: number;
};

type FormSchema = {
  _id: string;
  title: string;
  description?: string;
  fields: SchemaField[];
  settings?: { submitButtonText?: string; successMessage?: string };
};

const DynamicForm = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: schema, isLoading, isError, error } = useQuery({
    queryKey: ["form-schema", id ?? "latest"],
    queryFn: () => fetchFormSchema(id),
  });

  type FieldValue = string | number | boolean | string[];
  const initialValues = useMemo(() => {
    const shape: Record<string, FieldValue> = {};
    schema?.fields?.forEach((f) => {
      switch (f.type) {
        case "multi-select":
          shape[f.name] = [];
          break;
        case "switch":
          shape[f.name] = false;
          break;
        default:
          shape[f.name] = "";
      }
    });
    return shape;
  }, [schema]);

  const mutation = useMutation({
    mutationFn: async (values: Record<string, FieldValue>) => {
      if (!schema?._id) throw new Error("Form schema not found");
      const formData = new FormData();
      formData.append("answers", JSON.stringify(values));
      const res = await submitForm(schema._id, formData);
      return res;
    },
    onSuccess: (res) => {
      toast.success(res.message || "Submitted");
      queryClient.invalidateQueries({ queryKey: ["submissions", schema?._id] });
      form.reset();
      navigate(`/admin/forms/${schema?._id}/submissions`);
    },
    onError: (err: unknown) => {
      const e = err as { data?: { message?: string }; message?: string };
      const message = e?.data?.message || e?.message || "Submission failed";
      toast.error(message);
    },
  });

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (isError || !schema) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <p className="text-destructive">{error instanceof Error ? error.message : "Failed to load form"}</p>
        </Card>
      </div>
    );
  }

  const ordered = [...(schema.fields || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="min-h-screen bg-gradient-subtle py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <Card className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{schema.title}</h1>
            {schema.description && <p className="text-muted-foreground">{schema.description}</p>}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-6">
            {ordered.map((field) => (
              <form.Field
                key={field.name}
                name={field.name}
                validators={{
                  onChange: ({ value }) => {
                    const v = value as FieldValue;
                    if (field.required) {
                      if (field.type === "multi-select") {
                        if (!Array.isArray(v) || v.length === 0) return "Required";
                      } else if (field.type === "switch") {
                        if (!v) return "Required";
                      } else if (v === undefined || v === null || v === "") return "Required";
                    }
                    if (field.type === "text" || field.type === "textarea") {
                      if (field.validation?.minLength && String(v).length < field.validation.minLength) return `Min ${field.validation.minLength} chars`;
                      if (field.validation?.maxLength && String(v).length > field.validation.maxLength) return `Max ${field.validation.maxLength} chars`;
                      if (field.validation?.pattern) {
                        let re: RegExp | null = null;
                        try {
                          re = new RegExp(field.validation.pattern);
                        } catch {
                          re = null;
                        }
                        if (re && !re.test(String(v))) return "Invalid format";
                      }
                    }
                    if (field.type === "number") {
                      if (v !== "" && v !== undefined) {
                        const num = Number(v);
                        if (isNaN(num)) return "Must be a number";
                        if (field.validation?.min !== undefined && num < field.validation.min) return `Min ${field.validation.min}`;
                        if (field.validation?.max !== undefined && num > field.validation.max) return `Max ${field.validation.max}`;
                      }
                    }
                    if (field.type === "date") {
                      if (field.validation?.minDate) {
                        const d = new Date(v);
                        const min = new Date(field.validation.minDate);
                        if (!isNaN(d.getTime()) && d < min) return "Date too early";
                      }
                    }
                    if (field.type === "multi-select") {
                      const len = Array.isArray(v) ? v.length : 0;
                      if (field.validation?.minSelected && len < field.validation.minSelected) return `Select at least ${field.validation.minSelected}`;
                      if (field.validation?.maxSelected && len > field.validation.maxSelected) return `Select at most ${field.validation.maxSelected}`;
                    }
                    return undefined;
                  },
                }}
                children={(fieldApi) => {
                  const value = fieldApi.state.value as FieldValue;
                  return (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {field.type === "text" && (
                        <Input
                          id={field.name}
                          value={value || ""}
                          placeholder={field.placeholder || field.label}
                          onChange={(e) => fieldApi.setValue(e.target.value)}
                        />
                      )}
                      {field.type === "number" && (
                        <Input
                          id={field.name}
                          type="number"
                          value={value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            fieldApi.setValue(val === "" ? "" : Number(val));
                          }}
                          min={field.validation?.min}
                          max={field.validation?.max}
                          placeholder={field.placeholder || field.label}
                        />
                      )}
                      {field.type === "select" && (
                        <Select value={value ?? ""} onValueChange={(val) => fieldApi.setValue(val)}>
                          <SelectTrigger>
                            <SelectValue placeholder={field.placeholder || field.label} />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options || []).map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {field.type === "multi-select" && (
                        <div className="space-y-2">
                          {(field.options || []).map((opt, idx) => {
                            const selected = Array.isArray(value) ? value.includes(opt) : false;
                            return (
                              <div key={idx} className="flex items-center gap-2">
                                <Checkbox
                                  id={`${field.name}-${idx}`}
                                  checked={selected}
                                  onCheckedChange={(checked) => {
                                    const arr = Array.isArray(value) ? [...value] : [];
                                    if (checked) {
                                      if (!arr.includes(opt)) arr.push(opt);
                                    } else {
                                      const i = arr.indexOf(opt);
                                      if (i >= 0) arr.splice(i, 1);
                                    }
                                    fieldApi.setValue(arr);
                                  }}
                                />
                                <Label htmlFor={`${field.name}-${idx}`} className="font-normal">{opt}</Label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {field.type === "date" && (
                        <Input
                          id={field.name}
                          type="date"
                          value={value || ""}
                          onChange={(e) => fieldApi.setValue(e.target.value)}
                        />
                      )}
                      {field.type === "textarea" && (
                        <Textarea
                          id={field.name}
                          value={value || ""}
                          onChange={(e) => fieldApi.setValue(e.target.value)}
                          rows={4}
                          placeholder={field.placeholder || field.label}
                        />
                      )}
                      {field.type === "switch" && (
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={!!value}
                            onCheckedChange={(checked) => fieldApi.setValue(!!checked)}
                          />
                        </div>
                      )}
                      {fieldApi.state.meta.errors[0] && (
                        <p className="text-destructive text-sm">{String(fieldApi.state.meta.errors[0])}</p>
                      )}
                    </div>
                  );
                }}
              />
            ))}

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="bg-gradient-primary flex-1" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  schema.settings?.submitButtonText || "Submit"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default DynamicForm;
