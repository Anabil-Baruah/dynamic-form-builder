export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
}

const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  }
  return "http://localhost:5000";
};

export const API_BASE_URL = resolveBaseUrl();

export async function apiFetch<T>(
  path: string,
  {
    method = "GET",
    body,
    headers = {},
    signal,
    credentials,
  }: RequestOptions = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
  }

  // No authentication: all endpoints are public

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body:
      body === undefined || body === null
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
    signal,
    credentials,
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  const responseBody = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (isJson && responseBody?.message) ||
      response.statusText ||
      "Request failed";
    throw new ApiError(message, response.status, responseBody);
  }

  return responseBody as T;
}

