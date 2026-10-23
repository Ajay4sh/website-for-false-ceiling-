import { defineConfig } from '@playwright/test';

const PORT = 3200;
const STUB_PORT = 3299;

/**
 * Runs against the production build (`npm run build` first).
 * A local webhook stub stands in for the CRM/automation endpoint so the
 * demo form is tested end to end without mocking the API route.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { browserName: 'chromium', viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    {
      command: `node tests/e2e/webhook-stub.mjs ${STUB_PORT}`,
      url: `http://127.0.0.1:${STUB_PORT}/health`,
      reuseExistingServer: false,
    },
    {
      command: `npx next start -p ${PORT} -H 127.0.0.1`,
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: false,
      env: {
        DEMO_DELIVERY: 'webhook',
        DEMO_WEBHOOK_URL: `http://127.0.0.1:${STUB_PORT}/hook`,
        DEMO_WEBHOOK_SECRET: 'test-secret',
        DEMO_RATE_LIMIT_MAX: '1000',
      },
    },
  ],
});
