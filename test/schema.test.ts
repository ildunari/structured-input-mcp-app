import { describe, expect, it } from "vitest";
import { formSchema } from "../server/schema.js";

const validSchema = {
  title: "Configure Your Project",
  description: "Set up parameters for your project.",
  fields: [
    { id: "name", type: "text", label: "Project Name", required: true, placeholder: "e.g. My Cool Project", default: "Demo" },
    { id: "desc", type: "longtext", label: "Description", rows: 4, maxLength: 400, default: "A short summary" },
    { id: "iterations", type: "number", label: "Max Iterations", default: 10, min: 1, max: 100, step: 1, unit: "iterations" },
    { id: "temperature", type: "slider", label: "Temperature", min: 0, max: 2, step: 0.1, default: 0.7 },
    { id: "tokens", type: "range", label: "Token Range", min: 0, max: 4096, step: 64, default: [512, 2560] },
    {
      id: "model",
      type: "single-select",
      label: "Model",
      options: [{ value: "sonnet", label: "Sonnet" }],
      default: "sonnet",
    },
    {
      id: "caps",
      type: "multi-select",
      label: "Capabilities",
      options: [{ value: "code", label: "Code" }],
      default: ["code"],
    },
    {
      id: "files",
      type: "checklist",
      label: "Files to Include",
      showSelectAll: true,
      items: [{ id: "main", label: "main.ts", preview: "2.4 KB", group: "Source Files" }],
      default: ["main"],
    },
    {
      id: "priority",
      type: "ranked",
      label: "Priority Order",
      removable: true,
      items: [{ id: "perf", label: "Performance", locked: false }],
      default: ["perf"],
    },
    { id: "importance", type: "rating", label: "Importance", max: 5, style: "stars", default: 3 },
    {
      id: "colors",
      type: "color",
      label: "Theme Colors",
      roles: [{ role: "primary", label: "Primary", swatches: ["#c96442"], allowCustom: true }],
      default: { primary: "#c96442" },
    },
    { id: "startDate", type: "date", label: "Start Date", default: "2026-04-07" },
    { id: "period", type: "date-range", label: "Active Period", default: { start: "2026-04-07", end: "2026-05-07" } },
    { id: "streaming", type: "boolean", label: "Enable streaming", default: true },
    {
      id: "deploy",
      type: "confirm",
      label: "Confirm Deployment",
      title: "Deploy to Production?",
      preview: [{ key: "Environment", value: "production" }],
      confirmLabel: "Confirm Deploy",
      cancelLabel: "Cancel",
    },
  ],
};

describe("formSchema", () => {
  it("accepts valid schemas for all supported field types", () => {
    const result = formSchema.safeParse(validSchema);

    expect(result.success).toBe(true);
  });

  it("rejects duplicate field ids with a useful path and message", () => {
    const result = formSchema.safeParse({
      fields: [
        { id: "name", type: "text", label: "First" },
        { id: "name", type: "boolean", label: "Second" },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ["fields", 1, "id"],
          message: expect.stringContaining('Duplicate field id "name"'),
        })
      );
    }
  });

  it("rejects unknown field types", () => {
    const result = formSchema.safeParse({
      fields: [{ id: "mystery", type: "unsupported", label: "Mystery" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toEqual(
        expect.objectContaining({
          path: ["fields", 0, "type"],
          message: expect.stringContaining("Unknown field type"),
        })
      );
    }
  });

  it("rejects extra properties on field definitions", () => {
    const result = formSchema.safeParse({
      fields: [{ id: "name", type: "text", label: "Name", unsupported: true }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toEqual(
        expect.objectContaining({
          path: ["fields", 0],
          message: expect.stringContaining("Unrecognized key"),
        })
      );
    }
  });

  it("rejects invalid defaults for fields with known value types", () => {
    const result = formSchema.safeParse({
      fields: [
        { id: "iterations", type: "number", label: "Max Iterations", default: "ten" },
        { id: "period", type: "date-range", label: "Active Period", default: ["2026-04-07", "2026-05-07"] },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["fields", 0, "default"] }),
          expect.objectContaining({ path: ["fields", 1, "default"] }),
        ])
      );
    }
  });
});
