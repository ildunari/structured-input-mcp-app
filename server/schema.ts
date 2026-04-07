/**
 * Structured Input Form Schema Types
 *
 * These types define the JSON schema that Claude sends to the app.
 * The app renders the schema as interactive form fields.
 */

// ---- Field Types ----

export interface BaseField {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
}

export interface TextField extends BaseField {
  type: "text";
  placeholder?: string;
  maxLength?: number;
  pattern?: "email" | "url" | string;
}

export interface LongTextField extends BaseField {
  type: "longtext";
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}

export interface NumberField extends BaseField {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface SliderField extends BaseField {
  type: "slider";
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export interface RangeSliderField extends BaseField {
  type: "range";
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export interface SingleSelectField extends BaseField {
  type: "single-select";
  options: Array<{ value: string; label: string }>;
}

export interface MultiSelectField extends BaseField {
  type: "multi-select";
  options: Array<{ value: string; label: string }>;
}

export interface ChecklistField extends BaseField {
  type: "checklist";
  items: Array<{
    id: string;
    label: string;
    sublabel?: string;
    preview?: string;
    group?: string;
  }>;
  showSelectAll?: boolean;
}

export interface RankedListField extends BaseField {
  type: "ranked";
  items: Array<{
    id: string;
    label: string;
    locked?: boolean;
  }>;
  removable?: boolean;
}

export interface RatingField extends BaseField {
  type: "rating";
  max?: number; // default 5
  style?: "stars" | "numeric";
}

export interface ColorField extends BaseField {
  type: "color";
  roles: Array<{
    role: string;
    label: string;
    swatches: string[]; // hex values
    allowCustom?: boolean;
  }>;
}

export interface DateField extends BaseField {
  type: "date";
}

export interface DateRangeField extends BaseField {
  type: "date-range";
}

export interface BooleanField extends BaseField {
  type: "boolean";
}

export interface ConfirmField extends BaseField {
  type: "confirm";
  title: string;
  preview: Array<{ key: string; value: string }>;
  confirmLabel?: string;
  cancelLabel?: string;
}

export type Field =
  | TextField
  | LongTextField
  | NumberField
  | SliderField
  | RangeSliderField
  | SingleSelectField
  | MultiSelectField
  | ChecklistField
  | RankedListField
  | RatingField
  | ColorField
  | DateField
  | DateRangeField
  | BooleanField
  | ConfirmField;

// ---- Form Schema ----

export interface FormSchema {
  title?: string;
  description?: string;
  fields: Field[];
}

// ---- Response ----

export interface FormResponse {
  status: "submitted" | "cancelled";
  values?: Record<string, unknown>;
}
