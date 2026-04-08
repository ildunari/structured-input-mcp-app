import { createMcpHandler } from "agents/mcp";
import { createServer } from "../server/server.js";

// Wrangler imports .html as text via the "Text" rule in wrangler.jsonc
import APP_HTML from "../dist/mcp-app.html";

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    // createMcpHandler requires a fresh server per request (stateless)
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          name: "structured-input",
          version: "0.1.0",
          description: "Schema-driven structured input MCP App",
          mcp: "/mcp",
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const server = createServer(APP_HTML);
    return createMcpHandler(server)(request, env, ctx);
  },
};
