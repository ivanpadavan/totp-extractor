import { defineConfig, devices } from '@playwright/test';
const url = process.env.BASE_URL || 'http://127.0.0.1:4173/';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  use: { baseURL: url.endsWith('/') ? url : url + '/', headless: true, locale: 'ru-RU', screenshot: 'only-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
  webServer: process.env.BASE_URL ? undefined : { command:'npm run preview', env:{PORT:'4173'}, url:'http://127.0.0.1:4173', reuseExistingServer: false },
});
