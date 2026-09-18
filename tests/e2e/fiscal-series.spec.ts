import { expect, Page, Route, test } from '@playwright/test';
import { ADMIN_PERMISSIONS, mockApiRoutes, writeSession } from './fixtures/logosoft';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const modeloNfeId = '55555555-5555-5555-5555-555555555555';
const serieId = '77777777-7777-7777-7777-777777777777';
const notaFiscalId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const modeloNfe = { id: modeloNfeId, codigo: '55', descricao: 'NF-e', sigla: 'NFE', ativo: true, motivoInativacao: null };
const serie = (ativa = true) => ({ id: serieId, empresaId, filialId, modeloDocumentoFiscalId: modeloNfeId, numero: 7, numeroInicial: 1, numeroFinal: 20, proximoNumero: 8, vigenciaInicio: '2026-01-01', vigenciaFim: null, ativa });
const paged = <T,>(items: T[]) => ({ items, totalItems: items.length, page: 1, pageSize: 20, totalPages: 1 });
const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

type SeriesState = { ativa: boolean; listUrls: URL[]; buracosGets: number; posts: Array<{ path: string; body: unknown }> };

const installSeriesRoutes = async (page: Page, state: SeriesState) => {
    await page.route('**/api/fiscal/series**', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname;
        if (request.method() === 'GET' && path === '/api/fiscal/series') {
            state.listUrls.push(url);
            return json(route, paged([serie(state.ativa)]));
        }
        if (request.method() === 'GET' && path === `/api/fiscal/series/${serieId}/buracos`) {
            state.buracosGets += 1;
            return json(route, { serieFiscalId: serieId, numero: 7, numeroInicial: 1, ultimoNumeroAlocado: 7, numerosSemDocumentoAutorizado: [3, 4] });
        }
        if (request.method() === 'POST') {
            const body = request.postDataJSON();
            state.posts.push({ path, body });
            if (path === `/api/fiscal/series/${serieId}/inativar`) {
                state.ativa = false;
                return route.fulfill({ status: 204 });
            }
            return json(route, serie(state.ativa));
        }
        return json(route, []);
    });
    await page.route('**/api/fiscal/modelos-documento**', async (route) => json(route, paged([modeloNfe])));
};

test.describe('E2E Séries fiscais', () => {
    test('E1: cria, amplia, consulta buracos e inativa uma série no contrato fiscal', async ({ page }) => {
        const state: SeriesState = { ativa: true, listUrls: [], buracosGets: 0, posts: [] };
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FISCAL_CONSULTAR', 'FISCAL_SERIES_CONSULTAR', 'FISCAL_SERIES_GERENCIAR', 'FISCAL_MODELOS_CONSULTAR'] });
        await installSeriesRoutes(page, state);

        await page.goto('/fiscal/series');
        await expect(page.getByRole('heading', { name: 'Séries fiscais' })).toBeVisible();
        await expect.poll(() => state.listUrls.length).toBe(1);
        expect(state.listUrls[0].searchParams.get('empresaId')).toBe(empresaId);
        expect(state.listUrls[0].searchParams.get('pagina')).toBe('1');
        expect(state.listUrls[0].searchParams.get('tamanhoPagina')).toBe('20');
        expect(state.listUrls[0].searchParams.get('somenteAtivas')).toBe('true');
        expect(state.buracosGets).toBe(0);

        await page.getByRole('button', { name: 'Nova série' }).click();
        const criar = page.getByRole('dialog', { name: 'Cadastrar série fiscal' });
        await criar.getByRole('button', { name: 'Buscar modelo de documento fiscal' }).click();
        await page.getByRole('option', { name: /55.*NF-e/i }).click();
        const numeros = criar.getByRole('spinbutton');
        await numeros.nth(0).fill('8');
        await numeros.nth(1).fill('1');
        await numeros.nth(2).fill('20');
        await criar.getByRole('button', { name: 'Cadastrar' }).click();
        await expect.poll(() => state.posts.find((post) => post.path === '/api/fiscal/series')?.body).toBeTruthy();
        const criarPayload = state.posts.find((post) => post.path === '/api/fiscal/series')?.body as Record<string, unknown>;
        expect(Object.keys(criarPayload).sort()).toEqual(['empresaId', 'filialId', 'modeloDocumentoFiscalId', 'numero', 'numeroFinal', 'numeroInicial', 'vigenciaFim', 'vigenciaInicio']);
        expect(criarPayload.vigenciaInicio).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        await page.getByRole('button', { name: 'Ampliar' }).click();
        const ampliar = page.getByRole('dialog', { name: 'Ampliar numeração da série' });
        await ampliar.getByRole('spinbutton').last().fill('30');
        await ampliar.getByRole('button', { name: 'Ampliar' }).click();
        await expect.poll(() => state.posts.find((post) => post.path.endsWith('/ampliar'))?.body).toEqual({ novoNumeroFinal: 30 });

        await page.getByRole('button', { name: 'Buracos' }).click();
        const buracos = page.getByRole('dialog', { name: 'Buracos da série fiscal 7' });
        await buracos.getByRole('button', { name: 'Consultar buracos' }).click();
        await expect.poll(() => state.buracosGets).toBe(1);
        await expect(buracos).toBeVisible();
        await page.getByRole('button', { name: 'Fechar' }).click();

        await page.getByRole('button', { name: 'Inativar' }).click();
        const inativar = page.getByRole('dialog', { name: 'Inativar série fiscal 7 (definitivo)' });
        await inativar.getByLabel('Motivo obrigatório').fill('Encerramento operacional da numeração.');
        await inativar.getByRole('button', { name: 'Inativar' }).click();
        await expect.poll(() => state.posts.find((post) => post.path.endsWith('/inativar'))?.body).toEqual({ motivo: 'Encerramento operacional da numeração.' });
        await expect(page.getByText('Inativa', { exact: true })).toBeVisible();
    });

    test('E2: consulta de séries não concede escrita', async ({ page }) => {
        let postCount = 0;
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FISCAL_CONSULTAR', 'FISCAL_SERIES_CONSULTAR'] });
        await page.route('**/api/fiscal/series**', async (route) => {
            if (route.request().method() === 'POST') postCount += 1;
            return json(route, route.request().method() === 'GET' ? paged([serie()]) : {});
        });
        await page.goto('/fiscal/series');
        await expect(page.getByRole('heading', { name: 'Séries fiscais' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Nova série' })).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Nova série' })).toHaveAttribute('title', 'Permissão necessária: FISCAL_SERIES_GERENCIAR.');
        await expect(page.getByRole('button', { name: 'Ampliar' })).toHaveCount(0);
        expect(postCount).toBe(0);
    });

    test('E3: rota de séries bloqueia sessão sem FISCAL_SERIES_* sem consultar a API', async ({ page }) => {
        let seriesGets = 0;
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FISCAL_CONSULTAR'] });
        await page.route('**/api/fiscal/series**', async (route) => {
            if (route.request().method() === 'GET') seriesGets += 1;
            return json(route, paged([]));
        });
        await page.goto('/dashboard');
        await expect(page.getByText('Séries fiscais', { exact: true })).toHaveCount(0);
        await page.goto('/fiscal/series');
        await expect(page.getByText('A rota Séries fiscais exige uma das permissões: FISCAL_SERIES_CONSULTAR, FISCAL_SERIES_GERENCIAR.')).toBeVisible();
        expect(seriesGets).toBe(0);
    });

    test('E4: combo de série da nova nota envia o número, não o id do cadastro', async ({ page }) => {
        let notaPayload: Record<string, unknown> | undefined;
        const state: SeriesState = { ativa: true, listUrls: [], buracosGets: 0, posts: [] };
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FISCAL_CONSULTAR', 'FISCAL_GERENCIAR', 'FISCAL_SERIES_CONSULTAR', 'FISCAL_MODELOS_CONSULTAR'] });
        await installSeriesRoutes(page, state);
        await page.route('**/api/fiscal/notas-fiscais', async (route) => {
            if (route.request().method() === 'POST') {
                notaPayload = route.request().postDataJSON() as Record<string, unknown>;
                return json(route, { id: notaFiscalId });
            }
            return route.fallback();
        });
        await page.goto('/fiscal/notas');
        await page.getByRole('button', { name: 'Nova manual' }).click();
        const dialog = page.getByRole('dialog', { name: 'Nova nota fiscal manual' });
        await dialog.getByRole('button', { name: 'Buscar empresa obrigatória' }).click();
        await page.getByRole('option', { name: /logosoft matriz/i }).click();
        await dialog.getByRole('button', { name: 'Buscar filial' }).click();
        await page.getByRole('option', { name: 'Filial atual' }).click();
        await dialog.getByRole('button', { name: 'Buscar série' }).click();
        await page.getByRole('option', { name: /Série 7 — próximo 8/i }).click();
        const numeroField = dialog.getByText('Número', { exact: true }).locator('..');
        await numeroField.getByRole('textbox').fill('900002');
        await dialog.getByRole('button', { name: 'Criar nota' }).click();
        await expect.poll(() => notaPayload?.serie).toBe('7');
        expect(notaPayload?.serie).not.toBe(serieId);
    });

    test('E5: ADMIN_PERMISSIONS preserva o campo de texto e não consulta séries', async ({ page }) => {
        let seriesGets = 0;
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ADMIN_PERMISSIONS });
        await page.route('**/api/fiscal/series**', async (route) => {
            if (route.request().method() === 'GET') seriesGets += 1;
            return json(route, paged([]));
        });
        await page.goto('/fiscal/notas');
        await page.getByRole('button', { name: 'Nova manual' }).click();
        const dialog = page.getByRole('dialog', { name: 'Nova nota fiscal manual' });
        await expect(dialog.getByText('Disponível com as permissões FISCAL_SERIES_CONSULTAR e FISCAL_MODELOS_CONSULTAR.')).toBeVisible();
        const serieField = dialog.getByText('Série', { exact: true }).locator('..');
        await expect(serieField.getByRole('textbox')).toHaveValue('1');
        expect(seriesGets).toBe(0);
    });

    test('E6: erro de validação por série ausente direciona ao cadastro', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FISCAL_CONSULTAR', 'FISCAL_GERENCIAR', 'FISCAL_SERIES_CONSULTAR'] });
        await page.route(`**/api/fiscal/notas-fiscais/${notaFiscalId}/validar`, async (route) => json(route, { code: 'Fiscal.SerieFiscalNaoCadastradaParaContexto', message: 'A série 7 não está cadastrada para esta empresa e filial.', traceId: 'e2e-fiscal-series' }, 400));
        await page.goto(`/fiscal/notas/${notaFiscalId}`);
        await page.getByRole('button', { name: 'Validar' }).click();
        await expect(page.getByText('Série fiscal não cadastrada para este contexto: A série 7 não está cadastrada para esta empresa e filial.')).toBeVisible();
        await page.getByRole('button', { name: 'Cadastrar série fiscal' }).click();
        await expect(page).toHaveURL(/\/fiscal\/series$/);
        await expect(page.getByRole('heading', { name: 'Séries fiscais' })).toBeVisible();
    });
});
