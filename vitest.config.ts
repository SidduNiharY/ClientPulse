import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(rootDir, "src")
    }
  },
  test: {
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/.git/**", "tests/e2e/**"],
    setupFiles: ["./tests/setup.ts"],
    globals: true
  }
});
