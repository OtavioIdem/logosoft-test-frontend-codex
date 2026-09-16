import { expect, test } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

/**
 * AC-7c, AC-7d, AC-7e: digitação de valor decimal em pt-BR
 *
 * Teste E2E com teclado real (Chromium), servidor isolado 3411, com `mockApiRoutes` (fixture).
 * Nenhuma rota simulada nova é necessária.
 */

test.describe('AC-7: campo decimal em pt-BR — digitação com teclado real', () => {
    test.beforeEach(async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page);
    });

    test('AC-7c: Valor unitário do diálogo Item da nota exibe R$ 12,50 depois de "12,50"', async ({ page }) => {
        await page.goto('/fiscal/notas/dddddddd-dddd-dddd-dddd-dddddddddddd');

        await page.getByRole('button', { name: 'Item', exact: true }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        const campo = dialog.locator('.field').filter({ hasText: 'Valor unitário' }).locator('input');
        await campo.click();
        await page.keyboard.press('Control+A');
        await campo.pressSequentially('12,50');

        await expect(campo).toHaveValue(/R\$\s*12,50/);
    });

    test('AC-7d: MoneyInput do diálogo Receber exibe R$ 12,50 depois de "12,50" e R$ 12,05 depois de "12,05"', async ({ page }) => {
        await page.goto('/financeiro/contas-receber');

        const linha = page.getByRole('row').filter({ hasText: 'CR-PV-001' });
        await linha.getByRole('button', { name: /Receber/i }).click();

        const dialog = page.getByRole('dialog', { name: 'Baixar conta a receber' });
        await expect(dialog).toBeVisible();

        const campo = dialog.locator('.field').filter({ has: page.getByText('Valor', { exact: true }) }).locator('input');

        await campo.click();
        await page.keyboard.press('Control+A');
        await campo.pressSequentially('12,50');
        await expect(campo).toHaveValue(/R\$\s*12,50/);

        await page.keyboard.press('Control+A');
        await campo.pressSequentially('12,05');
        await expect(campo).toHaveValue(/R\$\s*12,05/);
    });
});

test.describe('AC-7e: /fiscal/simulador com navegador pt-BR', () => {
    test.use({ locale: 'pt-BR' });

    test('AC-7e: Quantidade (sem locale) exibe 1,25 e Frete (moeda) exibe R$ 12,05', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FISCAL_REGRAS_CONSULTAR'] });

        await page.goto('/fiscal/simulador');

        expect(await page.evaluate(() => navigator.language)).toBe('pt-BR');

        await expect(page.getByRole('heading', { name: /Simulador de tributação/i }).first()).toBeVisible();

        const quantidade = page.locator('input[id^="quantidade-"]').first();
        await quantidade.click();
        await page.keyboard.press('Control+A');
        await quantidade.pressSequentially('1,25');
        await expect(quantidade).toHaveValue(/^1,25$/);

        const frete = page.locator('#valorFreteTotal');
        await frete.click();
        await page.keyboard.press('Control+A');
        await frete.pressSequentially('12,05');
        await expect(frete).toHaveValue(/R\$\s*12,05/);
    });
});
