import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 20_000,
  use: { baseURL: "http://127.0.0.1:5173", headless: true },
  webServer: [
    { command: "npm run dev -- --host 127.0.0.1", port: 5173, reuseExistingServer: true },
    { command: "npm run dev", cwd: "../server", port: 1234, reuseExistingServer: true },
  ],
});

