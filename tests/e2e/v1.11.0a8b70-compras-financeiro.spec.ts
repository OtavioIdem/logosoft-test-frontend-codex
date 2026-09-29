import { expect, test, type Page } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

/**
 * v1.11.0a8b70 — Compra e Financeiro: AC-3, AC-4, AC-6 e AC-8 na tela real.
 *
 * Os textos esperados estão copiados literalmente da produção de propósito: importar a constante
 * de `comprasUiUtils.ts` faria o teste concordar com qualquer valor que a constante tivesse.
 *
 * Execução (receita do CLAUDE.md — um servidor só, porta 3411):
 *   npx next dev -p 3411
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3411 npx playwright test --config=playwright.isolated.config.ts tests/e2e/v1.11.0a8b70-compras-financeiro.spec.ts
 */

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const fornecedorId = '55555555-5555-5555-5555-555555555555';
const clienteId = '44444444-4444-4444-4444-444444444444';

// `RECEBIMENTO_COMPRA_REVERSAO_TITULO` (features/compras/components/comprasUiUtils.ts), D84.
const REVERSAO_TITULO = 'Recebimento não se desfaz pela tela';
// Texto de `ContasFinanceirasPage.tsx` com TETO_CONTAS_SEM_PAGINACAO = 300 (D88).
const AVISO_TETO_CONTAS = 'A listagem devolve no máximo 300 contas por filtro. Pode haver mais contas do que as exibidas — refine os filtros para ver as demais.';

const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

// Formato do record C# `ItemPedidoCompraResponse` (scripts/backend-response-records.snapshot.json).
const itemPedidoCompra = (overrides: Record<string, unknown> = {}) => ({
    id: 'pc-e2e-item-1',
    sequencia: 1,
    produtoId: '66666666-6666-6666-6666-666666666666',
    localEstoqueId: '77777777-7777-7777-7777-777777777777',
    quantidade: 10,
    quantidadeRecebida: 0,
    quantidadePendente: 10,
    valorUnitario: 50,
    valorBruto: 500,
    valorDesconto: 0,
    valorTotal: 500,
    observacao: null,
    status: 1,
    ...overrides
});

// Formato do record C# `PedidoCompraResponse`.
const pedidoCompra = (id: string, numero: string, statusPedido: number, item: Record<string, unknown>) => ({
    id,
    empresaId,
    filialId,
    numero,
    fornecedorId,
    dataEmissao: '2026-09-20T12:00:00.000Z',
    dataPrevisaoEntrega: null,
    condicaoPagamentoId: null,
    statusPedido,
    valorProdutos: 500,
    valorDesconto: 0,
    valorTotal: 500,
    observacao: null,
    itens: [item]
});

const PEDIDO_APROVADO_ID = 'c70c70c7-0000-4000-8000-000000000003';
const PEDIDO_PARCIAL_ID = 'c70c70c7-0000-4000-8000-000000000004';
const PEDIDO_RASCUNHO_ID = 'c70c70c7-0000-4000-8000-000000000001';

const pedidosCompraE2E: Record<string, ReturnType<typeof pedidoCompra>> = {
    [PEDIDO_APROVADO_ID]: pedidoCompra(PEDIDO_APROVADO_ID, 'PC-B70-APROVADO', 3, itemPedidoCompra()),
    [PEDIDO_PARCIAL_ID]: pedidoCompra(PEDIDO_PARCIAL_ID, 'PC-B70-PARCIAL', 4, itemPedidoCompra({ quantidadeRecebida: 4, quantidadePendente: 6, status: 2 })),
    [PEDIDO_RASCUNHO_ID]: pedidoCompra(PEDIDO_RASCUNHO_ID, 'PC-B70-RASCUNHO', 1, itemPedidoCompra({ quantidadeRecebida: 4, quantidadePendente: 6 }))
};

const routePedidosCompra = async (page: Page) => {
    await page.route(
        (url) => url.pathname.startsWith('/api/compras/pedidos/') && Boolean(pedidosCompraE2E[url.pathname.split('/').pop() ?? '']),
        (route) => (route.request().method() === 'GET' ? route.fulfill(json(pedidosCompraE2E[new URL(route.request().url()).pathname.split('/').pop() ?? ''])) : route.fallback())
    );
};

// Formato dos records C# `ContaReceberResponse` / `ContaPagarResponse`.
const contas = (type: 'receber' | 'pagar', quantidade: number) =>
    Array.from({ length: quantidade }, (_, index) => {
        const numero = String(index + 1).padStart(4, '0');
        const id = `${type}-b70-${numero}`;
        const parcela = { id: `${id}-p1`, numero: 1, vencimento: '2026-10-20T12:00:00.000Z', valorOriginal: 100, valorPago: 0, valorJuros: 0, valorMulta: 0, valorDesconto: 0, valorSaldo: 100, status: 1 };
        const base = {
            id,
            empresaId,
            filialId,
            documento: `${type === 'receber' ? 'CR' : 'CP'}-B70-${numero}`,
            origem: 1,
            origemId: null,
            dataEmissao: '2026-09-20T12:00:00.000Z',
            valorOriginal: 100,
            valorJuros: 0,
            valorMulta: 0,
            valorDesconto: 0,
            valorSaldo: 100,
            status: 1,
            observacao: null,
            parcelas: [parcela]
        };
        return type === 'receber' ? { ...base, clienteId, valorRecebido: 0, recebimentos: [] } : { ...base, fornecedorId, valorPago: 0, pagamentos: [] };
    });

const routeContas = async (page: Page, type: 'receber' | 'pagar', quantidade: number) => {
    const lista = contas(type, quantidade);
    await page.route(
        (url) => url.pathname === `/api/financeiro/contas-${type}`,
        (route) => (route.request().method() === 'GET' ? route.fulfill(json(lista)) : route.fallback())
    );
};

const impactoCard = (page: Page) => page.locator('.p-card').filter({ has: page.locator('.p-card-title', { hasText: 'Impacto em estoque e financeiro' }) });

test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page);
});

test.describe('v1.11.0a8b70 — Pedido de compra: reversão e progresso de recebimento', () => {
    test.beforeEach(async ({ page }) => {
        await routePedidosCompra(page);
    });

    test('AC-6 card: "Impacto em estoque e financeiro" diz que o recebimento não se desfaz pela tela', async ({ page }) => {
        await page.goto(`/compras/pedidos/${PEDIDO_APROVADO_ID}`);
        await expect(page.getByRole('heading', { name: 'Pedido PC-B70-APROVADO' })).toBeVisible();

        const card = impactoCard(page);
        await expect(card).toBeVisible();
        await expect(card.getByText(REVERSAO_TITULO, { exact: true })).toBeVisible();
        await expect(card).toContainText('O único estorno possível é o do pagamento da conta a pagar gerada, e ele não devolve o estoque');
    });

    test('AC-6 diálogo: a confirmação do recebimento repete que ele não se desfaz pela tela', async ({ page }) => {
        await page.goto(`/compras/pedidos/${PEDIDO_APROVADO_ID}`);
        await expect(page.getByRole('heading', { name: 'Pedido PC-B70-APROVADO' })).toBeVisible();

        const receber = page.getByRole('button', { name: 'Receber', exact: true });
        await expect(receber).toBeEnabled();
        await receber.click();

        const dialog = page.getByRole('dialog', { name: 'Receber pedido de compra' });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText(new RegExp(`^${REVERSAO_TITULO}\\. Depois de confirmado`))).toBeVisible();
    });

    test('AC-4: item de pedido ParcialmenteRecebido mostra "Recebido 4 • Pendente 6" na célula de quantidade', async ({ page }) => {
        await page.goto(`/compras/pedidos/${PEDIDO_PARCIAL_ID}`);
        await expect(page.getByRole('heading', { name: 'Pedido PC-B70-PARCIAL' })).toBeVisible();

        const itensCard = page.locator('.p-card').filter({ has: page.locator('.p-card-title', { hasText: 'Itens do pedido' }) });
        const linha = itensCard.getByRole('row').filter({ hasText: 'R$ 50,00' });
        await expect(linha).toHaveCount(1);
        await expect(linha.getByRole('cell', { name: '10 Recebido 4 • Pendente 6', exact: true })).toBeVisible();
    });

    test('AC-4: item de pedido em Rascunho não mostra progresso de recebimento', async ({ page }) => {
        await page.goto(`/compras/pedidos/${PEDIDO_RASCUNHO_ID}`);
        await expect(page.getByRole('heading', { name: 'Pedido PC-B70-RASCUNHO' })).toBeVisible();

        const itensCard = page.locator('.p-card').filter({ has: page.locator('.p-card-title', { hasText: 'Itens do pedido' }) });
        const linha = itensCard.getByRole('row').filter({ hasText: 'R$ 50,00' });
        await expect(linha).toHaveCount(1);
        await expect(linha.getByRole('cell', { name: '10', exact: true })).toBeVisible();
        await expect(linha.getByText(/Recebido \d+ • Pendente \d+/)).toHaveCount(0);
    });
});

test.describe('v1.11.0a8b70 — Contas a pagar e a receber: aviso de teto 300 (AC-8)', () => {
    for (const { type, rota, titulo } of [
        { type: 'receber' as const, rota: '/financeiro/contas-receber', titulo: 'Contas a receber' },
        { type: 'pagar' as const, rota: '/financeiro/contas-pagar', titulo: 'Contas a pagar' }
    ]) {
        test(`AC-8 ${titulo}: com 300 contas a página avisa que a lista pode estar incompleta`, async ({ page }) => {
            await routeContas(page, type, 300);
            await page.goto(rota);
            await expect(page.getByRole('heading', { name: titulo })).toBeVisible();

            // Carga confirmada antes do aviso: o card conta as 300 linhas devolvidas pelo mock.
            await expect(page.locator('.p-card').filter({ hasText: 'Contas com saldo' })).toHaveText(/Contas com saldo\s*300\s*$/);
            await expect(page.getByText(AVISO_TETO_CONTAS, { exact: true })).toBeVisible();
        });

        test(`AC-8 ${titulo}: com 299 contas a página não avisa`, async ({ page }) => {
            await routeContas(page, type, 299);
            await page.goto(rota);
            await expect(page.getByRole('heading', { name: titulo })).toBeVisible();

            // Sem esta espera o "não avisa" passaria com a lista ainda vazia.
            await expect(page.locator('.p-card').filter({ hasText: 'Contas com saldo' })).toHaveText(/Contas com saldo\s*299\s*$/);
            await expect(page.getByRole('row').filter({ hasText: `${type === 'receber' ? 'CR' : 'CP'}-B70-0001` })).toHaveCount(1);
            await expect(page.getByText(/A listagem devolve no máximo/)).toHaveCount(0);
        });
    }
});

test.describe('v1.11.0a8b70 — Lançamento manual de conta a receber (AC-3)', () => {
    test('AC-3: a origem do lançamento manual é só "Manual", sem outra opção a escolher', async ({ page }) => {
        await page.goto('/financeiro/contas-receber');
        await expect(page.getByRole('heading', { name: 'Contas a receber' })).toBeVisible();

        await page.getByRole('button', { name: 'Nova conta' }).click();
        const dialog = page.getByRole('dialog', { name: 'Nova conta a receber' });
        await expect(dialog).toBeVisible();

        const origem = dialog.locator('#origem');
        await expect(origem.locator('.p-dropdown-label')).toHaveText('Manual');

        // Tentar abrir a lista, como a pessoa faria. Nenhuma origem com vínculo pode ser oferecida.
        await origem.click({ force: true });
        for (const outra of ['Pedido de venda', 'Nota fiscal', 'Compra', 'Contrato', 'Ajuste autorizado', 'Ordem de serviço', 'Frota']) {
            await expect(page.getByRole('option', { name: outra, exact: true })).toHaveCount(0);
        }
    });
});
