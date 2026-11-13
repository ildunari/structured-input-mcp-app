type JsonRpcMessage = {
  jsonrpc: "2.0";
  id?: string | number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
};

type StructuredSchema = {
  title?: string;
  description?: string;
  fields: Array<Record<string, unknown>>;
};

type ImageResult = {
  kind: "image-result";
  title: string;
  url: string;
  model: string;
  prompt: string;
  size: string;
  quality: string;
  format: string;
};

type HarnessSample = StructuredSchema | ImageResult;

type SampleDefinition = {
  label: string;
  description: string;
  sample: HarnessSample;
};

const frame = document.getElementById("appFrame") as HTMLIFrameElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const editor = document.getElementById("schemaEditor") as HTMLTextAreaElement;
const sampleSelect = document.getElementById("sampleSelect") as HTMLSelectElement;
const sampleButtons = document.getElementById("sampleButtons") as HTMLDivElement;
const sendCustom = document.getElementById("sendCustom") as HTMLButtonElement;
const reloadFrame = document.getElementById("reloadFrame") as HTMLButtonElement;
const themeToggle = document.getElementById("themeToggle") as HTMLInputElement;

let appReady = false;
let pendingSample: HarnessSample | null = null;
let currentTheme: "light" | "dark" = "light";
let currentSampleName = "dense";

const FIELD_SAMPLES: Record<string, Record<string, unknown>> = {
  text: { id: "project", type: "text", label: "Project name", required: true, placeholder: "Agent dashboard", default: "Structured input explorer" },
  longtext: { id: "brief", type: "longtext", label: "Brief", rows: 4, placeholder: "What should happen?" },
  number: { id: "budget", type: "number", label: "Budget", min: 0, max: 100000, step: 500, unit: "USD", default: 12500 },
  slider: { id: "confidence", type: "slider", label: "Confidence", min: 0, max: 100, step: 1, default: 62 },
  range: { id: "timeline", type: "range", label: "Timeline", min: 1, max: 12, step: 1, default: [3, 8] },
  "single-select": {
    id: "vibe",
    type: "single-select",
    label: "Target vibe",
    options: [
      { value: "minimal", label: "Minimal" },
      { value: "glass", label: "Liquid glass" },
      { value: "dense", label: "Dense utility" },
      { value: "playful", label: "Playful" },
    ],
    default: "glass",
  },
  "multi-select": {
    id: "stack",
    type: "multi-select",
    label: "Primary stack",
    options: [
      { value: "workers", label: "Workers" },
      { value: "react", label: "React" },
      { value: "mcp", label: "MCP" },
      { value: "kv", label: "KV" },
      { value: "d1", label: "D1" },
    ],
    default: ["workers", "mcp"],
  },
  checklist: {
    id: "files",
    type: "checklist",
    label: "Files to include",
    showSelectAll: true,
    items: [
      { id: "main", label: "src/mcp-app.ts", preview: "18 KB", group: "Source" },
      { id: "style", label: "src/mcp-app.html", preview: "22 KB", group: "Source" },
      { id: "server", label: "server/main.ts", preview: "9 KB", group: "Server" },
      { id: "readme", label: "README.md", preview: "3 KB", group: "Docs" },
    ],
    default: ["main", "style"],
  },
  ranked: {
    id: "priority",
    type: "ranked",
    label: "Priorities",
    removable: true,
    items: [
      { id: "safety", label: "Safety", locked: true },
      { id: "latency", label: "Latency" },
      { id: "polish", label: "Visual polish" },
      { id: "cost", label: "Cost control" },
    ],
  },
  rating: { id: "importance", type: "rating", label: "Importance", max: 5, default: 4 },
  color: {
    id: "colors",
    type: "color",
    label: "Theme colors",
    roles: [
      { role: "primary", label: "Primary", swatches: ["#c96442", "#3898ec", "#27ae60", "#7c3aed", "#f59e0b"], allowCustom: true },
      { role: "surface", label: "Surface", swatches: ["#f5f4ed", "#ffffff", "#211f1c", "#1e293b"], allowCustom: true },
    ],
  },
  date: { id: "startDate", type: "date", label: "Start date", default: "2026-05-09" },
  "date-range": { id: "activePeriod", type: "date-range", label: "Active period", default: { start: "2026-05-09", end: "2026-06-09" } },
  boolean: { id: "streaming", type: "boolean", label: "Enable streaming updates", default: true },
  confirm: {
    id: "deploy",
    type: "confirm",
    label: "Confirm deployment",
    title: "Deploy to Production?",
    preview: [
      { key: "Environment", value: "production" },
      { key: "Model", value: "Sonnet" },
      { key: "Region", value: "us-east-1" },
      { key: "Replicas", value: "3" },
    ],
    confirmLabel: "Confirm deploy",
    cancelLabel: "Cancel",
  },
};

const imageSample: ImageResult = {
  kind: "image-result",
  title: "Generated image",
  url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1024&auto=format&fit=crop",
  model: "gpt-image-2",
  prompt: "A warm garden workspace with soft natural light.",
  size: "1024x1024",
  quality: "medium",
  format: "png",
};

const fieldOrder = [
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
];

function formSample(title: string, description: string, fieldKeys: string[]): StructuredSchema {
  return {
    title,
    description,
    fields: fieldKeys.map((key) => FIELD_SAMPLES[key]),
  };
}

const samples: Record<string, SampleDefinition> = {
  dense: {
    label: "All Elements",
    description: "Every supported field in one card.",
    sample: formSample("All controls", "A compact pass across every field.", fieldOrder),
  },
  basics: {
    label: "Basics Combo",
    description: "Text, number, slider, and boolean.",
    sample: formSample("Basics", "Fast setup fields.", ["text", "longtext", "number", "slider", "boolean"]),
  },
  choices: {
    label: "Choices Combo",
    description: "Pick, rank, and rate.",
    sample: formSample("Choices", "Selections and priorities.", ["single-select", "multi-select", "checklist", "ranked", "rating"]),
  },
  planning: {
    label: "Planning Combo",
    description: "Dates, color, and confirmation.",
    sample: formSample("Plan", "Timing and final approval.", ["range", "date", "date-range", "color", "confirm"]),
  },
  image: {
    label: "Image Result",
    description: "Generated-image result card instead of a form schema.",
    sample: imageSample,
  },
};

fieldOrder.forEach((fieldType) => {
  samples[`field:${fieldType}`] = {
    label: fieldType,
    description: `${fieldType} only.`,
    sample: formSample(`${fieldType}`, "", [fieldType]),
  };
});

function setStatus(message: string) {
  statusEl.textContent = message;
}

function postToApp(message: JsonRpcMessage) {
  frame.contentWindow?.postMessage(message, "*");
}

function respond(id: JsonRpcMessage["id"], result: unknown) {
  if (id === undefined) return;
  postToApp({ jsonrpc: "2.0", id, result });
}

function sendToolResult(structuredContent: HarnessSample | Record<string, unknown>) {
  const statusLabel =
    "title" in structuredContent && structuredContent.title
      ? structuredContent.title
      : "kind" in structuredContent && structuredContent.kind
        ? structuredContent.kind
        : "custom schema";

  postToApp({
    jsonrpc: "2.0",
    method: "ui/notifications/tool-result",
    params: {
      content: [
        {
          type: "text",
          text: "Local harness delivered a tool result.",
        },
      ],
      structuredContent,
    },
  });
  setStatus(`Sent tool result: ${statusLabel}`);
}

function loadSample(name: string) {
  const definition = samples[name];
  if (!definition) return;

  currentSampleName = name;
  sampleSelect.value = name;
  sampleButtons.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.sample === name);
  });

  const sample = definition.sample;
  editor.value = JSON.stringify(sample, null, 2);

  if (appReady) {
    sendToolResult(sample);
  } else {
    pendingSample = sample;
    setStatus("Queued sample until app initializes.");
  }
}

function buildSampleControls() {
  Object.entries(samples).forEach(([name, { label, description }]) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = label;
    sampleSelect.appendChild(option);

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.sample = name;
    button.textContent = label;
    button.title = description;
    button.addEventListener("click", () => loadSample(name));
    sampleButtons.appendChild(button);
  });
}

function hostContext(theme: "light" | "dark" = "light") {
  return {
    theme,
    displayMode: "inline",
    availableDisplayModes: ["inline", "fullscreen"],
    containerDimensions: { maxWidth: 480, maxHeight: 720 },
    locale: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userAgent: "cursor-local-mcp-app-harness",
    platform: "web",
    deviceCapabilities: { touch: false, hover: true },
  };
}

function sendHostTheme() {
  document.documentElement.dataset.theme = currentTheme;
  postToApp({
    jsonrpc: "2.0",
    method: "ui/notifications/host-context-changed",
    params: hostContext(currentTheme),
  });
}

window.addEventListener("message", (event: MessageEvent<JsonRpcMessage>) => {
  if (event.source !== frame.contentWindow) return;

  const message = event.data;
  if (!message || message.jsonrpc !== "2.0") return;

  switch (message.method) {
    case "ui/initialize":
      respond(message.id, {
        protocolVersion: "2026-01-26",
        hostInfo: { name: "Cursor Local Harness", version: "0.1.0" },
        hostCapabilities: {
          openLinks: {},
          updateModelContext: { text: {}, structuredContent: {} },
          message: { text: {}, structuredContent: {} },
          sandbox: { permissions: { clipboardWrite: {} }, csp: {} },
        },
        hostContext: hostContext(currentTheme),
      });
      appReady = true;
      setStatus("App initialized.");
      window.setTimeout(() => sendToolResult(pendingSample ?? samples[currentSampleName].sample), 50);
      break;

    case "ui/notifications/initialized":
      setStatus("App reported initialized.");
      break;

    case "ui/notifications/size-changed": {
      const params = message.params as { height?: number } | undefined;
      if (params?.height) frame.style.height = `${Math.max(180, params.height)}px`;
      break;
    }

    case "ui/update-model-context":
      respond(message.id, {});
      setStatus(`Model context update:\n${JSON.stringify(message.params, null, 2).slice(0, 600)}`);
      break;

    case "ui/open-link": {
      const params = message.params as { url?: string } | undefined;
      if (params?.url) window.open(params.url, "_blank", "noopener,noreferrer");
      respond(message.id, {});
      break;
    }

    case "ui/request-display-mode":
      respond(message.id, { mode: "inline" });
      break;

    case "ping":
      respond(message.id, {});
      break;

    default:
      if (message.id !== undefined) respond(message.id, {});
      console.debug("Unhandled app message", message);
  }
});

sampleSelect.addEventListener("change", () => {
  loadSample(sampleSelect.value);
});

sendCustom.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(editor.value) as Record<string, unknown>;
    sendToolResult(parsed);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Invalid JSON");
  }
});

reloadFrame.addEventListener("click", () => {
  appReady = false;
  pendingSample = samples[currentSampleName].sample;
  frame.style.height = "560px";
  frame.src = "./mcp-app.html";
  setStatus("Reloading app frame...");
});

themeToggle.addEventListener("change", () => {
  currentTheme = themeToggle.checked ? "dark" : "light";
  document.documentElement.dataset.theme = currentTheme;
  if (appReady) sendHostTheme();
  setStatus(`Theme switched to ${currentTheme}.`);
});

document.documentElement.dataset.theme = currentTheme;
buildSampleControls();
loadSample(currentSampleName);
