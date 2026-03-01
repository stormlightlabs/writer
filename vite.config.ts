import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import type { ViteUserConfig } from "vitest/config";

const test: ViteUserConfig["test"] = {
  environment: "jsdom",
  globals: true,
  setupFiles: ["./src/__tests__/setup.ts"],
  coverage: {
    provider: "v8",
    reporter: ["text", "json", "html"],
    exclude: ["node_modules/", "src/__tests__/", "**/*.d.ts", "**/*.config.*", "**/dist/**"],
  },
  include: ["src/**/*.{test,spec}.{js,ts,tsx}"],
  watch: false,
};

const host = process.env.TAURI_DEV_HOST;
const resolveFromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  test,
  resolve: {
    alias: {
      "$ports": resolveFromRoot("./src/ports/index.ts"),
      "$types": resolveFromRoot("./src/types.ts"),
      "$icons": resolveFromRoot("./src/components/icons.tsx"),
      "$pdf": resolveFromRoot("./src/pdf"),
      "$components": resolveFromRoot("./src/components"),
      "$editor": resolveFromRoot("./src/editor"),
      "$state": resolveFromRoot("./src/state"),
      "$hooks": resolveFromRoot("./src/hooks"),
      "$utils": resolveFromRoot("./src/utils"),
      "$constants": resolveFromRoot("./src/constants.ts"),
      "$dnd": resolveFromRoot("./src/dnd.ts"),
    },
  },
});
