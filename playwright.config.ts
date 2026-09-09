import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    /**
     * Esta configuração é a da suíte **mockada**: as duas specs que exigem backend real têm
     * config própria (`playwright.backend-e2e.config.ts` e `playwright.integrated-e2e.config.ts`,
     * ambas com `testMatch`). Ignorar por nome — em vez de listar spec a spec no script npm —
     * faz com que uma spec mockada nova entre no gate sozinha, em vez de nunca rodar.
     */
    testIgnore: [/fiscal-backend\.spec\.ts/, /integrated-backend\.spec\.ts/],
    timeout: 30_000,
    retries: process.env.CI ? 2 : 0,
    /**
     * Serial no CI: o `webServer` abaixo sobe o servidor de desenvolvimento, que compila rota
     * sob demanda. Com workers concorrentes, várias rotas compilam ao mesmo tempo e o primeiro
     * acesso estoura o timeout da asserção — falha intermitente que não é defeito do teste.
     */
    workers: process.env.CI ? 1 : undefined,
    /**
     * Pelo mesmo motivo, o primeiro acesso a uma rota pode passar dos 5s padrão enquanto o Next
     * a compila. O limite sobe uma vez aqui, e não asserção a asserção: timeout espalhado pelas
     * specs vira ruído e acaba escondendo lentidão que seja mesmo do produto.
     */
    expect: { timeout: 10_000 },
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
