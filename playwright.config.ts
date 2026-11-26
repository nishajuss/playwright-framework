import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// .env.template holds the default URLs; a local .env can point the suite at another environment.
dotenv.config({ path: '.env.template', quiet: true });
dotenv.config({ path: '.env', override: true, quiet: true });

const isCI = !!process.env.CI;

// UI tests run in every browser. Accessibility scans give the same results in every
// browser, so they run in Chromium only.
const browserProject = (name: string, device: string) => ({
  name,
  testDir: './e2e/tests',
  grepInvert: name === 'chromium' ? undefined : /@a11y/,
  use: { ...devices[device] }
});

export default defineConfig({
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  // In CI each job writes a blob report; a final job merges them into one HTML report.
  reporter: isCI
    ? [['github'], ['blob']]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'https://practicesoftwaretesting.com',
    testIdAttribute: 'data-test',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'api',
      testDir: './api/tests',
      use: { baseURL: process.env.API_BASE_URL || 'https://api.practicesoftwaretesting.com' }
    },
    browserProject('chromium', 'Desktop Chrome'),
    browserProject('firefox', 'Desktop Firefox'),
    browserProject('webkit', 'Desktop Safari')
  ]
});
