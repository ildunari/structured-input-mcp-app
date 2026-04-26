import { createMcpHandler } from "agents/mcp";
import { createServer, type GenerateImageArgs } from "../server/server.js";

// Wrangler imports .html as text via the "Text" rule in wrangler.jsonc
import APP_HTML from "../dist/mcp-app.html";

interface Env {
  OPENAI_API_KEY?: string;
  CONNECTOR_SECRET?: string;
  IMAGES?: KVNamespace;
}

const DEFAULT_SIZE = "1024x1024" as const;
const DEFAULT_QUALITY = "medium" as const;
const DEFAULT_FORMAT = "png" as const;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function extensionFor(format: string): string {
  return format === "jpeg" ? "jpg" : format;
}

function contentTypeFor(format: string): string {
  if (format === "jpeg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return "image/png";
}

function originFor(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function generateImage(args: GenerateImageArgs, env: Env, request: Request) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  if (!env.IMAGES) throw new Error("IMAGES KV namespace is not configured");

  const size = args.size ?? DEFAULT_SIZE;
  const quality = args.quality ?? DEFAULT_QUALITY;
  const format = args.format ?? DEFAULT_FORMAT;

  // OpenAI Image API, verified 2026-04-25: gpt-image-2 via /v1/images/generations.
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt: args.prompt,
      size,
      quality,
      output_format: format,
      n: 1,
    }),
  });

  const payload = await response.json() as {
    data?: Array<{ b64_json?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `OpenAI image request failed with ${response.status}`);
  }

  const base64 = payload.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI did not return image data");

  const id = `${crypto.randomUUID()}.${extensionFor(format)}`;
  await env.IMAGES.put(id, base64, {
    metadata: {
      contentType: contentTypeFor(format),
      model: "gpt-image-2",
      size,
      quality,
      format,
      createdAt: new Date().toISOString(),
    },
  });

  return {
    id,
    url: `${originFor(request)}/image/${id}`,
    model: "gpt-image-2" as const,
    prompt: args.prompt,
    size,
    quality,
    format,
  };
}

async function serveImage(url: URL, env: Env): Promise<Response> {
  if (!env.IMAGES) return json({ error: "image_storage_not_configured" }, 500);

  const id = decodeURIComponent(url.pathname.slice("/image/".length));
  if (!id || id.includes("/")) return json({ error: "not_found" }, 404);

  const object = await env.IMAGES.getWithMetadata<{ contentType?: string }>(id);
  if (!object.value) return json({ error: "not_found" }, 404);

  const bytes = decodeBase64(object.value);
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);

  return new Response(body, {
    headers: {
      "content-type": object.metadata?.contentType ?? "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

function secretPath(pathname: string, secret?: string): boolean {
  return Boolean(secret && (pathname === `/mcp/${secret}` || pathname === `/mcp/${secret}/`));
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // createMcpHandler requires a fresh server per request (stateless)
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/" && request.method === "GET") {
      return json({
        name: "structured-input",
        version: "0.1.0",
        description: "Schema-driven structured input MCP App with optional GPT Image 2 generation",
        mcp: "/mcp",
        imageMcp: env.CONNECTOR_SECRET ? "/mcp/<secret>" : null,
        images: "/image/<id>",
      });
    }

    if (url.pathname.startsWith("/image/") && request.method === "GET") {
      return serveImage(url, env);
    }

    if (url.pathname.startsWith("/mcp/")) {
      if (!secretPath(url.pathname, env.CONNECTOR_SECRET)) {
        return json({ error: "unauthorized" }, 401);
      }

      const server = createServer(APP_HTML, {
        generateImage: (args) => generateImage(args, env, request),
      });
      return createMcpHandler(server, { route: url.pathname })(request, env, ctx);
    }

    const server = createServer(APP_HTML);
    return createMcpHandler(server)(request, env, ctx);
  },
};
