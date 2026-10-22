import { defineConfig } from "vite";
export default defineConfig({
  publicDir: "node_modules/.simurgh-explorer-public",
  build: { outDir: "node_modules/.simurgh-explorer-dist", emptyOutDir: true },
});
