import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

const APP_RESOURCE_URI = "ui://structured-input/app";

export function createServer(appHtml: string): McpServer {
  const server = new McpServer({
    name: "structured-input",
    version: "0.1.0",
  });

  // ---- UI resource: the bundled single-file HTML app ----
  registerAppResource(
    server,
    APP_RESOURCE_URI,
    APP_RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [
        {
          uri: APP_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: appHtml,
        },
      ],
    })
  );

  // ---- Tool: collect structured input (renders form inline via MCP App) ----
  registerAppTool(
    server,
    "collect_structured_input",
    {
      title: "Collect structured input",
      description:
        "Display an interactive form to collect structured input from the user. " +
        "Define the fields you need via the schema parameter. " +
        "Supports: text, longtext, number, slider, range, single-select, multi-select, " +
        "checklist, ranked, rating, color, date, date-range, boolean, confirm.",
      inputSchema: {
        schema: z
          .object({
            title: z.string().optional().describe("Form heading"),
            description: z
              .string()
              .optional()
              .describe("Brief context shown below the title"),
            fields: z
              .array(z.record(z.string(), z.unknown()))
              .describe("Array of field definitions"),
          })
          .describe("The form schema defining what fields to render"),
      },
      _meta: { ui: { resourceUri: APP_RESOURCE_URI } },
    },
    async ({ schema }) => ({
      // Model-facing content (small text summary)
      content: [
        {
          type: "text",
          text: `Displaying structured input form: "${schema.title ?? "Untitled"}" with ${schema.fields.length} field(s).`,
        },
      ],
      // View-facing data (delivered to iframe via postMessage)
      structuredContent: schema,
    })
  );

  return server;
}
