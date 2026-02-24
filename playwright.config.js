import { defineConfig } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = path.resolve(process.env.TEST_RESULTS_DIR || '.test');
const TEST_DIR = path.resolve(`${process.env.TEST_ROOT_DIR}/e2e/gui` || './tests/e2e/gui');

export default defineConfig({
  testDir: TEST_DIR,
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  fullyParallel: true,
  outputDir: path.join(ARTIFACTS_DIR, 'results'),
  reporter: [
    ['list'],
    ['html', { 
      outputFolder: path.join(ARTIFACTS_DIR, 'report'),
      open: 'never' 
    }]
  ],
  use: {
    baseURL: `http://${process.env.SERVER_IP}:${process.env.SERVER_PORT}`,
    headless: process.env.HEADED !== 'true',
    viewport: { 
      width: 1280,
      height: 720
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    bypassCSP: true,
  },
  globalSetup: `${TEST_DIR}/global.setup.js`,
  globalTeardown: `${TEST_DIR}/global.teardown.js`,
  projects: [
    {
      name: 'Chromium',
      use: {
        browserName: 'chromium'
      }
    },
    {
      name: 'Firefox',
      use: {
        browserName: 'firefox' 
      }
    },
    {
      name: 'WebKit',
      use: {
        browserName: 'webkit' 
      }
    },
  ],
});
