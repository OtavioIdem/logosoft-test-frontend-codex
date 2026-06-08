import { defineConfig, devices } from '@playwright/test';

const frontendUrl = process.env.PLAYWRIGHT_INTEGRATED_BASE_URL || process.env.PLAYWRIGHT_BACKEND_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const apiUrl = process.env.LOGOSOFT_INTEGRATED_E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const useExistingFrontend = process.env.LOGOSOFT_INTEGRATED_E2E_USE_EXISTING_FRONTEND === 'true';

export default defineConfig({
    testDir: './tests/e2e',
    testMatch: /integrated-backend\.spec\.ts/,
    timeout: 180_000,
    retries: process.env.CI ? 1 : 0,
    use: {
        baseURL: frontendUrl,
        trace: 'retain-on-failure'
    },
    ...(useExistingFrontend
        ? {}
        : {
              webServer: {
                  command: 'npm run dev',
                  url: frontendUrl,
                  reuseExistingServer: !process.env.CI,
                  env: {
                      ...process.env,
                      NEXT_PUBLIC_APP_ENV: 'test',
                      NEXT_PUBLIC_API_URL: apiUrl
                  }
              }
          }),
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ]
});
