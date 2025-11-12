import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, ArrowLeft, XCircle } from "lucide-react";
import { fetchForm } from "@/services/forms";
import { submitForm } from "@/services/submissions";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import type { Form, FormField } from "@/types/form";

const FormView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: form, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["form", id],
    queryFn: () => fetchForm(id!),
    enabled: !!id,
  });

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!id) return;

    const socket = getSocket();
    
    // Join the form room for real-time updates
    socket.emit("join-form", id);

    const handleStatusUpdate = (data: { formId: string; status: string; title: string }) => {
      if (data.formId === id) {
        // Refetch form data to get updated status
        refetch();
      }
    };

    const handleFormUpdate = (data: { formId: string; status: string; title: string }) => {
      if (data.formId === id) {
        // Refetch form data to get updated field order and other changes
        refetch();
      }
    };

    socket.on("form-status-updated", handleStatusUpdate);
    socket.on("form-updated", handleFormUpdate);

    return () => {
      socket.emit("leave-form", id);
      socket.off("form-status-updated", handleStatusUpdate);
      socket.off("form-updated", handleFormUpdate);
    };
  }, [id, refetch]);

  const submitMutation = useMutation({
    mutationFn: (payload: FormData) =>
      submitForm(id!, payload),
    onSuccess: (response) => {
      setSubmitted(true);
      toast.success(response.message || "Form submitted successfully!");
    },
    onError: (error: any) => {
      // Handle validation errors from backend
      if (error?.data?.errors && Array.isArray(error.data.errors)) {
        const firstError = error.data.errors[0];
        const message = typeof firstError === 'string' 
          ? firstError 
          : firstError?.message || firstError?.field 
            ? `${firstError.field}: ${firstError.message}`
            : "Validation failed";
        toast.error(message);
      } else {
        const message =
          error?.data?.message ||
          error?.message ||
          "Failed to submit form. Please try again.";
        toast.error(message);
      }
    },
  });

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleCheckboxChange = (fieldName: string, option: string, checked: boolean) => {
    setFormData((prev) => {
      const current = prev[fieldName] || [];
      if (checked) {
        return { ...prev, [fieldName]: [...current, option] };
      } else {
        return { ...prev, [fieldName]: current.filter((v: string) => v !== option) };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!form) return;

    const errors: string[] = [];
    form.fields.forEach((field) => {
      if (field.required) {
        const value = formData[field.name];
        const isEmpty =
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0);

        if (field.type === "file") {
          if (!value) {
            errors.push(`${field.label} is required`);
          }
          return;
        }

        if (isEmpty) {
          errors.push(`${field.label} is required`);
        }
      }
    });

    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    const answersPayload: Record<string, any> = {};
    const submissionPayload = new FormData();

    form.fields.forEach((field) => {
      const value = formData[field.name];

      if (field.type === "file") {
        if (value instanceof File) {
          submissionPayload.append(field.name, value);
        }
        return;
      }

      answersPayload[field.name] = value;
    });

    submissionPayload.append("answers", JSON.stringify(answersPayload));

    submitMutation.mutate(submissionPayload);
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || "";
    const isRequired = field.required;

    switch (field.type) {
      case "text":
      case "email":
        return (
          <Input
            id={field.name}
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={isRequired}
            placeholder={field.label}
            disabled={submitted}
          />
        );

      case "textarea":
        return (
          <Textarea
            id={field.name}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={isRequired}
            placeholder={field.label}
            rows={4}
            disabled={submitted}
          />
        );

      case "number":
        return (
          <Input
            id={field.name}
            type="number"
            value={value}
            onChange={(e) =>
              handleInputChange(field.name, parseFloat(e.target.value) || "")
            }
            required={isRequired}
            placeholder={field.label}
            disabled={submitted}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case "date":
        return (
          <Input
            id={field.name}
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={isRequired}
            disabled={submitted}
          />
        );

      case "select":
        return (
          <Select
            value={value}
            onValueChange={(val) => handleInputChange(field.name, val)}
            disabled={submitted}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, idx) => (
                <SelectItem key={idx} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "radio":
        return (
          <RadioGroup
            value={value}
            onValueChange={(val) => handleInputChange(field.name, val)}
            disabled={submitted}
          >
            {field.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.name}-${idx}`} />
                <Label htmlFor={`${field.name}-${idx}`} className="font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "checkbox":
        const checkboxValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.name}-${idx}`}
                  checked={checkboxValues.includes(option)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(field.name, option, checked as boolean)
                  }
                  disabled={submitted}
                />
                <Label htmlFor={`${field.name}-${idx}`} className="font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case "file":
        return (
          <div className="space-y-2">
            <Input
              id={field.name}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                handleInputChange(field.name, file ?? null);
              }}
              required={isRequired}
              disabled={submitted}
            />
            {formData[field.name] instanceof File && (
              <p className="text-sm text-muted-foreground">
                Selected: {(formData[field.name] as File).name}
              </p>
            )}
          </div>
        );

      default:
        return (
          <Input
            id={field.name}
            type="text"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={isRequired}
            placeholder={field.label}
            disabled={submitted}
          />
        );
    }
  };

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

  if (isError || !form) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <p className="text-destructive">
            {error instanceof Error
              ? error.message
              : "Form not found or failed to load"}
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  if (form.status !== "active") {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">This form is no longer accepting responses</h2>
            <p className="text-muted-foreground">
              The owner of this form is no longer accepting responses. If you believe this is a mistake, please contact the form owner.
            </p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold">Thank You!</h2>
          <p className="text-muted-foreground">
            {form.settings?.successMessage ||
              "Your submission has been received successfully."}
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  const sortedFields = [...form.fields].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gradient-subtle py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <Card className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{form.title}</h1>
            {form.description && (
              <p className="text-muted-foreground">{form.description}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {sortedFields.map((field) => (
              <div key={field._id || field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                {renderField(field)}
              </div>
            ))}

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="bg-gradient-primary flex-1"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  form.settings?.submitButtonText || "Submit"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default FormView;

