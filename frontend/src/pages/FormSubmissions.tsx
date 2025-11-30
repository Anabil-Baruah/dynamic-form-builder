import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Eye, Trash2, Download, Pencil } from "lucide-react";
import { listSubmissions, deleteSubmission, exportSubmissionsCsv, updateSubmissionStatus, type SubmissionItem, getSubmissionDetail, updateSubmissionAnswers } from "@/services/submissions";
import type { FormField } from "@/types/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const FormSubmissions = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSP] = useSearchParams();
  const [pageSize, setPageSize] = useState<number>(Number(searchParams.get("limit")) || 10);
  const [pageIndex, setPageIndex] = useState<number>(Number(searchParams.get("page")) || 1);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: (searchParams.get("order") || "desc") === "desc" }]);
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    setSP({ page: String(pageIndex), limit: String(pageSize), sortBy: "createdAt", order: sorting[0]?.desc ? "desc" : "asc" });
  }, [pageIndex, pageSize, sorting, setSP]);

  const query = useQuery({
    queryKey: ["form-submissions", id, pageIndex, pageSize, sorting[0]?.desc ? "desc" : "asc"],
    queryFn: () => listSubmissions(id!, { page: pageIndex, limit: pageSize, sortBy: "createdAt", order: sorting[0]?.desc ? "desc" : "asc" }),
    enabled: !!id,
    keepPreviousData: true,
  });

  const delMutation = useMutation({
    mutationFn: ({ submissionId }: { submissionId: string }) => deleteSubmission(id!, submissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-submissions", id] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ submissionId, status }: { submissionId: string; status: string }) => updateSubmissionStatus(id!, submissionId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-submissions", id] });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const blob = await exportSubmissionsCsv(id!);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "submissions.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });

  const [editing, setEditing] = useState<{ open: boolean; data?: (SubmissionItem & { formId: { title: string; fields: FormField[] } }) }>({ open: false });
  const editMutation = useMutation({
    mutationFn: async (payload: { submissionId: string; answers: Record<string, unknown> }) => updateSubmissionAnswers(id!, payload.submissionId, payload.answers),
    onSuccess: () => {
      setEditing({ open: false });
      queryClient.invalidateQueries({ queryKey: ["form-submissions", id] });
      toast.success("Submission updated");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to save";
      toast.error(message);
    }
  });

  const columns = useMemo<ColumnDef<SubmissionItem>[]>(() => [
    { accessorKey: "_id", header: "Submission ID", cell: (info) => info.getValue() as string },
    { accessorKey: "metadata.submittedAt", header: "Created Date", cell: (info) => new Date((info.row.original.metadata?.submittedAt || info.row.original.createdAt)).toLocaleString(), enableSorting: true },
    {
      id: "view",
      header: "View",
      cell: ({ row }) => (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-2" />View</Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[420px]">
            <div className="space-y-4 p-2">
              <h3 className="font-semibold">Submission {row.original._id}</h3>
              <div className="space-y-2">
                {Object.entries(row.original.answers || {}).map(([k, v]) => (
                  <div key={k} className="text-sm">
                    <div className="font-medium">{k}</div>
                    <div className="text-muted-foreground break-words">{Array.isArray(v) ? v.join(", ") : typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "")}</div>
                  </div>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={async () => {
            try {
              const full = await getSubmissionDetail(id!, row.original._id);
              setEditing({ open: true, data: full });
            } catch (err) {
              const message = err instanceof Error ? err.message : "Failed to load submission";
              toast.error(message);
            }
          }}>
            <Pencil className="w-4 h-4 mr-2" />Edit
          </Button>
          <Select value={row.original.status} onValueChange={(v) => statusMutation.mutate({ submissionId: row.original._id, status: v })}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">pending</SelectItem>
              <SelectItem value="reviewed">reviewed</SelectItem>
              <SelectItem value="archived">archived</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="destructive" size="sm" onClick={() => delMutation.mutate({ submissionId: row.original._id })}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
        </div>
      ),
    },
  ], [statusMutation, delMutation]);

  const filteredData = useMemo(() => {
    const data = query.data?.data || [];
    if (!search) return data;
    return data.filter((s) => s._id.toLowerCase().includes(search.toLowerCase()));
  }, [query.data, search]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  });

  if (query.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <p className="text-destructive">Failed to load submissions</p>
          <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        </Card>
      </div>
    );
  }

  const total = query.data?.pagination?.total || 0;
  const pages = query.data?.pagination?.pages || 1;

  return (
    <>
    <div className="min-h-screen bg-gradient-subtle py-8 px-4">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID" className="w-64" />
          </div>
          <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
        </div>

        <Card className="p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead key={h.id} onClick={h.column.getCanSort() ? () => h.column.toggleSorting() : undefined} className={h.column.getCanSort() ? "cursor-pointer" : undefined}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center">No submissions</TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Page {pageIndex} of {pages} • Total {total}</div>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPageIndex(1); }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Items per page" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setPageIndex((p) => Math.max(1, p - 1))} disabled={pageIndex === 1}>Previous</Button>
              <Button variant="outline" onClick={() => setPageIndex((p) => Math.min(pages, p + 1))} disabled={pageIndex >= pages}>Next</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
    {editing.open && (
      <Dialog open={editing.open} onOpenChange={(o) => setEditing((e) => ({ ...e, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-auto">
            {Object.entries(editing.data?.answers || {}).map(([k, v]) => {
              const fieldDef = editing.data?.formId?.fields?.find((f) => f.name === k);
              const type = fieldDef?.type;
              const displayValue = Array.isArray(v) || typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
              const isComplex = Array.isArray(v) || typeof v === "object";
              const handleChange = (raw: string) => {
                let next: unknown = raw;
                if (type === "number") {
                  next = raw === "" ? "" : Number(raw);
                } else if (isComplex) {
                  try {
                    next = raw ? JSON.parse(raw) : raw;
                  } catch (_) {
                    next = raw; // keep as string if JSON invalid; backend will reject and toast will show
                  }
                }
                setEditing((prev) => ({
                  open: true,
                  data: {
                    ...prev.data!,
                    answers: { ...prev.data!.answers, [k]: next }
                  }
                }));
              };
              return (
                <div key={k} className="space-y-1">
                  <Label className="text-sm">{k}</Label>
                  {isComplex ? (
                    <textarea
                      className="w-full border rounded-md p-2 text-sm"
                      value={displayValue}
                      onChange={(e) => handleChange(e.target.value)}
                      rows={4}
                    />
                  ) : (
                    <Input
                      type={type === "number" ? "number" : type === "date" ? "date" : "text"}
                      value={displayValue}
                      onChange={(e) => handleChange(e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing({ open: false })}>Cancel</Button>
            <Button onClick={() => {
              const answers = editing.data?.answers || {};
              editMutation.mutate({ submissionId: editing.data?._id, answers });
            }} disabled={editMutation.isPending}>
              {editMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
};

export default FormSubmissions;
