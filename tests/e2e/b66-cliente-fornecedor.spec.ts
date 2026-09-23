import { expect, Page, Request, Route, test } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

/**
 * v1.11.0a8b66 — Cliente e Fornecedor: configuração comercial/compra e homologação.
 *
 * Cobre o que o jsdom não renderiza (TabView, Dropdown, ConfirmDialog e ReasonDialog reais):
 * AC-7, AC-8, AC-9, AC-11 e AC-12. A decisão de fluxo do `save` (AC-1 a AC-4) está nos testes de
 * componente `tests/components/ClientesPageAC2AC4.test.tsx` e `FornecedoresPageAC7AC10.test.tsx`.
 *
 * Tudo mockado: `mockApiRoutes` cobre o shell (auth, /me, empresas, pessoas); as rotas desta spec
 * são registradas DEPOIS e, por isso, têm precedência (o Playwright avalia as rotas na ordem inversa
 * do registro). Método não tratado cai no `route.fallback()`.
 *
 * Execução (Bloco C, receita do CLAUDE.md — um servidor só, porta própria):
 *   npx next dev -p 3411
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3411 npx playwright test --config=playwright.isolated.config.ts tests/e2e/b66-cliente-fornecedor.spec.ts
 */

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const pessoaId = '66666666-6666-6666-6666-666666666666';

const clienteId = '44444444-4444-4444-8444-444444444444';
const tabelaPrecoId = 'b6600000-0000-4000-8000-000000000001';
const condicaoPagamentoId = 'b6600000-0000-4000-8000-000000000002';
const classificacaoId = 'b6600000-0000-4000-8000-000000000003';

const fornecedorNaoHomologadoId = 'b6610000-0000-4000-8000-00000000000a';
const fornecedorHomologadoId = 'b6610000-0000-4000-8000-00000000000b';

const ROTULO_NEUTRO = 'Configurado — sem permissão para ver o nome';

const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const semConteudo = (route: Route) => route.fulfill({ status: 204, body: '' });

/** Cliente gravado com os cinco campos comerciais preenchidos, `classificacaoId` incluso (sem controle na tela, D65). */
const clienteGravado = {
    id: clienteId,
    empresaId,
    filialId,
    pessoaId,
    codigo: 'CLI-B66',
    limiteCredito: 5000,
    creditoBloqueado: false,
    motivoBloqueioCredito: null,
    observacao: null,
    tabelaPrecoPadraoId: tabelaPrecoId,
    condicaoPagamentoPadraoId: condicaoPagamentoId,
    classificacaoId,
    diaVencimentoPreferencial: 10,
    permiteVendaAPrazo: true,
    status: 1
};

const condicaoPagamento = { id: condicaoPagamentoId, empresaId, filialId: null, codigo: '30D', nome: '30 dias', quantidadeParcelas: 1, intervaloDias: 30, permiteEntrada: false, status: 1 };

type ClienteState = { configuracaoComercialBodies: unknown[]; tabelasPrecoGets: number };

const installClienteRoutes = async (page: Page, state: ClienteState) => {
    await page.route('**/api/clientes**', async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path === '/api/clientes' && request.method() === 'GET') return json(route, [clienteGravado]);
        if (path === `/api/clientes/${clienteId}` && request.method() === 'PUT') return json(route, clienteGravado);
        if (path === `/api/clientes/${clienteId}/configuracao-comercial` && request.method() === 'PUT') {
            state.configuracaoComercialBodies.push(request.postDataJSON());
            return semConteudo(route);
        }
        return route.fallback();
    });
    await page.route('**/api/financeiro/condicoes-pagamento**', async (route) => (route.request().method() === 'GET' ? json(route, [condicaoPagamento]) : route.fallback()));
    await page.route('**/api/tabelas-preco**', async (route) => {
        state.tabelasPrecoGets += 1;
        return json(route, { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
    });
};

type FornecedorState = { homologado: Record<string, boolean>; homologarRequests: Request[]; revogarBodies: unknown[] };

const fornecedorRow = (id: string, codigo: string, homologado: boolean) => ({
    id,
    empresaId,
    filialId,
    pessoaId,
    codigo,
    observacao: null,
    condicaoPagamentoPadraoId: null,
    prazoEntregaMedio: null,
    homologado,
    categoriaFornecimento: null,
    status: 1
});

const installFornecedorRoutes = async (page: Page, state: FornecedorState) => {
    await page.route('**/api/fornecedores**', async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path === '/api/fornecedores' && request.method() === 'GET') {
            return json(route, [
                fornecedorRow(fornecedorNaoHomologadoId, 'FOR-B66-A', state.homologado[fornecedorNaoHomologadoId]),
                fornecedorRow(fornecedorHomologadoId, 'FOR-B66-B', state.homologado[fornecedorHomologadoId])
            ]);
        }
        const homologar = path.match(/^\/api\/fornecedores\/([^/]+)\/homologar$/);
        if (homologar && request.method() === 'POST') {
            state.homologarRequests.push(request);
            state.homologado[homologar[1]] = true;
            return semConteudo(route);
        }
        const revogar = path.match(/^\/api\/fornecedores\/([^/]+)\/revogar-homologacao$/);
        if (revogar && request.method() === 'POST') {
            state.revogarBodies.push(request.postDataJSON());
            state.homologado[revogar[1]] = false;
            return semConteudo(route);
        }
        return route.fallback();
    });
};

const novoFornecedorState = (): FornecedorState => ({
    homologado: { [fornecedorNaoHomologadoId]: false, [fornecedorHomologadoId]: true },
    homologarRequests: [],
    revogarBodies: []
});

const linha = (page: Page, codigo: string) => page.getByRole('row').filter({ hasText: codigo });

const FORNECEDOR_GESTOR = ['FORNECEDORES_CONSULTAR', 'FORNECEDORES_GERENCIAR', 'PESSOAS_CONSULTAR'];

test.describe('b66 — Fornecedores: coluna Homologado e ações de homologação', () => {
    let state: FornecedorState;

    test.beforeEach(async ({ page }) => {
        state = novoFornecedorState();
        await writeSession(page, { permissions: FORNECEDOR_GESTOR, name: 'Gestor de compras', email: 'compras@logosoft.local' });
        await mockApiRoutes(page);
        await installFornecedorRoutes(page, state);
        await page.goto('/fornecedores');
        await expect(linha(page, 'FOR-B66-A')).toBeVisible();
    });

    test('AC-9: listagem mostra a coluna "Homologado" com o estado de cada fornecedor', async ({ page }) => {
        await expect(page.getByRole('columnheader', { name: 'Homologado' })).toBeVisible();
        await expect(linha(page, 'FOR-B66-A')).toContainText('Não homologado');
        await expect(linha(page, 'FOR-B66-B').getByRole('cell', { name: 'Homologado', exact: true })).toBeVisible();
        await expect(linha(page, 'FOR-B66-B')).not.toContainText('Não homologado');
    });

    test('AC-7: homologar fornecedor ativo não homologado confirma, envia POST sem corpo e atualiza a listagem', async ({ page }) => {
        const row = linha(page, 'FOR-B66-A');
        await expect(row.getByRole('button', { name: 'Revogar homologação' })).toBeDisabled();

        await row.getByRole('button', { name: 'Homologar' }).click();
        const confirmacao = page.getByRole('dialog', { name: 'Homologar fornecedor' });
        await expect(confirmacao).toBeVisible();
        // D63: homologar não pede motivo.
        await expect(confirmacao.getByLabel('Motivo obrigatório')).toHaveCount(0);
        expect(state.homologarRequests).toHaveLength(0);

        await confirmacao.getByRole('button', { name: 'Homologar' }).click();

        await expect.poll(() => state.homologarRequests.length).toBe(1);
        const request = state.homologarRequests[0];
        expect(new URL(request.url()).pathname).toBe(`/api/fornecedores/${fornecedorNaoHomologadoId}/homologar`);
        expect(request.postData() ?? '').toBe('');

        // Listagem atualizada pela invalidação de ['fornecedores'].
        await expect(row.getByRole('cell', { name: 'Homologado', exact: true })).toBeVisible();
        await expect(row.getByRole('button', { name: 'Homologar' })).toBeDisabled();
        await expect(row.getByRole('button', { name: 'Revogar homologação' })).toBeEnabled();
    });

    test('AC-8: revogar homologação exige motivo, envia { motivo } e mantém Homologar desabilitado até revogar', async ({ page }) => {
        const row = linha(page, 'FOR-B66-B');
        await expect(row.getByRole('button', { name: 'Homologar' })).toBeDisabled();

        await row.getByRole('button', { name: 'Revogar homologação' }).click();
        const dialogo = page.getByRole('dialog', { name: 'Motivo da revogação de homologação' });
        await expect(dialogo).toBeVisible();
        const confirmar = dialogo.getByRole('button', { name: 'Revogar homologação' });
        await expect(confirmar).toBeDisabled();

        await dialogo.getByLabel('Motivo obrigatório').fill('Certidão negativa vencida');
        await confirmar.click();

        await expect.poll(() => state.revogarBodies.length).toBe(1);
        expect(state.revogarBodies[0]).toEqual({ motivo: 'Certidão negativa vencida' });
        expect(state.homologarRequests).toHaveLength(0);

        await expect(row).toContainText('Não homologado');
        await expect(row.getByRole('button', { name: 'Homologar' })).toBeEnabled();
        await expect(row.getByRole('button', { name: 'Revogar homologação' })).toBeDisabled();
    });
});

test.describe('b66 — Fornecedores: sessão sem FORNECEDORES_GERENCIAR', () => {
    test('AC-12: homologar e revogar não ficam habilitados para quem só consulta', async ({ page }) => {
        const state = novoFornecedorState();
        await writeSession(page, { permissions: ['FORNECEDORES_CONSULTAR', 'PESSOAS_CONSULTAR'], name: 'Leitor de compras', email: 'leitor.compras@logosoft.local' });
        await mockApiRoutes(page);
        await installFornecedorRoutes(page, state);
        await page.goto('/fornecedores');

        // Controle: a listagem carregou de verdade — a ausência das ações não é página quebrada.
        await expect(linha(page, 'FOR-B66-A')).toBeVisible();
        await expect(linha(page, 'FOR-B66-B')).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Homologado' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Novo fornecedor' })).toBeDisabled();

        // Oculto ou desabilitado, tanto faz: nenhum botão habilitado com esses nomes.
        await expect(page.getByRole('button', { name: 'Homologar' }).and(page.locator(':enabled'))).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Revogar homologação' }).and(page.locator(':enabled'))).toHaveCount(0);
        expect(state.homologarRequests).toHaveLength(0);
        expect(state.revogarBodies).toHaveLength(0);
    });
});

test.describe('b66 — Clientes: aba Comercial sem TABELAS_PRECO_CONSULTAR', () => {
    test('AC-11: tabela desabilitada com rótulo neutro, demais campos editáveis, um aviso só, e o PUT reenvia o valor gravado', async ({ page }) => {
        const state: ClienteState = { configuracaoComercialBodies: [], tabelasPrecoGets: 0 };
        await writeSession(page, {
            permissions: ['CLIENTES_CONSULTAR', 'CLIENTES_GERENCIAR', 'FINANCEIRO_CONSULTAR', 'PESSOAS_CONSULTAR'],
            name: 'Vendedor sem tabela',
            email: 'vendedor@logosoft.local'
        });
        await mockApiRoutes(page);
        await installClienteRoutes(page, state);
        await page.goto('/clientes');

        const row = linha(page, 'CLI-B66');
        await expect(row).toBeVisible();
        await row.getByRole('button', { name: 'Editar' }).click();

        const dialogo = page.getByRole('dialog', { name: 'Editar cliente' });
        await expect(dialogo).toBeVisible();
        await dialogo.getByRole('tab', { name: 'Comercial' }).click();

        // Seletor de tabela: desabilitado, com rótulo neutro — nunca o Guid cru, nunca vazio.
        const tabela = dialogo.locator('#tabelaPrecoPadraoId');
        await expect(tabela).toHaveAttribute('data-p-disabled', 'true');
        await expect(tabela.locator('input[aria-haspopup="listbox"]')).toBeDisabled();
        await expect(tabela).toContainText(ROTULO_NEUTRO);
        await expect(dialogo).not.toContainText(tabelaPrecoId);
        await expect(dialogo).not.toContainText(classificacaoId);

        // Demais campos da aba seguem editáveis.
        const condicao = dialogo.locator('#condicaoPagamentoPadraoId');
        await expect(condicao).toHaveAttribute('data-p-disabled', 'false');
        await expect(condicao).toContainText('30D • 30 dias');
        await expect(dialogo.locator('#diaVencimentoPreferencial input')).toBeEditable();
        await expect(dialogo.getByLabel('Permite venda a prazo')).toBeEnabled();

        // Um único aviso, listando só a permissão que falta.
        const aviso = dialogo.getByText(/Consulta de catálogo indisponível/);
        await expect(aviso).toHaveCount(1);
        await expect(aviso).toContainText('TABELAS_PRECO_CONSULTAR');
        await expect(aviso).not.toContainText('FINANCEIRO_CONSULTAR');

        await dialogo.getByRole('button', { name: 'Salvar' }).click();

        await expect.poll(() => state.configuracaoComercialBodies.length).toBe(1);
        // AC-11 + AC-6: o bloco inteiro volta como estava gravado — tabela sem permissão e classificação sem controle inclusas.
        expect(state.configuracaoComercialBodies[0]).toEqual({
            tabelaPrecoPadraoId: tabelaPrecoId,
            condicaoPagamentoPadraoId: condicaoPagamentoId,
            classificacaoId,
            diaVencimentoPreferencial: 10,
            permiteVendaAPrazo: true
        });
        // Sem a permissão, o catálogo de tabelas nem é consultado.
        expect(state.tabelasPrecoGets).toBe(0);
    });
});
