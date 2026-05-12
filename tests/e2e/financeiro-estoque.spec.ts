import { expect, test } from '@playwright/test';
import { mockApiRoutes, openNewDialog, writeSession } from './fixtures/logosoft';

test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page);
});

test('cria local de estoque e valida consulta de saldos', async ({ page }) => {
    await openNewDialog(page, '/estoque/locais', 'Locais de estoque');
    await page.getByLabel(/Código/).fill('LOC-E2E');
    await page.getByLabel(/Nome \/ descrição/).fill('Local E2E');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(/operação concluída com sucesso|Local E2E/i)).toBeVisible();

    await page.goto('/estoque/saldos');
    await expect(page.getByRole('heading', { name: 'Saldos de estoque' })).toBeVisible();
    await expect(page.getByText(/saldo atual|saldo disponível|produto/i)).toBeVisible();
});

test('exige motivo em cancelamento financeiro crítico', async ({ page }) => {
    await page.goto('/financeiro/contas-receber');
    await expect(page.getByRole('heading', { name: 'Contas a receber' })).toBeVisible();
    await page.getByRole('button', { name: /Cancelar/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Motivo/i)).toBeVisible();
});
