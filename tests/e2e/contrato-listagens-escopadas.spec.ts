import { expect, test } from '@playwright/test';
import { ADMIN_PERMISSIONS, mockApiRoutes, recusasDeContratoDe, writeSession } from './fixtures/logosoft';

/**
 * v1.11.0a8b76.c2 — a fixture recusa o que o backend recusa.
 *
 * Verificação QA-20261024-161925-6b180b: 22 das 49 páginas levavam HTTP 400 e nenhum teste enxergou, porque
 * a fixture respondia 200 com ou sem `empresaId` e com data ISO completa. A UI ainda se recupera quando o
 * segundo disparo (já com empresa) responde 200, então olhar só o resultado final da tela não basta: o que
 * prova o defeito é o REGISTRO das recusas que a fixture emitiu durante o carregamento da página.
 *
 * Parte 1: a fixture, isolada, recusa como o backend (corpo e status).
 * Parte 2: as páginas do recorte carregam sem provocar nenhuma recusa de contrato.
 * Parte 3: o que de fato sai na rede nas duas telas de relatório.
 *
 * Execução (receita do CLAUDE.md — um servidor só, porta própria):
 *   npx next dev -p 3411
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3411 npx playwright test --config=playwright.isolated.config.ts tests/e2e/contrato-listagens-escopadas.spec.ts
 */

const EMPRESA = '11111111-1111-1111-1111-111111111111';
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_COMPLETO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
// ADMIN_PERMISSIONS não traz nenhuma RELATORIOS_*: sem elas os hooks gerenciais ficam desabilitados e a
// verificação das datas seria vacuamente verde. A sessão desta spec concede as permissões de relatório.
const PERMISSOES_RELATORIOS = [
    'RELATORIOS_OPERACIONAIS_CONSULTAR',
    'RELATORIOS_VENDAS_CONSULTAR',
    'RELATORIOS_COMPRAS_CONSULTAR',
    'RELATORIOS_FINANCEIRO_CONSULTAR',
    'RELATORIOS_ESTOQUE_CONSULTAR',
    'RELATORIOS_FISCAL_CONSULTAR',
    'RELATORIOS_PRODUCAO_CONSULTAR',
    'RELATORIOS_DASHBOARD_CONSULTAR',
    'RELATORIOS_EXPORTAR'
];

test.describe('fixture — recusa de contrato', () => {
    test.beforeEach(async ({ page }) => {
        await mockApiRoutes(page);
        await page.goto('/login');
    });

    const get = (page: import('@playwright/test').Page, url: string) =>
        page.evaluate(async (alvo) => {
            const resposta = await fetch(alvo);
            const texto = await resposta.text();
            return { status: resposta.status, texto };
        }, url);

    const escopadas = [
        { rota: '/api/produtos', code: 'Produtos.EmpresaObrigatoria', operation: 'listar produtos' },
        { rota: '/api/pessoas', code: 'Pessoas.EmpresaObrigatoria', operation: 'listar pessoas' },
        { rota: '/api/clientes', code: 'Pessoas.EmpresaObrigatoria', operation: 'listar clientes' },
        { rota: '/api/fornecedores', code: 'Pessoas.EmpresaObrigatoria', operation: 'listar fornecedores' },
        { rota: '/api/financeiro/condicoes-pagamento', code: 'Financeiro.EmpresaObrigatoria', operation: 'listar condições de pagamento' }
    ];

    for (const { rota, code, operation } of escopadas) {
        test(`${rota} sem empresaId responde 400 ${code}`, async ({ page }) => {
            const resposta = await get(page, rota);
            expect(resposta.status).toBe(400);
            expect(JSON.parse(resposta.texto)).toEqual({ code, message: 'Empresa é obrigatória para operação multiempresa.', operation });
        });

        test(`${rota} com empresaId vazio responde 400 e com empresaId responde 200`, async ({ page }) => {
            expect((await get(page, `${rota}?empresaId=`)).status).toBe(400);
            expect((await get(page, `${rota}?empresaId=${EMPRESA}`)).status).toBe(200);
        });
    }

    const gerenciais = ['vendas', 'compras', 'financeiro', 'estoque', 'fiscal', 'producao', 'dashboard', 'exportar'];

    for (const area of gerenciais) {
        test(`/api/relatorios/gerenciais/${area} recusa data ISO completa e aceita yyyy-MM-dd`, async ({ page }) => {
            const base = `/api/relatorios/gerenciais/${area}?empresaId=${EMPRESA}`;
            const iso = await get(page, `${base}&dataInicial=2026-10-01T00:00:00.000Z&dataFinal=2026-10-31T23:59:59.999Z`);
            expect(iso.status).toBe(400);
            const corpo = JSON.parse(iso.texto) as { code: string; message: string };
            expect(corpo.code).toBe('Validation.InvalidRequest');
            expect(corpo.message).toContain("The value '2026-10-01T00:00:00.000Z' is not valid.");
            expect(corpo.message).toContain("The value '2026-10-31T23:59:59.999Z' is not valid.");

            const soDataFinalIso = await get(page, `${base}&dataInicial=2026-10-01&dataFinal=2026-10-31T23:59:59.999Z`);
            expect(soDataFinalIso.status).toBe(400);

            expect((await get(page, `${base}&dataInicial=2026-10-01&dataFinal=2026-10-31`)).status).toBe(200);
        });
    }

    test('/api/relatorios/operacional/geral CONTINUA aceitando inicio/fim em ISO completo', async ({ page }) => {
        const resposta = await get(page, `/api/relatorios/operacional/geral?empresaId=${EMPRESA}&inicio=2026-10-01T00:00:00.000Z&fim=2026-10-31T23:59:59.999Z`);
        expect(resposta.status).toBe(200);
    });
});

test.describe('páginas do recorte — nenhuma recusa de contrato durante o carregamento', () => {
    test.beforeEach(async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: [...ADMIN_PERMISSIONS, ...PERMISSOES_RELATORIOS] });
    });

    const paginas = [
        '/dashboard',
        '/relatorios',
        '/produtos',
        '/clientes',
        '/fornecedores',
        '/pessoas',
        '/tabelas-preco',
        '/financeiro/condicoes-pagamento',
        '/financeiro/contas-receber',
        '/compras/pedidos',
        '/vendas/pedidos'
    ];

    for (const rota of paginas) {
        test(`${rota} carrega sem listagem sem empresaId e sem data gerencial fora de yyyy-MM-dd`, async ({ page }) => {
            await page.goto(rota);
            await page.waitForLoadState('networkidle');

            expect(page.url()).toContain(rota);
            // Comparação por item: a mensagem lista cada requisição recusada, não um total.
            expect(recusasDeContratoDe(page)).toEqual([]);
        });
    }
});

test.describe('páginas de relatório — o que realmente sai na rede', () => {
    test.beforeEach(async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: [...ADMIN_PERMISSIONS, ...PERMISSOES_RELATORIOS] });
    });

    test('/dashboard consulta /api/relatorios/gerenciais/dashboard com dataInicial e dataFinal em yyyy-MM-dd', async ({ page }) => {
        const requisicao = page.waitForRequest((request) => request.method() === 'GET' && new URL(request.url()).pathname === '/api/relatorios/gerenciais/dashboard');
        await page.goto('/dashboard');
        const params = new URL((await requisicao).url()).searchParams;

        expect(params.get('empresaId')).toBe(EMPRESA);
        expect(params.get('dataInicial')).toMatch(DATE_ONLY);
        expect(params.get('dataFinal')).toMatch(DATE_ONLY);
        await page.waitForLoadState('networkidle');
        expect(recusasDeContratoDe(page)).toEqual([]);
    });

    test('/relatorios consulta cada área gerencial com yyyy-MM-dd e o operacional com ISO completo', async ({ page }) => {
        const areas = ['vendas', 'compras', 'financeiro', 'estoque', 'fiscal', 'producao'];
        const gerenciais = areas.map((area) => page.waitForRequest((request) => request.method() === 'GET' && new URL(request.url()).pathname === `/api/relatorios/gerenciais/${area}`));
        const operacional = page.waitForRequest((request) => request.method() === 'GET' && new URL(request.url()).pathname === '/api/relatorios/operacional/geral');
        await page.goto('/relatorios');

        const requisicoes = await Promise.all(gerenciais);
        areas.forEach((area, indice) => {
            const params = new URL(requisicoes[indice].url()).searchParams;
            expect(params.get('dataInicial'), `${area}: dataInicial`).toMatch(DATE_ONLY);
            expect(params.get('dataFinal'), `${area}: dataFinal`).toMatch(DATE_ONLY);
        });

        const paramsOperacional = new URL((await operacional).url()).searchParams;
        expect(paramsOperacional.get('inicio')).toMatch(ISO_COMPLETO);
        expect(paramsOperacional.get('fim')).toMatch(ISO_COMPLETO);
        await page.waitForLoadState('networkidle');
        expect(recusasDeContratoDe(page)).toEqual([]);
    });
});
