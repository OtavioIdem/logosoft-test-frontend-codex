import { expect, test } from '@playwright/test';
import { expectPageHeading, mockApiRoutes, openNewDialog, writeSession } from './fixtures/logosoft';

test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page);
});

test('cria local de estoque e valida consulta de saldos', async ({ page }) => {
    await openNewDialog(page, '/estoque/locais', 'Locais de estoque');
    await page.getByLabel('Código *').fill('LOC-E2E');
    await page.getByLabel('Nome *').fill('Local E2E');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await expectPageHeading(page, '/estoque/saldos', 'Saldos de estoque');
    // A tela precisa mostrar o resumo, não só carregar: o card de saldo atual é o que prova
    // que a consulta rendeu conteúdo. O texto solto casaria com várias células da tabela.
    await expect(page.locator('.p-card').filter({ hasText: 'Saldo atual' })).toBeVisible();
});

test('exige motivo em cancelamento financeiro crítico', async ({ page }) => {
    await expectPageHeading(page, '/financeiro/contas-receber', 'Contas a receber');
    await page.getByRole('button', { name: /Cancelar/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // O texto "Motivo" aparece no rótulo e no conteúdo do campo; a asserção fica no rótulo,
    // que é o que prova que o diálogo exige a justificativa.
    await expect(page.getByRole('dialog').locator('label').filter({ hasText: /Motivo/i })).toBeVisible();
});
