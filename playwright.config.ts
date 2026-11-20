import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  use: { baseURL: process.env.BASE_URL || 'http://127.0.0.1:4173', headless: true, screenshot: 'only-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
  webServer: process.env.BASE_URL ? undefined : { command:'npm run preview -- --port 4173', url:'http://127.0.0.1:4173', reuseExistingServer: false },
});
