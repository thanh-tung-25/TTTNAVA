import { defineConfig, devices } from '@playwright/test';
const port = process.env.E2E_PORT ?? '3000';
const localOrigin = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  globalSetup: './e2e/global-setup.js',
  globalTeardown: './e2e/global-teardown.js',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? localOrigin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      testIgnore: /mobile\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile-chromium',
      testMatch: /mobile\.spec\.js/,
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'node backend/src/server.js',
    url: `${localOrigin}/api/v1/health`,
    env: { PORT: port, APP_ORIGIN: localOrigin },
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
