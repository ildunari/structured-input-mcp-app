import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load the bundled single-file HTML app.
 * Vite builds this from src/mcp-app.html → dist/mcp-app.html
 */
function loadAppHtml(): string {
  const htmlPath = resolve(__dirname, "mcp-app.html");
  return readFileSync(htmlPath, "utf-8");
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "structured-input",
    version: "0.1.0",
  });

  // ---- Resource: the bundled HTML app ----
  server.resource(
    "structured-input-ui",
    "ui://structured-input/app",
    {
      description: "Interactive structured input form UI",
      mimeType: "text/html;profile=mcp-app",
    },
    async () => ({
      contents: [
        {
          uri: "ui://structured-input/app",
          mimeType: "text/html;profile=mcp-app",
          text: loadAppHtml(),
        },
      ],
    })
  );

  // ---- Tool: collect structured input ----
  server.tool(
    "collect_structured_input",
    "Display an interactive form to collect structured input from the user. " +
      "Define the fields you need via the schema parameter. " +
      "Supports: text, longtext, number, slider, range, single-select, multi-select, " +
      "checklist, ranked, rating, color, date, date-range, boolean, confirm.",
    {
      schema: z
        .object({
          title: z.string().optional().describe("Form heading"),
          description: z
            .string()
            .optional()
            .describe("Brief context shown below the title"),
          fields: z.array(z.record(z.string(), z.unknown())).describe("Array of field definitions"),
        })
        .describe("The form schema defining what fields to render"),
    },
    async ({ schema }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(schema),
        },
      ],
      _meta: {
        ui: {
          resourceUri: "ui://structured-input/app",
        },
      },
    })
  );

  return server;
}
