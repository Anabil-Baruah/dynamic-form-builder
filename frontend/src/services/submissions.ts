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

