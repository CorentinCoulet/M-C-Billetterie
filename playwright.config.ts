import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Global setup for polyfills */
  globalSetup: './tests/e2e/global-setup.ts',
  
  /* Run tests in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      // Ensure the Next.js dev server uses the same test env as CI so API routes work during E2E
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/billetterie_test',
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      JWT_SECRET: process.env.JWT_SECRET || 'test-secret-jwt-32-characters-long-minimum-for-security',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-jwt-32-characters-minimum',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'test-nextauth-secret-32-characters-long-for-security',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      NODE_ENV: 'test',
      NEXT_PUBLIC_E2E: '1',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_fake_key',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_fake',
      EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.test.com',
      EMAIL_PORT: process.env.EMAIL_PORT || '587',
      EMAIL_USER: process.env.EMAIL_USER || 'test@test.com',
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || 'testpassword',
      EMAIL_FROM: process.env.EMAIL_FROM || 'test@test.com',
      SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || 'AdminDemo123!',
      SEED_ORGANIZER_PASSWORD: process.env.SEED_ORGANIZER_PASSWORD || 'OrganizerDemo123!',
      SEED_USER_PASSWORD: process.env.SEED_USER_PASSWORD || 'UserDemo123!',
    }
  },
});
