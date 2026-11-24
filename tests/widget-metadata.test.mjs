import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../dist/server.js";

test("form and image results keep the widget discoverable without descriptor metadata", async () => {
  const server = createServer("<html>Fixture</html>", {
    generateImage: async ({ prompt }) => ({
      id: "fixture", prompt, url: "https://example.test/image.png", model: "gpt-image-2",
      size: "1024x1024", quality: "low", format: "png",
    }),
  });
  const client = new Client({ name: "widget-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const uri = "ui://structured-input/app";
    const catalog = await client.listTools();
    const form = { title: "Fixture", fields: [{ id: "choice", type: "text", label: "Choice" }] };
    for (const [name, args] of [
      ["collect_structured_input", { schema: form }],
      ["generate_image", { prompt: "Fixture only" }],
    ]) {
      assert.equal(catalog.tools.find((tool) => tool.name === name)._meta.ui.resourceUri, uri);
      const result = await client.callTool({ name, arguments: args });
      assert.equal(result._meta?.ui?.resourceUri, uri);
      assert.equal(result._meta?.["openai/outputTemplate"], uri);
      assert.equal(result.content[0].type, "text");
      if (name === "collect_structured_input") assert.deepEqual(result.structuredContent, form);
      else assert.equal(result.structuredContent.kind, "image-result");
    }
    const resource = await client.readResource({ uri });
    assert.equal(resource.contents[0].mimeType, "text/html;profile=mcp-app");
  } finally {
    await client.close();
    await server.close();
  }
});
