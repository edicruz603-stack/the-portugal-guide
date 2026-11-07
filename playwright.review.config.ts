import { defineConfig, devices } from '@playwright/test';
// Review-only run (not part of the CI test suite): real network, full-page evidence.
const port = 4322;
export default defineConfig({
  testDir: 'tests/review',
  workers: 1,
  reporter: [['list']],
  timeout: 120_000,
  use: { baseURL: `http://localhost:${port}/the-portugal-guide/`, launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {} },
  projects: [
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: { command: `npx astro preview --port ${port} --ignore-lock`, url: `http://localhost:${port}/the-portugal-guide/index.html`, reuseExistingServer: false, timeout: 60_000 },
});
