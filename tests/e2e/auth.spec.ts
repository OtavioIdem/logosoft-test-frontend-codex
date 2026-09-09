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
    // Verificar o topbar heading para evitar ambiguidade com heading do conteúdo
    await expect(page.locator('h1.layout-topbar-title-text')).toHaveText('Dashboard logosoft');
    await page.getByRole('button', { name: 'Sair da aplicação' }).click();
    // Aumentar timeout para logout também
    await expect(page).toHaveURL(/login/, { timeout: 15000 });
});

test('sessão persistida permite acesso direto ao dashboard', async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Dashboard logosoft/i })).toBeVisible();
});
