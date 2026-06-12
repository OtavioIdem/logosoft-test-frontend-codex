import { expect, test } from '@playwright/test';
import { mockApiRoutes, loginByForm, writeSession } from './fixtures/logosoft';

test('bloqueia rota interna sem autenticação', async ({ page }) => {
    await mockApiRoutes(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
});

test('login interceptado e logout', async ({ page }) => {
    await mockApiRoutes(page);
    await loginByForm(page);
    await expect(page.getByText('Dashboard logosoft')).toBeVisible();
    await page.getByRole('button', { name: 'Sair da aplicação' }).click();
    await expect(page).toHaveURL(/login/);
});

test('sessão persistida permite acesso direto ao dashboard', async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Dashboard logosoft/i })).toBeVisible();
});
