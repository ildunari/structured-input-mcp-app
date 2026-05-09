import { z } from "zod";

/**
 * Structured Input Form Schema Types
 *
 * These schemas define the JSON schema that Claude sends to the app.
 * The app renders the schema as interactive form fields.
 */

// ---- Field Types ----

export const fieldTypes = [
  "text",
  "longtext",
  "number",
  "slider",
  "range",
  "single-select",
  "multi-select",
  "checklist",
  "ranked",
  "rating",
  "color",
  "date",
  "date-range",
  "boolean",
  "confirm",
] as const;

const defaultFieldShape = {
  id: z.string().min(1, "Field id is required"),
  label: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
};

export const baseFieldSchema = z.object(defaultFieldShape).strict();

const optionSchema = z
  .object({
    value: z.string(),
    label: z.string(),
  })
  .strict();

const checklistItemSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    sublabel: z.string().optional(),
    preview: z.string().optional(),
    group: z.string().optional(),
  })
  .strict();

const rankedItemSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    locked: z.boolean().optional(),
  })
  .strict();

const colorRoleSchema = z
  .object({
    role: z.string(),
    label: z.string(),
    swatches: z.array(z.string()),
    allowCustom: z.boolean().optional(),
  })
  .strict();

const previewItemSchema = z
  .object({
    key: z.string(),
    value: z.string(),
  })
  .strict();

const numberDefaultSchema = z.number();
const stringArrayDefaultSchema = z.array(z.string());

export const textFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("text"),
    default: z.string().optional(),
    placeholder: z.string().optional(),
    maxLength: z.number().int().nonnegative().optional(),
    pattern: z.string().optional(),
  })
  .strict();

export const longTextFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("longtext"),
    default: z.string().optional(),
    placeholder: z.string().optional(),
    rows: z.number().int().positive().optional(),
    maxLength: z.number().int().nonnegative().optional(),
  })
  .strict();

export const numberFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("number"),
    default: numberDefaultSchema.optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),
    unit: z.string().optional(),
  })
  .strict();

export const sliderFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("slider"),
    default: numberDefaultSchema.optional(),
    min: z.number(),
    max: z.number(),
    step: z.number().positive().optional(),
    unit: z.string().optional(),
  })
  .strict();

export const rangeSliderFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("range"),
    default: z.tuple([z.number(), z.number()]).optional(),
    min: z.number(),
    max: z.number(),
    step: z.number().positive().optional(),
    unit: z.string().optional(),
  })
  .strict();

export const singleSelectFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("single-select"),
    default: z.string().optional(),
    options: z.array(optionSchema),
  })
  .strict();

export const multiSelectFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("multi-select"),
    default: stringArrayDefaultSchema.optional(),
    options: z.array(optionSchema),
  })
  .strict();

export const checklistFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("checklist"),
    default: stringArrayDefaultSchema.optional(),
    items: z.array(checklistItemSchema),
    showSelectAll: z.boolean().optional(),
  })
  .strict();

export const rankedListFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("ranked"),
    default: stringArrayDefaultSchema.optional(),
    items: z.array(rankedItemSchema),
    removable: z.boolean().optional(),
  })
  .strict();

export const ratingFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("rating"),
    default: numberDefaultSchema.optional(),
    max: z.number().int().positive().optional(), // default 5
    style: z.enum(["stars", "numeric"]).optional(),
  })
  .strict();

export const colorFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("color"),
    default: z.record(z.string(), z.string()).optional(),
    roles: z.array(colorRoleSchema),
  })
  .strict();

export const dateFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("date"),
    default: z.string().optional(),
  })
  .strict();

export const dateRangeDefaultSchema = z
  .object({
    start: z.string().optional(),
    end: z.string().optional(),
  })
  .strict();

export const dateRangeFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("date-range"),
    default: dateRangeDefaultSchema.optional(),
  })
  .strict();

export const booleanFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("boolean"),
    default: z.boolean().optional(),
  })
  .strict();

export const confirmFieldSchema = z
  .object({
    ...defaultFieldShape,
    type: z.literal("confirm"),
    title: z.string(),
    preview: z.array(previewItemSchema),
    confirmLabel: z.string().optional(),
    cancelLabel: z.string().optional(),
  })
  .strict();

export const fieldSchema = z.discriminatedUnion(
  "type",
  [
    textFieldSchema,
    longTextFieldSchema,
    numberFieldSchema,
    sliderFieldSchema,
    rangeSliderFieldSchema,
    singleSelectFieldSchema,
    multiSelectFieldSchema,
    checklistFieldSchema,
    rankedListFieldSchema,
    ratingFieldSchema,
    colorFieldSchema,
    dateFieldSchema,
    dateRangeFieldSchema,
    booleanFieldSchema,
    confirmFieldSchema,
  ],
  {
    error: `Unknown field type. Supported field types: ${fieldTypes.join(", ")}.`,
  }
);

export type BaseField = z.infer<typeof baseFieldSchema>;
export type TextField = z.infer<typeof textFieldSchema>;
export type LongTextField = z.infer<typeof longTextFieldSchema>;
export type NumberField = z.infer<typeof numberFieldSchema>;
export type SliderField = z.infer<typeof sliderFieldSchema>;
export type RangeSliderField = z.infer<typeof rangeSliderFieldSchema>;
export type SingleSelectField = z.infer<typeof singleSelectFieldSchema>;
export type MultiSelectField = z.infer<typeof multiSelectFieldSchema>;
export type ChecklistField = z.infer<typeof checklistFieldSchema>;
export type RankedListField = z.infer<typeof rankedListFieldSchema>;
export type RatingField = z.infer<typeof ratingFieldSchema>;
export type ColorField = z.infer<typeof colorFieldSchema>;
export type DateField = z.infer<typeof dateFieldSchema>;
export type DateRangeField = z.infer<typeof dateRangeFieldSchema>;
export type BooleanField = z.infer<typeof booleanFieldSchema>;
export type ConfirmField = z.infer<typeof confirmFieldSchema>;

export type Field = z.infer<typeof fieldSchema>;

// ---- Form Schema ----

export const formSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    fields: z.array(fieldSchema),
  })
  .superRefine((schema, ctx) => {
    const fieldIndexes = new Map<string, number>();

    schema.fields.forEach((field, index) => {
      const firstIndex = fieldIndexes.get(field.id);
      if (firstIndex === undefined) {
        fieldIndexes.set(field.id, index);
        return;
      }

      ctx.addIssue({
        code: "custom",
        path: ["fields", index, "id"],
        message: `Duplicate field id "${field.id}"; field ids must be unique (first used at fields.${firstIndex}.id).`,
      });
    });
  });

export type FormSchema = z.infer<typeof formSchema>;

// ---- Response ----

export interface FormResponse {
  status: "submitted" | "cancelled";
  values?: Record<string, unknown>;
}
