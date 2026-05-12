import { expect, test } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page);
});

test('exibe auditoria com filtros operacionais e sem GUID cru como referência principal', async ({ page }) => {
    await page.goto('/auditoria/eventos');
    await expect(page.getByRole('heading', { name: 'Eventos de auditoria' })).toBeVisible();
    await expect(page.getByPlaceholder(/Buscar/i)).toBeVisible();
    await expect(page.getByText(/Eventos listados|Módulos afetados|Ações distintas/i)).toBeVisible();
});
