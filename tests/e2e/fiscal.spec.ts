import { expect, Page, test } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

const notaFiscalId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const clickAction = async (page: Page, name: string | RegExp) => {
    const button = page.getByRole('button', { name }).first();
    await expect(button).toBeEnabled();
    await button.click();
};

const submitDialog = async (page: Page, name: string | RegExp) => {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name }).click();
    await expect(dialog).toBeHidden();
};

const fiscalSummaryCard = (page: Page, label: string) =>
    page.locator('.p-card').filter({ has: page.getByText(label, { exact: true }) }).first();

test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page);
});

test('executa fluxo fiscal principal mockado até financeiro antes da validação E2E real', async ({ page }) => {
    await page.goto(`/fiscal/notas/${notaFiscalId}`);

    await expect(page.getByRole('heading', { name: /Nota fiscal 1\/900001/i })).toBeVisible();
    await expect(page.getByText('Pedido de venda com vínculo operacional')).toBeVisible();
    await expect(page.getByText('XML envio')).toBeVisible();
    await expect(page.getByText('Pendente').first()).toBeVisible();

    await clickAction(page, /^Validar$/);
    await expect(page.getByRole('button', { name: /^Gerar XML$/ }).first()).toBeEnabled();

    await clickAction(page, /^Gerar XML$/);
    await submitDialog(page, /^Gerar XML$/);
    await expect(page.getByText(/XML Envio gerado/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Assinar$/ }).first()).toBeEnabled();

    await clickAction(page, /^Assinar$/);
    await submitDialog(page, /^Assinar XML$/);
    await expect(page.getByRole('button', { name: /^Transmitir$/ }).first()).toBeEnabled();

    await clickAction(page, /^Transmitir$/);
    await submitDialog(page, /^Transmitir$/);
    await expect(page.getByText(/100 • Autorizado/i)).toBeVisible();
    const governancaFiscalCard = page.locator('.p-card').filter({ hasText: 'Governança fiscal' });
    await expect(governancaFiscalCard.getByText('Autorizada', { exact: true })).toBeVisible();

    await clickAction(page, /^Gerar DANFE$/);
    await submitDialog(page, /^Gerar DANFE$/);
    await expect(page.getByText(/danfe-1-900001\.html/i)).toBeVisible();

    await clickAction(page, /^Baixar estoque$/);
    await submitDialog(page, /^Baixar estoque$/);
    await expect(fiscalSummaryCard(page, 'Estoque').getByText('Baixado', { exact: true })).toBeVisible();

    await clickAction(page, /^Gerar financeiro$/);
    await submitDialog(page, /^Gerar financeiro$/);
    await expect(fiscalSummaryCard(page, 'Financeiro').getByText('Gerado', { exact: true })).toBeVisible();
});
