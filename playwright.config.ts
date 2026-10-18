import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
// En el contenedor de Claude Code el Chromium viene preinstalado (PW_CHROMIUM_PATH);
// en CI se instala con `playwright install chromium`.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "es-PE",
    timezoneId: "America/Lima",
    trace: "retain-on-failure",
    launchOptions: { executablePath },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { executablePath } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm start --port ${PORT}`,
        env: {
          DATABASE_URL:
            process.env.DATABASE_URL ?? "postgres://oasis_app:oasis_local@localhost:5432/oasis_dev",
          OASIS_DEV_AUTH: "1",
          CRON_SECRET: "e2e-cron-secret",
          OASIS_AGENT_FAKE: "1",
          ICAL_SECRET: "e2e-ical-secret",
        },
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
