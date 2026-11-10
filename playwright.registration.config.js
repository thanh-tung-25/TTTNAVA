import { defineConfig } from '@playwright/test';
const port = process.env.REGISTRATION_UI_PORT || '3122', origin = 'http://localhost:' + port;
export default defineConfig({
  testDir: './e2e', testMatch: 'registration.spec.js', workers: 1, timeout: 30000,
  outputDir: 'test-results/registration', reporter: 'list',
  use: { baseURL: origin, headless: true, screenshot: 'only-on-failure' },
  projects: [{ name: 'desktop', use: { viewport: { width: 1440, height: 900 } } }, { name: 'mobile', use: { viewport: { width: 360, height: 820 } } }],
  webServer: { command: 'node backend/src/server.js', url: origin + '/api/v1/health', reuseExistingServer: false, env: { PORT: port, APP_ORIGIN: origin } },
});
