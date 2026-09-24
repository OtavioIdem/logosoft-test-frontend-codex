import { expect, Page, Route, test } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

/**
 * v1.11.0a8b67 — Classificações de Pessoa: cadastro e seletor no Cliente.
 *
 * AC-1 (listagem), AC-6 (permissão PESSOAS_CONSULTAR sem CLASSIFICACOES_PESSOA_GERENCIAR),
 * AC-7 (só CLASSIFICACOES_PESSOA_GERENCIAR), AC-8 (seletor no Cliente grava clasificacaoId),
 * AC-10 (sem PESSOAS_CONSULTAR: seletor desabilitado).
 *
 * Tudo mockado: `mockApiRoutes` cobre o shell (auth, /me, empresas, pessoas); as rotas desta spec
 * são registradas DEPOIS e, por isso, têm precedência.
 *
 * Execução (Bloco C — NÃO EXECUTAR AQUI, apenas prove que compila com --list):
 *   npx next dev -p 3411
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3411 npx playwright test --config=playwright.isolated.config.ts tests/e2e/b67-classificacoes-pessoa.spec.ts
 */

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const pessoaId = '66666666-6666-6666-6666-666666666666';

const classificacao1Id = 'b6700000-0000-4000-8000-000000000001';
const classificacao2Id = 'b6700000-0000-4000-8000-000000000002';
const classificacao3Id = 'b6700000-0000-4000-8000-000000000003';

const clienteId = '44444444-4444-4444-8444-444444444444';
const tabelaPrecoId = 'b6600000-0000-4000-8000-000000000001';
const condicaoPagamentoId = 'b6600000-0000-4000-8000-000000000002';

const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const semConteudo = (route: Route) => route.fulfill({ status: 204, body: '' });

/** Classificações: duas ativas e uma inativa. */
const classificacoesGravadas = [
    { id: classificacao1Id, empresaId, codigo: 'CORP', nome: 'Corporate', descricao: 'Clientes corporativos', status: 1 },
    { id: classificacao2Id, empresaId, codigo: 'PME', nome: 'Pequena e Média Empresa', descricao: null, status: 1 },
    { id: classificacao3Id, empresaId, codigo: 'LEGACY', nome: 'Legacy System', descricao: 'Migração em andamento', status: 0 }
];

/** Cliente com classificação ativa gravada. */
const clienteGravadoComClassificacao = {
    id: clienteId,
    empresaId,
    filialId,
    pessoaId,
    codigo: 'CLI-B67',
    limiteCredito: 5000,
    creditoBloqueado: false,
    motivoBloqueioCredito: null,
    observacao: null,
    tabelaPrecoPadraoId: tabelaPrecoId,
    condicaoPagamentoPadraoId: condicaoPagamentoId,
    classificacaoId: classificacao1Id,
    diaVencimentoPreferencial: 10,
    permiteVendaAPrazo: true,
    status: 1
};

const condicaoPagamento = { id: condicaoPagamentoId, empresaId, filialId: null, codigo: '30D', nome: '30 dias', quantidadeParcelas: 1, intervaloDias: 30, permiteEntrada: false, status: 1 };

type ClassificacaoState = {
    classificacoesBodies: unknown[];
    clienteConfiguracaoComercialBodies: unknown[];
};

const installClassificacaoRoutes = async (page: Page, state: ClassificacaoState) => {
    await page.route('**/api/pessoas/classificacoes**', async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path === '/api/pessoas/classificacoes' && request.method() === 'GET') {
            return json(route, classificacoesGravadas);
        }
        if (path === '/api/pessoas/classificacoes' && request.method() === 'POST') {
            state.classificacoesBodies.push(request.postDataJSON());
            const novaClassificacao = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', ...request.postDataJSON(), status: 1 };
            return json(route, novaClassificacao, 201);
        }
        const updateMatch = path.match(/^\/api\/pessoas\/classificacoes\/([^/]+)$/);
        if (updateMatch && request.method() === 'PUT') {
            state.classificacoesBodies.push(request.postDataJSON());
            const updated = classificacoesGravadas.find((c) => c.id === updateMatch[1]) || {};
            return json(route, { ...updated, ...request.postDataJSON() });
        }
        const inativarMatch = path.match(/^\/api\/pessoas\/classificacoes\/([^/]+)\/inativar$/);
        if (inativarMatch && request.method() === 'POST') {
            state.classificacoesBodies.push(request.postDataJSON());
            return semConteudo(route);
        }
        return route.fallback();
    });
};

const installClienteRoutes = async (page: Page, state: ClassificacaoState) => {
    await page.route('**/api/clientes**', async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path === '/api/clientes' && request.method() === 'GET') return json(route, [clienteGravadoComClassificacao]);
        if (path === `/api/clientes/${clienteId}` && request.method() === 'PUT') return json(route, clienteGravadoComClassificacao);
        if (path === `/api/clientes/${clienteId}/configuracao-comercial` && request.method() === 'PUT') {
            state.clienteConfiguracaoComercialBodies.push(request.postDataJSON());
            return semConteudo(route);
        }
        return route.fallback();
    });
    await page.route('**/api/financeiro/condicoes-pagamento**', async (route) => (route.request().method() === 'GET' ? json(route, [condicaoPagamento]) : route.fallback()));
    await page.route('**/api/tabelas-preco**', async (route) => json(route, { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }));
};

const linha = (page: Page, codigo: string) => page.getByRole('row').filter({ hasText: codigo });

const PESSOAS_CONSULTAR = ['PESSOAS_CONSULTAR'];
const CLASSIFICACOES_GERENCIAR = ['CLASSIFICACOES_PESSOA_GERENCIAR'];
const TODAS_PERMISSOES = ['PESSOAS_CONSULTAR', 'CLASSIFICACOES_PESSOA_GERENCIAR', 'CLIENTES_CONSULTAR', 'CLIENTES_GERENCIAR', 'FINANCEIRO_CONSULTAR'];

test.describe('b67 — Classificações de Pessoa', () => {
    test('AC-1: listagem de classificações ativas e inativas', async ({ page }) => {
        await writeSession(page, { permissions: TODAS_PERMISSOES, name: 'Gestor de Pessoas', email: 'pessoas@logosoft.local' });
        await mockApiRoutes(page);
        const state: ClassificacaoState = { classificacoesBodies: [], clienteConfiguracaoComercialBodies: [] };
        await installClassificacaoRoutes(page, state);
        await page.goto('/pessoas/classificacoes');
        await expect(page.getByRole('heading', { name: 'Classificações de pessoa' })).toBeVisible();
        await expect(linha(page, 'CORP')).toBeVisible();
        await expect(linha(page, 'PME')).toBeVisible();
        await expect(linha(page, 'LEGACY')).toBeVisible();
    });

    test('AC-6: sessão com PESSOAS_CONSULTAR sem CLASSIFICACOES_PESSOA_GERENCIAR', async ({ page }) => {
        await writeSession(page, { permissions: PESSOAS_CONSULTAR, name: 'Consultor de Pessoas', email: 'consultor@logosoft.local' });
        await mockApiRoutes(page);
        const state: ClassificacaoState = { classificacoesBodies: [], clienteConfiguracaoComercialBodies: [] };
        await installClassificacaoRoutes(page, state);
        await page.goto('/pessoas/classificacoes');
        await expect(page.getByRole('heading', { name: 'Classificações de pessoa' })).toBeVisible();
        // "Nova classificação" desabilitado.
        await expect(page.getByRole('button', { name: /Nova classificação/ })).toBeDisabled();
        // Ações de linha (Editar, Inativar) ocultas.
        await expect(page.getByRole('button', { name: /Editar|Inativar/ })).not.toBeVisible();
    });

    test('AC-7: sessão com só CLASSIFICACOES_PESSOA_GERENCIAR — rota não abre', async ({ page }) => {
        await writeSession(page, { permissions: CLASSIFICACOES_GERENCIAR, name: 'Gerenciador de Classificações', email: 'class@logosoft.local' });
        await mockApiRoutes(page);
        const state: ClassificacaoState = { classificacoesBodies: [], clienteConfiguracaoComercialBodies: [] };
        await installClassificacaoRoutes(page, state);
        // Tentar acessar diretamente a rota.
        await page.goto('/pessoas/classificacoes');
        // RoutePermissionGate bloqueia com "Acesso negado" e descrição das permissões exigidas.
        await expect(page.getByRole('heading', { name: 'Acesso negado' })).toBeVisible();
        await expect(page.getByText(/PESSOAS_CONSULTAR/)).toBeVisible();
        // Cabeçalho da página não aparece.
        await expect(page.getByRole('heading', { name: 'Classificações de pessoa' })).not.toBeVisible();
        // Link do menu com href="/pessoas/classificacoes" ausente (controle positivo: aparece em AC-6).
        await expect(page.locator('a[href="/pessoas/classificacoes"]')).not.toBeVisible();
    });

    test('AC-8: seletor no Cliente grava classificacaoId no PUT /configuracao-comercial', async ({ page }) => {
        await writeSession(page, { permissions: TODAS_PERMISSOES, name: 'Gestor de Vendas', email: 'vendas@logosoft.local' });
        await mockApiRoutes(page);
        const state: ClassificacaoState = { classificacoesBodies: [], clienteConfiguracaoComercialBodies: [] };
        await installClassificacaoRoutes(page, state);
        await installClienteRoutes(page, state);
        await page.goto('/clientes');
        await expect(linha(page, 'CLI-B67')).toBeVisible();
        // Editar cliente.
        await page.getByRole('button', { name: 'Editar' }).first().click();
        // Navegar para aba "Comercial".
        await page.getByRole('tab', { name: 'Comercial' }).click();
        // Seletor de classificação deve estar visível com o valor gravado (CORP).
        await expect(page.locator('text=Classificação').first()).toBeVisible();
        // Escolher uma classificação diferente (PME em vez de CORP).
        const classificacaoDropdown = page.locator('[id="classificacaoId"]').first();
        await classificacaoDropdown.click();
        // Selecionar a opção PME (segunda classificação ativa).
        await page.getByRole('option', { name: /PME/ }).click();
        // Salvar cliente.
        await page.getByRole('button', { name: /Salvar/ }).click();
        // Aguardar sucesso.
        await expect(page.locator('text=salvo')).toBeVisible({ timeout: 5000 });
        // Asserção: o PUT deve conter classificacaoId nova (PME).
        const ultimoBody = state.clienteConfiguracaoComercialBodies[state.clienteConfiguracaoComercialBodies.length - 1];
        expect(ultimoBody).toHaveProperty('classificacaoId', classificacao2Id);
    });

    test('AC-10: sem PESSOAS_CONSULTAR, seletor desabilitado com permissão no aviso', async ({ page }) => {
        await writeSession(page, { permissions: ['CLIENTES_CONSULTAR', 'CLIENTES_GERENCIAR', 'FINANCEIRO_CONSULTAR'], name: 'Gestor de Clientes', email: 'clientes@logosoft.local' });
        await mockApiRoutes(page);
        const state: ClassificacaoState = { classificacoesBodies: [], clienteConfiguracaoComercialBodies: [] };
        await installClienteRoutes(page, state);
        await page.goto('/clientes');
        await expect(linha(page, 'CLI-B67')).toBeVisible();
        // Editar cliente (que tem classificacao1Id gravada).
        await page.getByRole('button', { name: 'Editar' }).first().click();
        // Navegar para aba "Comercial".
        await page.getByRole('tab', { name: 'Comercial' }).click();
        // Aviso único da aba deve incluir PESSOAS_CONSULTAR.
        await expect(page.locator('text=Consulta de catálogo indisponível').first()).toBeVisible();
        await expect(page.locator('text=PESSOAS_CONSULTAR').first()).toBeVisible();
        // Seletor de classificação está desabilitado com rótulo neutro.
        const classificacaoSelect = page.locator('[id="classificacaoId"]').first();
        await expect(classificacaoSelect).toHaveAttribute('data-p-disabled', 'true');
        // Verificar que o rótulo neutro aparece na classificação (guarda por campo, D66).
        await expect(page.locator('#classificacaoId')).toContainText('Configurado — sem permissão para ver o nome');
        // Prova de que a D66 vale para ambos os campos: tabela de preço também mostra rótulo neutro.
        await expect(page.locator('#tabelaPrecoPadraoId')).toContainText('Configurado — sem permissão para ver o nome');
        // O Guid cru da classificação gravada não aparece no diálogo (segurança de privacidade).
        await expect(page.getByRole('dialog')).not.toContainText(classificacao1Id);
        // Salvar cliente sem alterar o seletor.
        await page.getByRole('button', { name: /Salvar/ }).click();
        // Aguardar sucesso.
        await expect(page.locator('text=salvo')).toBeVisible({ timeout: 5000 });
        // Asserção: o PUT deve conter classificacaoId gravado originalmente, reenviado.
        const ultimoBody = state.clienteConfiguracaoComercialBodies[state.clienteConfiguracaoComercialBodies.length - 1];
        expect(ultimoBody).toHaveProperty('classificacaoId', classificacao1Id);
    });
});
