import { defineConfig } from "@playwright/test";

const e2ePort = Number(process.env.E2E_PORT ?? 4310);
const e2eBaseUrl = `http://localhost:${e2ePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: e2eBaseUrl
  },
  webServer: {
    command: `npm run dev -- --hostname localhost --port ${e2ePort}`,
    env: {
      EMAIL_DELIVERY_MODE: "mock"
    },
    reuseExistingServer: false,
    timeout: 120000,
    url: e2eBaseUrl
  }
});
