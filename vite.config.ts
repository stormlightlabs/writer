import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { ViteUserConfig } from "vitest/config";

const test: ViteUserConfig["test"] = {
  environment: "jsdom",
  globals: true,
  setupFiles: ["./src/test/setup.ts"],
  coverage: {
    provider: "v8",
    reporter: ["text", "json", "html"],
    exclude: ["node_modules/", "src/test/", "**/*.d.ts", "**/*.config.*", "**/dist/**"],
  },
  include: ["src/**/*.{test,spec}.{js,ts,tsx}"],
  watch: false,
};

const host = process.env.TAURI_DEV_HOST;

// TODO: aliases here and in tsconfig.json
// - $hooks
// - $state
// - $ports
// - $state
// - $utils
// - $types
// - $logger
// - $components
// - $icons
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
      "$ports": "./src/ports.ts",
      "$types": "./src/types.ts",
      "$logger": "./src/logger.ts",
      "$icons": "./src/components/icons.tsx",
    },
  },
});
