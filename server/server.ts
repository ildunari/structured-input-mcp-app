import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

const APP_RESOURCE_URI = "ui://structured-input/app";

export type GenerateImageArgs = {
  prompt: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  quality?: "low" | "medium" | "high" | "auto";
  format?: "png" | "jpeg" | "webp";
};

export type GenerateImageResult = Required<GenerateImageArgs> & {
  id: string;
  url: string;
  model: "gpt-image-2";
};

export type CreateServerOptions = {
  generateImage?: (args: GenerateImageArgs) => Promise<GenerateImageResult>;
};

export function createServer(appHtml: string, options: CreateServerOptions = {}): McpServer {
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

  if (options.generateImage) {
    registerAppTool(
      server,
      "generate_image",
      {
        title: "Generate image",
        description: "Generate an image with OpenAI GPT Image 2 and render it inline in the MCP App.",
        inputSchema: {
          prompt: z.string().min(1).max(8000).describe("Detailed image prompt."),
          size: z.enum(["1024x1024", "1024x1536", "1536x1024", "auto"]).optional().describe("Image size. Default: 1024x1024."),
          quality: z.enum(["low", "medium", "high", "auto"]).optional().describe("Generation quality. Default: medium."),
          format: z.enum(["png", "jpeg", "webp"]).optional().describe("Output image format. Default: png."),
        },
        _meta: { ui: { resourceUri: APP_RESOURCE_URI } },
      },
      async (args) => {
        const result = await options.generateImage!({
          prompt: args.prompt,
          size: args.size,
          quality: args.quality,
          format: args.format,
        });

        return {
          content: [
            {
              type: "text",
              text: `Generated image with GPT Image 2.\n\nURL: ${result.url}\nID: ${result.id}\nSize: ${result.size}\nQuality: ${result.quality}\nFormat: ${result.format}`,
            },
          ],
          structuredContent: {
            kind: "image-result",
            title: "GPT Image 2 result",
            ...result,
          },
        };
      }
    );
  }

  return server;
}
