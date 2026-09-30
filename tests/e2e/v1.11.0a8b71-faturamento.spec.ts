import { expect, test, type Page, type Request } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

/**
 * v1.11.0a8b71 — Faturamento honesto e corrigível: AC-1, AC-2, AC-4 e AC-7 na tela real.
 *
 * Os textos esperados estão copiados literalmente da produção de propósito (`faturamentoLabels.ts`,
 * `fiscalLabels.ts`): importar a constante faria o teste concordar com qualquer valor que ela tivesse.
 *
 * Execução (receita do CLAUDE.md — um servidor só, porta 3411):
 *   npx next dev -p 3411
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3411 npx playwright test --config=playwright.isolated.config.ts tests/e2e/v1.11.0a8b71-faturamento.spec.ts
 */

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const clienteId = '44444444-4444-4444-4444-444444444444';

const FATURAMENTO_ID = 'b71b71b7-0000-4000-8000-000000000001';
const FATURAMENTO_ERRO_ID = 'b71b71b7-0000-4000-8000-000000000002';
const PEDIDO_APROVADO_ID = 'b71b71b7-0000-4000-8000-0000000000a1';
const NATUREZA_ID = 'b71b71b7-0000-4000-8000-0000000000c1';

// Sem FISCAL_SERIES_CONSULTAR/FISCAL_MODELOS_CONSULTAR: a série fica no modo texto (P-2a), fora deste recorte.
const PERMISSOES = ['FATURAMENTO_CONSULTAR', 'FATURAMENTO_PREPARAR', 'FATURAMENTO_CONFIRMAR', 'FISCAL_CADASTROS_CONSULTAR', 'VENDAS_CONSULTAR', 'FINANCEIRO_CONSULTAR'];

// Motivo gravado no leg 1 (inventário 13, FT-10/FT-12: pedido 00014, `NotaJaExisteParaOrigem`).
const MOTIVO_LEG_1 = 'Já existe nota fiscal para a origem informada (NotaJaExisteParaOrigem).';

// `FATURAMENTO_RESULTADO` e `descricaoLegQueParou` (features/faturamento/components/faturamentoLabels.ts), D93.
const RESULTADO_ERRO = `Faturamento terminou em erro. Parou no leg 1 (Gerar nota fiscal): ${MOTIVO_LEG_1}`;
const RESULTADO_FATURADO = 'Faturamento confirmado. O faturamento chegou à etapa Faturado.';
const PROXIMO_PASSO = 'Próximo passo: corrija a causa e use "Confirmar" de novo neste mesmo faturamento. Não prepare outro faturamento para o pedido.';
// `FATURAMENTO_CONFIRMAR.indisponivelPrefixo` + `NATUREZA_OPERACAO_FIELD.vazio` (fiscalLabels.ts), D91.
const CONFIRMAR_INDISPONIVEL =
    'Confirmar indisponível: Nenhuma natureza de operação ativa cadastrada para esta empresa. Sem natureza, a geração da nota é recusada pelo backend. O cadastro de naturezas ainda não tem tela; peça a inclusão ao responsável fiscal.';
// `FATURAMENTO_PREPARAR.existenteErro(1)` e `.abrirExistente`, D95.
const PREPARAR_EXISTENTE_ERRO =
    'Este pedido já tem 1 faturamento(s) em Erro. Preparar de novo cria outro faturamento e não reaproveita os anteriores. Para tentar de novo, abra o mais recente e confirme.';
const PREPARAR_ABRIR_ERRO = 'Abrir o faturamento em Erro mais recente';

const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
// Formato do record C# `PagedResult<T>` (Erp.Shared/Kernel/PagedResult.cs).
const paged = <T>(items: T[]) => ({ items, page: 1, pageSize: 200, totalItems: items.length, totalPages: items.length ? 1 : 0, hasPreviousPage: false, hasNextPage: false });

// Formato do record C# `NaturezaOperacaoResponse` (NaturezaOperacaoContracts.cs:53-68), 15 campos.
const naturezaVenda = {
    id: NATUREZA_ID,
    empresaId,
    filialId: null,
    codigo: '5102',
    descricao: 'Venda de mercadoria',
    tipoDocumento: 1,
    tipoOperacao: 1,
    finalidade: 1,
    indicadorPresencaComprador: 1,
    indicadorConsumidorFinal: false,
    movimentaEstoque: true,
    geraFinanceiro: true,
    observacao: null,
    ativa: true,
    cfops: []
};

// Formato do record C# `FaturamentoResponse` (FaturamentoContracts.cs:32-50).
const faturamento = (id: string, etapa: number, legs: Record<string, unknown>[] = []) => ({
    id,
    empresaId,
    filialId,
    pedidoVendaId: PEDIDO_APROVADO_ID,
    notaFiscalId: null,
    contaReceberId: null,
    etapa,
    valorTotal: 251,
    confirmadoEm: null,
    confirmadoPor: null,
    canceladoEm: null,
    canceladoPor: null,
    motivoCancelamento: null,
    legs,
    possuiLegComFalha: legs.some((leg) => leg.estado === 2),
    possuiLegRevertido: false,
    etapaDivergeDosLegs: false,
    possuiLegEmReversao: false
});

// Formato do record C# `FaturamentoLegResponse` (FaturamentoContracts.cs:56-62). Estado 2 = Falhou.
const legFalhou = { id: 'b71b71b7-0000-4000-8000-0000000000f1', leg: 1, estado: 2, ocorreuEm: '2026-09-30T10:00:00Z', responsavelId: null, motivo: MOTIVO_LEG_1 };
const legIntegrado = (leg: number) => ({ id: `b71b71b7-0000-4000-8000-00000000010${leg}`, leg, estado: 1, ocorreuEm: '2026-09-30T10:00:00Z', responsavelId: null, motivo: null });

// Formato do record C# `PedidoVendaResponse` (scripts/backend-response-records.snapshot.json). Status 3 = Aprovado.
const pedidoAprovado = {
    id: PEDIDO_APROVADO_ID,
    empresaId,
    filialId,
    numero: 'PV-B71-APROVADO',
    clienteId,
    dataEmissao: '2026-09-28T12:00:00.000Z',
    dataPrevisaoEntrega: null,
    tipo: 2,
    statusPedido: 3,
    valorProdutos: 251,
    valorDesconto: 0,
    valorTotal: 251,
    observacao: null,
    motivoCancelamento: null,
    aprovadoEm: '2026-09-29T12:00:00.000Z',
    canceladoEm: null,
    faturadoEm: null,
    itens: []
};

const ETAPA = { PendenteFiscal: 2, Faturado: 5, Erro: 7 } as const;

type Cenario = { naturezas: (typeof naturezaVenda)[]; respostaConfirmar: ReturnType<typeof faturamento> };

// Rotas do detalhe: o GET devolve PendenteFiscal até o POST do Confirmar; depois, o faturamento da resposta.
const routeDetalhe = async (page: Page, cenario: Cenario) => {
    let atual = faturamento(FATURAMENTO_ID, ETAPA.PendenteFiscal);
    const confirmacoes: Request[] = [];

    await page.route(
        (url) => url.pathname === '/api/fiscal/naturezas-operacao',
        (route) => (route.request().method() === 'GET' ? route.fulfill(json(paged(cenario.naturezas))) : route.fallback())
    );
    await page.route(
        (url) => url.pathname.startsWith(`/api/faturamento/${FATURAMENTO_ID}`),
        (route) => {
            const request = route.request();
            const path = new URL(request.url()).pathname;
            if (request.method() === 'GET' && path === `/api/faturamento/${FATURAMENTO_ID}`) return route.fulfill(json(atual));
            if (request.method() === 'GET' && (path.endsWith('/historico') || path.endsWith('/ocorrencias'))) return route.fulfill(json([]));
            if (request.method() === 'POST' && path === `/api/faturamento/${FATURAMENTO_ID}/confirmar`) {
                confirmacoes.push(request);
                atual = cenario.respostaConfirmar;
                return route.fulfill(json({ faturamento: cenario.respostaConfirmar, alertas: [] }));
            }
            return route.fallback();
        }
    );
    return confirmacoes;
};

const abrirConfirmar = async (page: Page) => {
    await page.goto(`/faturamento/${FATURAMENTO_ID}`);
    const botao = page.getByRole('button', { name: 'Confirmar', exact: true });
    await expect(botao).toBeEnabled();
    await botao.click();
    const dialog = page.getByRole('dialog', { name: 'Confirmar faturamento (dados fiscais)' });
    await expect(dialog).toBeVisible();
    return dialog;
};

// Preenche o formulário válido com a natureza do combo (vínculo por select, nunca GUID digitado).
const preencherConfirmar = async (page: Page, dialog: ReturnType<Page['getByRole']>) => {
    await dialog.locator('#fatVenc input').fill('20/10/2026');
    await dialog.getByLabel('Número *').click();
    await dialog.getByLabel('Número *').fill('1001');
    await dialog.locator('.field').filter({ has: page.locator('label[for="fatSerie"]') }).getByRole('textbox').fill('1');
    await dialog.getByLabel('UF autorizadora *').fill('SP');
    await dialog.getByLabel('Unidade comercial padrão *').fill('UN');
    await dialog.locator('#fatNatureza').click();
    await page.getByRole('option', { name: '5102 — Venda de mercadoria', exact: true }).click();
    await expect(dialog.locator('#fatNatureza')).toContainText('5102 — Venda de mercadoria');
};

const confirmarECapturar = async (page: Page, dialog: ReturnType<Page['getByRole']>) => {
    const requestPromise = page.waitForRequest((request) => request.method() === 'POST' && request.url().includes(`/api/faturamento/${FATURAMENTO_ID}/confirmar`), { timeout: 10_000 });
    await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click();
    return requestPromise;
};

const resultadoCard = (page: Page) => page.locator('.p-card').filter({ has: page.locator('.p-card-title', { hasText: 'Resultado da última confirmação' }) });

test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page, { permissions: PERMISSOES, email: 'fat-b71@logosoft.local', name: 'Faturamento B71' });
});

test.describe('v1.11.0a8b71 — Confirmar: natureza obrigatória (AC-2) e body do request (AC-1)', () => {
    test('AC-2: sem natureza ativa na empresa, o Confirmar do diálogo fica desabilitado e o motivo aparece', async ({ page }) => {
        const confirmacoes = await routeDetalhe(page, { naturezas: [], respostaConfirmar: faturamento(FATURAMENTO_ID, ETAPA.Faturado) });
        const dialog = await abrirConfirmar(page);

        await expect(dialog.getByText(CONFIRMAR_INDISPONIVEL, { exact: true })).toBeVisible();
        const confirmar = dialog.getByRole('button', { name: 'Confirmar', exact: true });
        await expect(confirmar).toBeDisabled();
        await confirmar.click({ force: true });
        expect(confirmacoes).toHaveLength(0);
    });

    test('AC-2: com uma natureza ativa, o Confirmar do diálogo habilita e o motivo não aparece', async ({ page }) => {
        await routeDetalhe(page, { naturezas: [naturezaVenda], respostaConfirmar: faturamento(FATURAMENTO_ID, ETAPA.Faturado) });
        const dialog = await abrirConfirmar(page);

        // Carga confirmada antes do "não aparece": a opção da natureza está no combo.
        await dialog.locator('#fatNatureza').click();
        await expect(page.getByRole('option', { name: '5102 — Venda de mercadoria', exact: true })).toBeVisible();
        await page.keyboard.press('Tab');
        await expect(dialog.getByRole('button', { name: 'Confirmar', exact: true })).toBeEnabled();
        await expect(dialog.getByText(/^Confirmar indisponível:/)).toHaveCount(0);
    });

    test('AC-1: o POST do Confirmar leva naturezaOperacaoId e correlationId, sem cfopPadrao', async ({ page }) => {
        await routeDetalhe(page, { naturezas: [naturezaVenda], respostaConfirmar: faturamento(FATURAMENTO_ID, ETAPA.Faturado) });
        const dialog = await abrirConfirmar(page);
        const correlationIdNaTela = await dialog.getByLabel('ID de correlação', { exact: true }).inputValue();
        expect(correlationIdNaTela).toMatch(/^front-faturamento-/);

        await preencherConfirmar(page, dialog);
        const request = await confirmarECapturar(page, dialog);

        const body = request.postDataJSON() as Record<string, unknown>;
        expect(body.naturezaOperacaoId).toBe(NATUREZA_ID);
        expect(body.correlationId).toBe(correlationIdNaTela);
        expect(Object.keys(body)).not.toContain('cfopPadrao');
        expect(body.ufAutorizadora).toBe('SP');
    });
});

test.describe('v1.11.0a8b71 — Resultado do Confirmar lido da etapa real (AC-4)', () => {
    test('AC-4: 200 com etapa Erro e leg 1 em falha não diz "Faturamento confirmado"; diz onde parou e o motivo', async ({ page }) => {
        await routeDetalhe(page, { naturezas: [naturezaVenda], respostaConfirmar: faturamento(FATURAMENTO_ID, ETAPA.Erro, [legFalhou]) });
        const dialog = await abrirConfirmar(page);
        await preencherConfirmar(page, dialog);
        await confirmarECapturar(page, dialog);

        const card = resultadoCard(page);
        await expect(card).toBeVisible();
        await expect(card.getByText(RESULTADO_ERRO, { exact: true })).toBeVisible();
        await expect(card.getByText(PROXIMO_PASSO, { exact: true })).toBeVisible();
        await expect(card.getByRole('button', { name: 'Confirmar de novo' })).toBeVisible();
        // Nem o painel nem o toast podem dizer sucesso.
        await expect(page.getByText(/Faturamento confirmado/)).toHaveCount(0);
    });

    test('AC-4: 200 com etapa Faturado mostra "Faturamento confirmado"', async ({ page }) => {
        await routeDetalhe(page, {
            naturezas: [naturezaVenda],
            respostaConfirmar: faturamento(FATURAMENTO_ID, ETAPA.Faturado, [1, 2, 3, 4, 5, 6].map(legIntegrado))
        });
        const dialog = await abrirConfirmar(page);
        await preencherConfirmar(page, dialog);
        await confirmarECapturar(page, dialog);

        const card = resultadoCard(page);
        await expect(card).toBeVisible();
        await expect(card.getByText(RESULTADO_FATURADO, { exact: true })).toBeVisible();
        await expect(card.getByText(/^Faturamento terminou em erro/)).toHaveCount(0);
        await expect(card.getByText(PROXIMO_PASSO, { exact: true })).toHaveCount(0);
    });
});

test.describe('v1.11.0a8b71 — Preparar oferece o faturamento em Erro do pedido (AC-7)', () => {
    test('AC-7: ao escolher o pedido aprovado, o Preparar consulta por pedidoVendaId e oferece o faturamento em Erro', async ({ page }) => {
        const consultasPedidos: URL[] = [];
        const consultasPorPedido: URL[] = [];

        await page.route(
            (url) => url.pathname === '/api/vendas/pedidos',
            (route) => {
                if (route.request().method() !== 'GET') return route.fallback();
                const url = new URL(route.request().url());
                consultasPedidos.push(url);
                const status = url.searchParams.get('status');
                return route.fulfill(json(!status || status === '3' ? [pedidoAprovado] : []));
            }
        );
        await page.route(
            (url) => url.pathname === '/api/faturamento',
            (route) => {
                if (route.request().method() !== 'GET') return route.fallback();
                const url = new URL(route.request().url());
                if (url.searchParams.get('pedidoVendaId')) {
                    consultasPorPedido.push(url);
                    const doPedido = url.searchParams.get('pedidoVendaId') === PEDIDO_APROVADO_ID ? [faturamento(FATURAMENTO_ERRO_ID, ETAPA.Erro)] : [];
                    return route.fulfill(json(paged(doPedido)));
                }
                return route.fulfill(json(paged([])));
            }
        );
        await page.route(
            (url) => url.pathname.startsWith(`/api/faturamento/${FATURAMENTO_ERRO_ID}`),
            (route) => {
                const path = new URL(route.request().url()).pathname;
                if (path === `/api/faturamento/${FATURAMENTO_ERRO_ID}`) return route.fulfill(json(faturamento(FATURAMENTO_ERRO_ID, ETAPA.Erro, [legFalhou])));
                return route.fulfill(json([]));
            }
        );

        await page.goto('/faturamento');
        // A lista da empresa carregou (vazia no mock) antes de abrir o Preparar.
        await expect(page.getByRole('heading', { name: 'Nenhum faturamento', exact: true })).toBeVisible();
        const preparar = page.getByRole('button', { name: 'Preparar faturamento' });
        await expect(preparar).toBeEnabled();
        await preparar.click();
        const dialog = page.getByRole('dialog', { name: 'Preparar faturamento' });
        await expect(dialog).toBeVisible();

        await dialog.locator('#fatPedido').click();
        await page.getByRole('option', { name: /^PV-B71-APROVADO • Total/ }).click();

        await expect(dialog.getByText(PREPARAR_EXISTENTE_ERRO, { exact: true })).toBeVisible();
        expect(consultasPorPedido.map((url) => url.searchParams.get('pedidoVendaId'))).toContain(PEDIDO_APROVADO_ID);
        // O combo do Preparar só pede pedidos Aprovado (status 3).
        expect(consultasPedidos.some((url) => url.searchParams.get('status') === '3')).toBe(true);

        await dialog.getByRole('button', { name: PREPARAR_ABRIR_ERRO }).click();
        await expect(page).toHaveURL(new RegExp(`/faturamento/${FATURAMENTO_ERRO_ID}$`));
    });
});
