# Structured Input MCP App

Schema-driven form UI that renders inline in MCP host conversations (Claude, VS Code, etc.).

## Architecture

- `server/` — MCP server (TypeScript, Node.js). Registers `collect_structured_input` tool + `ui://` resource.
- `src/` — Frontend HTML app. Bundled into a single file by Vite + vite-plugin-singlefile.
- `dist/` — Build output. Contains `mcp-app.html` (bundled UI) and `main.js` (server entry).

## Build & Run

```bash
npm install
npm run build       # Build both UI and server
npm start           # Run in stdio mode (Claude Desktop / VS Code)
npm run start:http  # Run as HTTP server (port 3100)
npm run dev         # Watch mode for both UI and server
```

## Design

- Liquid glass aesthetic with warm undertone (Anthropic-inspired accents)
- All 15 v1 field types from the spec
- Responsive via container queries + aspect-ratio sizing
- Height tied to width (3:4 on mobile, 5:6 on desktop, 560px hard cap)
