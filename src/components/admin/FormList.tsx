import { useMemo, useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ExternalLink, Copy, Loader2, RefreshCw, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { fetchForms, deleteForm, updateFormStatus } from "@/services/forms";
import { getSocket } from "@/lib/socket";
import type { Form, FormStatus } from "@/types/form";
import { exportSubmissionsCsv } from "@/services/submissions";
import { toast } from "sonner";

interface FormListProps {
  onEditForm: (formId: string) => void;
}

const formatDate = (isoDate?: string) => {
  if (!isoDate) return "—";

  try {
    return new Date(isoDate).toLocaleDateString();
  } catch {
    return isoDate;
  }
};

export const FormList = ({ onEditForm }: FormListProps) => {
  const queryClient = useQueryClient();
  const [exportingFormId, setExportingFormId] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["forms"],
    queryFn: () => fetchForms({ limit: 30 }),
  });

  const forms: Form[] = useMemo(() => data?.forms ?? [], [data]);

  // Real-time updates via Socket.io
  useEffect(() => {
    const socket = getSocket();

    const handleFormUpdate = (data: { formId: string; status: FormStatus; title: string }) => {
      queryClient.setQueryData(["forms"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          forms: oldData.forms.map((form: Form) =>
            form._id === data.formId ? { ...form, status: data.status } : form
          ),
        };
      });
    };

    socket.on("form-updated", handleFormUpdate);

    return () => {
      socket.off("form-updated", handleFormUpdate);
    };
  }, [queryClient]);

  const statusMutation = useMutation({
    mutationFn: ({ formId, status }: { formId: string; status: FormStatus }) =>
      updateFormStatus(formId, status),
    onSuccess: (_, variables) => {
      toast.success(`Form ${variables.status === "active" ? "activated" : "deactivated"}`);
      queryClient.invalidateQueries({ queryKey: ["forms"] });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to update form status";
      toast.error(message);
    },
  });

  const handleDelete = async (formId: string, title: string) => {
    try {
      await deleteForm(formId);
      toast.success(`Deleted ${title}`);
      queryClient.invalidateQueries({ queryKey: ["forms"] });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete form";
      toast.error(message);
    }
  };

  const getFormUrl = (formId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/form/${formId}`;
  };

  const handleCopyUrl = async (formId: string) => {
    const url = getFormUrl(formId);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Form URL copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy URL");
    }
  };

  const handleOpenForm = (formId: string) => {
    const url = getFormUrl(formId);
    window.open(url, "_blank");
  };

  const handleExportCsv = async (formId: string, title: string) => {
    try {
      setExportingFormId(formId);
      const blob = await exportSubmissionsCsv(formId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeTitle = title.replace(/[^\w\d_-]+/g, "_");
      link.href = url;
      link.download = `${safeTitle || "form"}-submissions.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Export started");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to export CSV";
      toast.error(message);
    } finally {
      setExportingFormId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    const message =
      error instanceof Error ? error.message : "Failed to load forms";

    return (
      <Card className="p-8 text-center flex flex-col items-center gap-4">
        <p className="text-muted-foreground">{message}</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {forms.map((form) => (
        <Card
          key={form._id}
          className="p-6 hover:shadow-lg transition-all duration-200"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <h3 className="font-semibold text-lg text-foreground">
                  {form.title}
                </h3>
                {form.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {form.description}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="ml-2 capitalize">
                {form.status}
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center space-x-2">
                <Switch
                  id={`status-${form._id}`}
                  checked={form.status === "active"}
                  onCheckedChange={(checked) => {
                    const newStatus: FormStatus = checked ? "active" : "archived";
                    statusMutation.mutate({ formId: form._id, status: newStatus });
                  }}
                  disabled={statusMutation.isPending}
                />
                <Label
                  htmlFor={`status-${form._id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {form.status === "active" ? "Active" : "Inactive"}
                </Label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{form.fields.length} fields</span>
              <span>•</span>
              <span>Updated {formatDate(form.updatedAt)}</span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEditForm(form._id)}
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="Open form in new tab"
                onClick={() => handleOpenForm(form._id)}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="Copy share URL"
                onClick={() => handleCopyUrl(form._id)}
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="Export submissions CSV"
                onClick={() => handleExportCsv(form._id, form.title)}
                disabled={exportingFormId === form._id}
              >
                {exportingFormId === form._id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(form._id, form.title)}
                disabled={isFetching}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {forms.length === 0 && (
        <Card className="col-span-full p-12">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              No forms yet. Create your first form to get started!
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
