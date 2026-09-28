import { expect, test } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

/**
 * v1.11.0a8b69 — Venda e Tabelas de Preço: AC-6 e AC-1
 *
 * AC-1: Com `GET /api/tabelas-preco` respondendo `{ resultado: { items, ... } }`, a tela lista as tabelas.
 * AC-6: Clicar no card "Aguardando aprovação" filtra por status 2 e grava `status=2` na querystring; voltar mantém a fila.
 *
 * Execução (receita do CLAUDE.md — um servidor só, porta 3411):
 *   npx next dev -p 3411
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3411 npx playwright test --config=playwright.isolated.config.ts tests/e2e/v1.11.0a8b69-vendas.spec.ts
 */

test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page);
});

test.describe('v1.11.0a8b69 — Tabelas de Preço e Pedidos de Venda', () => {
    test('AC-1: /tabelas-preco lista tabelas com envelope resultado', async ({ page }) => {
        await page.goto('/tabelas-preco');

        // Esperar a página carregar e a listagem renderizar
        await expect(page.getByRole('heading', { name: 'Tabelas de preço' })).toBeVisible();

        // Verificar que a tabela foi listada (o mock retorna 1 tabela: "Tabela Padrão")
        // DataTable renderiza a linha completa com nome, data e status
        const tabelaRow = page.locator('table tbody tr', { has: page.locator('text=Tabela Padrão') });
        await expect(tabelaRow).toBeVisible();

        // Verificar que o status "Ativa" está visível na linha (dentro de um Tag/badge)
        const statusTag = tabelaRow.locator('.p-tag-value').filter({ hasText: 'Ativa' });
        await expect(statusTag).toBeVisible();
    });

    test('AC-6: filtro "Aguardando aprovação" salva status=2 na querystring', async ({ page }) => {
        await page.goto('/vendas/pedidos');

        // Esperar a página carregar
        await expect(page.getByRole('heading', { name: 'Pedidos de venda' })).toBeVisible();

        // O card "Aguardando aprovação" deve estar visível e ser clicável
        // Usar getByRole para pegar especificamente o button
        const aguardandoCard = page.getByRole('button', { name: /Aguardando aprovação/ });

        await expect(aguardandoCard).toBeVisible();

        // Clicar no card
        await aguardandoCard.click();

        // Verificar que status=2 foi adicionado à querystring
        await expect(page).toHaveURL(/status=2/);

        // Verificar que a lista mostra só PV-002 (status 2) e não mostra PV-001 (status 1)
        await expect(page.getByText(/PV-002/).first()).toBeVisible();
        await expect(page.locator('table tbody tr', { hasText: 'PV-001' })).toHaveCount(0);
    });

    test('AC-6: voltar do detalhe mantém querystring com status=2', async ({ page }) => {
        // Navegar direto com status=2 na querystring
        await page.goto('/vendas/pedidos?status=2');

        // Esperar a página carregar
        await expect(page.getByRole('heading', { name: 'Pedidos de venda' })).toBeVisible();

        // Verificar que a querystring tem status=2 e a lista mostra só pedidos em status 2
        await expect(page).toHaveURL(/status=2/);
        await expect(page.getByText(/PV-002/).first()).toBeVisible();
        await expect(page.locator('table tbody tr', { hasText: 'PV-001' })).toHaveCount(0);

        // Clicar no botão "Abrir" da primeira linha da tabela
        const abrirButton = page.locator('table tbody tr').first().getByRole('button', { name: /Abrir/ });
        await expect(abrirButton).toBeVisible();
        await abrirButton.click();

        // Esperar navegação para o detalhe
        await page.waitForURL(/\/vendas\/pedidos\/[a-f0-9\-]+/);
        await expect(page.getByRole('heading', { name: /Pedido PV-/i })).toBeVisible();

        // Voltar pela navegação do usuário (botão de voltar ou goBack)
        await page.goBack();

        // Verificar que voltamos para a página de pedidos com status=2 ainda na querystring
        // e que a lista mostra só pedidos em status 2
        await expect(page).toHaveURL(/\/vendas\/pedidos.*status=2/);
        await expect(page.getByText(/PV-002/).first()).toBeVisible();
        await expect(page.locator('table tbody tr', { hasText: 'PV-001' })).toHaveCount(0);
    });
});
