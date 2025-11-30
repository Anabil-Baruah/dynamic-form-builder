import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, Loader2, RefreshCw, FileText, Eye } from "lucide-react";
import { fetchPublicForms } from "@/services/forms";
import type { Form } from "@/types/form";
import { toast } from "sonner";

const PublicForms = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["public-forms"],
    queryFn: () => fetchPublicForms({ limit: 50 }),
  });

  const forms: Form[] = useMemo(() => data?.forms ?? [], [data]);

  const getFormUrl = (formId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/form/${formId}`;
  };

  const handleCopyUrl = async (formId: string) => {
    const url = getFormUrl(formId);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Form URL copied to clipboard!");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleOpenForm = (formId: string) => {
    const url = getFormUrl(formId);
    window.open(url, "_blank");
  };
  const navigate = (path: string) => {
    window.location.assign(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Failed to load forms";
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto px-4 py-16">
          <Card className="p-8 text-center flex flex-col items-center gap-4">
            <p className="text-muted-foreground">{message}</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Available Forms</h1>
            <p className="text-muted-foreground text-sm">
              Browse and open forms. Copy share links without logging in.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form._id} className="p-6 hover:shadow-lg transition-all duration-200">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg text-foreground">{form.title}</h3>
                  {form.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{form.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenForm(form._id)}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/form/${form._id}/submissions`)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View Submissions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Copy share URL"
                    onClick={() => handleCopyUrl(form._id)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {forms.length === 0 && (
            <Card className="col-span-full p-12">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No public forms available yet.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicForms;


