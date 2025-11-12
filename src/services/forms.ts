import { apiFetch } from "@/lib/api-client";
import type {
  Form,
  FormPayload,
  FormField,
  PaginatedResult,
  FormStatus,
} from "@/types/form";

interface FormsApiListResponse
  extends PaginatedResult<Form[]> {
  success: boolean;
  message?: string;
}

interface FormApiResponse {
  success: boolean;
  data: Form;
  message?: string;
}

interface CreateFormApiResponse {
  success: boolean;
  data: Form;
}

interface UpdateFormApiResponse {
  success: boolean;
  data: Form;
}

export interface FetchFormsParams {
  status?: string;
  page?: number;
  limit?: number;
}

export const fetchForms = async (
  params: FetchFormsParams = {},
): Promise<{ forms: Form[]; pagination: PaginatedResult<Form[]>["pagination"] }> => {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const query = searchParams.toString();
  const response = await apiFetch<FormsApiListResponse>(
    `/api/forms${query ? `?${query}` : ""}`,
    { admin: true },
  );

  return {
    forms: response.data,
    pagination: response.pagination,
  };
};

export const fetchPublicForms = async (
  params: Pick<FetchFormsParams, "page" | "limit"> = {},
): Promise<{ forms: Form[]; pagination: PaginatedResult<Form[]>["pagination"] }> => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const query = searchParams.toString();
  const response = await apiFetch<FormsApiListResponse>(
    `/api/forms/public${query ? `?${query}` : ""}`,
  );

  return {
    forms: response.data,
    pagination: response.pagination,
  };
};

export const fetchForm = async (formId: string): Promise<Form> => {
  const response = await apiFetch<FormApiResponse>(`/api/forms/${formId}`);
  return response.data;
};

export const createForm = async (payload: FormPayload): Promise<Form> => {
  const response = await apiFetch<CreateFormApiResponse>("/api/forms", {
    method: "POST",
    body: payload,
    admin: true,
  });
  return response.data;
};

export const updateForm = async (
  formId: string,
  payload: FormPayload,
): Promise<Form> => {
  const response = await apiFetch<UpdateFormApiResponse>(`/api/forms/${formId}`, {
    method: "PUT",
    body: payload,
    admin: true,
  });
  return response.data;
};

export const updateFormStatus = async (
  formId: string,
  status: FormStatus,
): Promise<Form> => {
  const response = await apiFetch<UpdateFormApiResponse>(`/api/forms/${formId}`, {
    method: "PUT",
    body: { status },
    admin: true,
  });
  return response.data;
};

export const deleteForm = async (formId: string): Promise<void> => {
  await apiFetch(`/api/forms/${formId}`, {
    method: "DELETE",
    admin: true,
  });
};

export const addFormField = async (formId: string, field: FormField) => {
  const response = await apiFetch<FormApiResponse>(`/api/forms/${formId}/fields`, {
    method: "POST",
    body: field,
    admin: true,
  });
  return response.data;
};

export const reorderFormFields = async (
  formId: string,
  fieldOrders: Record<string, number>
): Promise<Form> => {
  const response = await apiFetch<FormApiResponse>(`/api/forms/${formId}/reorder`, {
    method: "PUT",
    body: { fieldOrders },
    admin: true,
  });
  return response.data;
};
