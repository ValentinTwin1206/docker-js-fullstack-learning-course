import { defineConfig } from '@playwright/test';
import path from 'path';
import { lookup } from 'dns/promises';

const ARTIFACTS_DIR = path.resolve(process.env.TEST_RESULTS_DIR || '.test');
const TEST_DIR = path.resolve(`${process.env.TEST_ROOT_DIR}/e2e/gui` || './tests/e2e/gui');

const serverURL  = `${process.env.SERVER_URL}:${process.env.SERVER_PORT}`;
const hostname   = new URL(serverURL).hostname;
const port       = new URL(serverURL).port;
let baseURL = serverURL;
try {
  // Resolve the server hostname (app) to its IP address to avoid any DNS timeout 
  // error in the CICD environment.
  const { address } = await lookup(hostname);
  baseURL = `http://${address}:${port}`;
} catch {
  // Lookup failed — fall back to the original SERVER_URL (e.g. localhost)
}

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
    baseURL,
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
