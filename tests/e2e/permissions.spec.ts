import { expect, test } from '@playwright/test';
import { mockApiRoutes, CONSULTA_PERMISSIONS, writeSession } from './fixtures/logosoft';

test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page, { permissions: CONSULTA_PERMISSIONS, email: 'consulta@logosoft.local', name: 'Usuário consulta' });
});

test('protege botão de criação quando usuário possui apenas consulta', async ({ page }) => {
    await page.goto('/produtos');
    await expect(page.getByRole('heading', { name: 'Produtos' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Novo produto$/ })).toBeDisabled();
});

test('protege tela sem permissão de gerenciamento específica', async ({ page }) => {
    await page.goto('/seguranca/usuarios');
    await expect(page.getByText(/exige a permissão|acesso/i)).toBeVisible();
});
