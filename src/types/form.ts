export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "date"
  | "checkbox"
  | "radio"
  | "select"
  | "file";

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customMessage?: string;
}

export interface FormField {
  _id?: string;
  label: string;
  type: FormFieldType;
  name: string;
  required: boolean;
  options?: string[];
  validation?: FieldValidation;
  order: number;
  conditionalFields?: FormField[];
  showWhen?: {
    parentFieldName: string;
    parentFieldValue: string;
  };
}

export type FormFieldWithClientId = FormField & { id: string };

export type FormStatus = "draft" | "active" | "archived";

export interface FormSettings {
  submitButtonText?: string;
  successMessage?: string;
  allowMultipleSubmissions?: boolean;
}

export interface Form {
  _id: string;
  title: string;
  description?: string;
  fields: FormField[];
  status: FormStatus;
  version: number;
  settings?: FormSettings;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  data: T;
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export interface FormPayload {
  title: string;
  description?: string;
  fields: FormField[];
  status?: FormStatus;
  settings?: FormSettings;
}

