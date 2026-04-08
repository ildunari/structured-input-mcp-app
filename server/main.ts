#!/usr/bin/env node
import { createServer } from "./server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function loadAppHtml(): string {
  return readFileSync(resolve(__dirname, "mcp-app.html"), "utf-8");
}

async function main() {
  const appHtml = loadAppHtml();

  if (args.includes("--stdio")) {
    // ---- stdio mode: Claude Desktop, VS Code, etc. ----
    const server = createServer(appHtml);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[structured-input] Running in stdio mode");
  } else {
    // ---- HTTP mode: remote deployment ----
    const port = parseInt(process.env.PORT || "3100", 10);
    const app = express();

    app.post("/mcp", async (req, res) => {
      const server = createServer(appHtml);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });

    app.listen(port, () => {
      console.error(`[structured-input] HTTP server on port ${port}`);
    });
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
