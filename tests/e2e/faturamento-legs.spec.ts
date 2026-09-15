import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

// Fixture: o faturamento abaixo tem um único leg, 5 (Baixar estoque), em estado 4 (EmReversao), e possuiLegEmReversao: true.
const faturamentoId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const rotaDetalhe = `/faturamento/${faturamentoId}`;

const isPostRetomar = (method: string, url: string) => method === 'POST' && url.includes('/retomar-reversao');

const linhaBaixarEstoque = (page: Page) => page.getByRole('row').filter({ hasText: 'Baixar estoque' });

test.describe('AC-6, AC-7 e AC-9: legs do faturamento e retomada de reversão', () => {
    test('AC-7 S1: com FATURAMENTO_CONSULTAR, Retomar fica visível e desabilitado', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FATURAMENTO_CONSULTAR'], email: 'fat-s1@logosoft.local', name: 'Faturamento S1' });

        let postsRetomar = 0;
        page.on('request', (request) => {
            if (isPostRetomar(request.method(), request.url())) postsRetomar += 1;
        });

        await page.goto(rotaDetalhe);

        const botao = linhaBaixarEstoque(page).getByRole('button', { name: 'Retomar', exact: true });
        await expect(botao).toBeVisible();
        await expect(botao).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Retomar', exact: true })).toHaveCount(1);
        expect(postsRetomar).toBe(0);
    });

    test('AC-7 e AC-9 S2: com FATURAMENTO_CONSULTAR e FATURAMENTO_RETOMAR_REVERSAO, envia leg, ação e motivo numéricos', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FATURAMENTO_CONSULTAR', 'FATURAMENTO_RETOMAR_REVERSAO'], email: 'fat-s2@logosoft.local', name: 'Faturamento S2' });

        await page.goto(rotaDetalhe);

        const botao = linhaBaixarEstoque(page).getByRole('button', { name: 'Retomar', exact: true });
        await expect(botao).toBeEnabled();
        await botao.click();

        const dialog = page.getByRole('dialog', { name: 'Retomar reversão' });
        await expect(dialog).toBeVisible();

        await dialog.locator('.p-dropdown').filter({ has: page.locator('#retomarAcao') }).click();
        await page.getByRole('option', { name: 'Reaplicar a inversa', exact: true }).click();

        const motivo = 'Inversa reaplicada pelo operador E2E';
        await dialog.getByLabel('Motivo *').fill(motivo);

        const requestPromise = page.waitForRequest((request) => isPostRetomar(request.method(), request.url()));
        await dialog.getByRole('button', { name: 'Retomar', exact: true }).click();
        const request = await requestPromise;

        const body = request.postDataJSON() as Record<string, unknown>;
        expect(body).toEqual({ leg: 5, acao: 1, motivo });
        expect(typeof body.leg).toBe('number');
        expect(typeof body.acao).toBe('number');
        expect(request.url()).toContain(`/api/faturamento/${faturamentoId}/retomar-reversao`);
    });

    test('AC-7 S3: só com FATURAMENTO_RETOMAR_REVERSAO, não mostra a tabela de legs e não envia POST', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FATURAMENTO_RETOMAR_REVERSAO'], email: 'fat-s3@logosoft.local', name: 'Faturamento S3' });

        // Registrado antes do goto: conta qualquer POST ao faturamento durante toda a navegação.
        let postsFaturamento = 0;
        page.on('request', (request) => {
            if (request.method() === 'POST' && request.url().includes('/api/faturamento')) postsFaturamento += 1;
        });

        await page.goto(rotaDetalhe);

        await expect(page.getByRole('heading', { name: 'Acesso negado' })).toBeVisible();
        await expect(page.getByText('Legs de integração')).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Retomar', exact: true })).toHaveCount(0);
        await page.waitForLoadState('networkidle');
        expect(postsFaturamento).toBe(0);
    });

    test('AC-12 S4: Confirmar desabilitado mostra o tooltip do motivo', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FATURAMENTO_CONSULTAR', 'FATURAMENTO_CONFIRMAR'], email: 'fat-s4@logosoft.local', name: 'Faturamento S4' });

        await page.goto(rotaDetalhe);

        const botao = page.getByRole('button', { name: 'Confirmar', exact: true });
        await expect(botao).toBeDisabled();

        const box = await botao.boundingBox();
        if (!box) throw new Error('Botão Confirmar sem boundingBox.');
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

        await expect(page.locator('.p-tooltip')).toContainText('Há um leg em reversão. Retome a reversão antes de confirmar o faturamento.');
    });
});
