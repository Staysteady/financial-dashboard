import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  fullyParallel: false, // Security tests should run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Run security tests with single worker for consistency
  reporter: [
    ['html', { outputFolder: '../test-results/security-report' }],
    ['json', { outputFile: '../test-results/security-results.json' }],
    ['junit', { outputFile: '../test-results/security-junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Security testing specific settings
    ignoreHTTPSErrors: false, // Strict HTTPS validation
    bypassCSP: false, // Respect CSP for security testing
  },

  projects: [
    {
      name: 'security-audit',
      testMatch: ['penetration-tests.spec.ts', 'financial-data-audit.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'authentication-security',
      testMatch: ['auth-security.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'injection-prevention',
      testMatch: ['sql-injection.spec.ts', 'xss-protection.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'encryption-verification',
      testMatch: ['encryption-verification.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'performance-security',
      testMatch: ['../performance-tests/performance.spec.ts', '../load-tests/load-testing.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  webServer: {
    command: 'npm run dev',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // Extended timeout for security testing
  },
});