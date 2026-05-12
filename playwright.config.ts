import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    retries: process.env.CI ? 2 : 0,
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
        trace: 'on-first-retry'
    },
    webServer: {
        command: 'npm run dev',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !process.env.CI,
        env: {
            ...process.env,
            NEXT_PUBLIC_USE_MOCK_AUTH: 'true',
            NEXT_PUBLIC_USE_MOCK_API: 'true',
            NEXT_PUBLIC_APP_ENV: 'test'
        }
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ]
});
