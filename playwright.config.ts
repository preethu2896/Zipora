import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 90000,
  workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000', channel: process.platform === 'win32' ? 'msedge' : undefined },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: 'npm run dev', url: 'http://127.0.0.1:3000/merge-pdf/', reuseExistingServer: true, timeout: 120000 },
  reporter: 'list',
});
