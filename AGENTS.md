# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is an MCP (Model Context Protocol) server that serves a schema-driven form UI as an MCP App. It has two parts:
- **Frontend** (`src/`): Single-file HTML app bundled by Vite + vite-plugin-singlefile → `dist/mcp-app.html`
- **Server** (`server/`): TypeScript MCP server compiled by `tsc` → `dist/main.js`

### Commands

Standard commands are documented in `CLAUDE.md`. Quick reference:
- `npm run build` — production build (vite + tsc)
- `npm run dev` — watch mode (concurrent vite + tsc watchers)
- `npm start` — run server in stdio mode (primary MCP integration mode)
- `npm run start:http` — run server on port 3100

### Lint / Type Checking

No ESLint is configured. Use TypeScript as the linter:
```bash
npx tsc --noEmit --project tsconfig.json        # frontend
npx tsc --noEmit --project tsconfig.server.json  # server
```

### Testing the MCP Server

The primary integration mode is **stdio**. Test with JSON-RPC over stdin:
```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n' | node dist/main.js --stdio 2>/dev/null
```

### Gotchas

- The HTTP mode (`npm run start:http`) has a header conflict where `res.writeHead()` is called before `StreamableHTTPServerTransport.handleRequest()`. This causes `ERR_HTTP_HEADERS_SENT` errors on requests. The stdio mode works correctly and is the primary integration path.
- No automated test suite exists — validation is done via TypeScript type checking and manual stdio interaction.
- The `dist/` directory must exist before running `npm start` or `npm run start:http`. Always run `npm run build` first.
