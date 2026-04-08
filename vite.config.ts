import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: "src",
  build: {
    target: "esnext",
    outDir: "../dist",
    emptyOutDir: false,
    rollupOptions: {
      input: "src/mcp-app.html",
    },
  },
  plugins: [viteSingleFile()],
});
