import { apiFetch, API_BASE_URL } from "@/lib/api-client";

interface SubmitFormResponse {
  success: boolean;
  message: string;
  data: {
    submissionId: string;
  };
}

export const submitForm = async (
  formId: string,
  payload: FormData,
): Promise<SubmitFormResponse> => {
  const response = await apiFetch<SubmitFormResponse>(
    `/api/submissions/${formId}/submit`,
    {
      method: "POST",
      body: payload,
    },
  );
  return response;
};

export const exportSubmissionsCsv = async (formId: string): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/api/submissions/${formId}/export`, {
    method: "GET",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to export submissions");
  }

  return response.blob();
};

interface SubmissionsListResponse<T> {
  success: boolean;
  data: T;
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export interface ListSubmissionsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
  status?: string;
}

export type SubmissionItem = {
  _id: string;
  formId: string;
  status: string;
  answers: Record<string, unknown>;
  metadata: { submittedAt: string };
  createdAt: string;
  updatedAt: string;
};

export const listSubmissions = async (
  formId: string,
  params: ListSubmissionsParams = {},
  admin: boolean = false,
): Promise<SubmissionsListResponse<SubmissionItem[]>> => {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.sortBy) search.set("sortBy", params.sortBy);
  if (params.order) search.set("order", params.order);
  if (params.status) search.set("status", params.status);
  const query = search.toString();
  const res = await apiFetch<SubmissionsListResponse<SubmissionItem[]>>(
    `/api/submissions/${formId}${query ? `?${query}` : ""}`,
    { admin },
  );
  return res;
};

export const deleteSubmission = async (formId: string, submissionId: string): Promise<void> => {
  await apiFetch(`/api/submissions/${formId}/${submissionId}`, { method: "DELETE", admin: true });
};

export const updateSubmissionStatus = async (
  formId: string,
  submissionId: string,
  status: string,
): Promise<SubmissionItem> => {
  const res = await apiFetch<{ success: boolean; data: SubmissionItem }>(
    `/api/submissions/${formId}/${submissionId}`,
    { method: "PATCH", body: { status }, admin: true },
  );
  return res.data;
};

export const getSubmissionDetail = async (formId: string, submissionId: string): Promise<SubmissionItem & { formId: { title: string } }> => {
  const res = await apiFetch<{ success: boolean; data: SubmissionItem & { formId: { title: string } } }>(
    `/api/submissions/${formId}/${submissionId}`,
    { method: "GET", admin: true },
  );
  return res.data;
};

export const updateSubmissionAnswers = async (
  formId: string,
  submissionId: string,
  answers: Record<string, unknown>,
): Promise<SubmissionItem> => {
  const res = await apiFetch<{ success: boolean; data: SubmissionItem }>(
    `/api/submissions/${formId}/${submissionId}`,
    { method: "PATCH", body: { answers }, admin: true },
  );
  return res.data;
};

