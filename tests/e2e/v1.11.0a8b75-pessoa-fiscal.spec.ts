import { expect, test, type Page, type Request, type Route } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

/**
 * v1.11.0a8b75 — Pessoa fiscal (D104): exercita a tela inteira, com API somente interceptada no Playwright.
 *
 * A resposta de cada PATCH é propositalmente diferente do GET seguinte: a tela precisa invalidar e reler a lista,
 * nunca aplicar a resposta da mutação sobre a foto aberta no diálogo (PF-4).
 *
 * Receita isolada: `npx next dev -p 3411`; depois
 * `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3411 npx playwright test --config=playwright.isolated.config.ts tests/e2e/v1.11.0a8b75-pessoa-fiscal.spec.ts`.
 */

const pessoaId = '66666666-6666-6666-6666-666666666666';
const enderecoId = 'b75b75b7-0000-4000-8000-0000000000b2';
const PESSOA_NOME = 'Cliente demonstração LTDA';
const S2 = ['PESSOAS_CONSULTAR', 'PESSOAS_GERENCIAR', 'PESSOAS_DADOS_FISCAIS_GERENCIAR', 'FISCAL_CADASTROS_CONSULTAR'];
const basePessoas = '/api/pessoas';
const baseEnderecos = `${basePessoas}/${pessoaId}/enderecos`;

const pessoa = (extra: Record<string, unknown> = {}) => ({
    id: pessoaId,
    empresaId: '11111111-1111-1111-1111-111111111111',
    filialId: '22222222-2222-2222-2222-222222222222',
    codigo: 'P001',
    tipoPessoa: 2,
    nomeRazaoSocial: PESSOA_NOME,
    nomeFantasia: 'Cliente demonstração',
    documento: '12ABC34501DE35',
    inscricaoEstadual: '123456789',
    inscricaoMunicipal: null,
    observacao: null,
    status: 1,
    indicadorContribuinteIcms: 3,
    indicadorIeDestinatario: 9,
    inscricaoEstadualSt: 'ST-ANTIGA',
    suframa: '123456789',
    regimeTributarioParceiro: 1,
    municipioIbgeId: null,
    paisId: null,
    bloqueada: false,
    motivoBloqueio: null,
    contribuinteIpi: false,
    tomadorOrgaoPublico: true,
    ...extra
});

const endereco = (extra: Record<string, unknown> = {}) => ({
    id: enderecoId,
    pessoaId,
    tipo: 1,
    logradouro: 'Rua Beta',
    numero: '20',
    complemento: null,
    bairro: 'Saúde',
    cidade: 'Rio de Janeiro',
    uf: 'RJ',
    cep: '20040002',
    principal: true,
    status: 1,
    municipioIbgeId: null,
    ...extra
});

const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

type Estado = { pessoas: ReturnType<typeof pessoa>[]; enderecos: ReturnType<typeof endereco>[]; escritas: Request[]; listasPessoas: number; listasEnderecos: number };

const instalarRotas = async (page: Page): Promise<Estado> => {
    const estado: Estado = { pessoas: [pessoa()], enderecos: [endereco()], escritas: [], listasPessoas: 0, listasEnderecos: 0 };
    await page.route(
        (url) => url.pathname === basePessoas || url.pathname.startsWith(`${basePessoas}/`) || url.pathname === '/api/fiscal/cadastros/municipios',
        (route) => {
            const request = route.request();
            const path = new URL(request.url()).pathname;
            if (request.method() === 'GET' && path === basePessoas) {
                estado.listasPessoas += 1;
                return json(route, estado.pessoas);
            }
            if (request.method() === 'GET' && path === baseEnderecos) {
                estado.listasEnderecos += 1;
                return json(route, estado.enderecos);
            }
            if (request.method() === 'GET' && path === '/api/fiscal/cadastros/municipios') {
                return json(route, { items: [{ id: 'municipio-rj', codigoIbge: '3304557', nome: 'Rio de Janeiro', ufSigla: 'RJ', ativo: true }], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 });
            }
            if (request.method() === 'PATCH' && path === `${baseEnderecos}/${enderecoId}/municipio`) {
                estado.escritas.push(request);
                estado.enderecos = [endereco({ municipioIbgeId: 'municipio-rj' })];
                return json(route, endereco({ id: 'resposta-mutacao-diferente' }));
            }
            if (request.method() === 'PATCH' && path === `${basePessoas}/${pessoaId}/dados-fiscais`) {
                estado.escritas.push(request);
                const body = request.postDataJSON() as Record<string, unknown>;
                estado.pessoas = [pessoa({ ...body, suframa: '987654321' })];
                return json(route, pessoa({ ...body, suframa: 'resposta-mutacao-diferente' }));
            }
            return route.fallback();
        }
    );
    return estado;
};

const abrirEdicao = async (page: Page) => {
    await page.goto('/pessoas');
    await expect(page.getByRole('heading', { name: 'Pessoas', exact: true })).toBeVisible();
    const linha = page.getByRole('row').filter({ has: page.getByRole('cell', { name: PESSOA_NOME, exact: true }) });
    await linha.getByRole('button', { name: 'Editar', exact: true }).click();
    const dialogo = page.getByRole('dialog', { name: 'Editar pessoa' });
    await expect(dialogo).toBeVisible();
    return dialogo;
};

const abrirDropdown = async (page: Page, placeholder: string) => {
    await page.getByRole('button', { name: placeholder, exact: true }).click();
};

test.describe('v1.11.0a8b75 — S2 completa o destinatário fiscal (AC-2 e AC-4)', () => {
    test('vincula município somente pela busca filtrada pela UF e relê a lista de endereços', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: S2, email: 'pessoa-fiscal-b75@logosoft.local', name: 'Pessoa Fiscal B75' });
        const estado = await instalarRotas(page);
        const dialogoPessoa = await abrirEdicao(page);
        await dialogoPessoa.getByRole('tab', { name: 'Endereços', exact: true }).click();
        const tabela = dialogoPessoa.getByRole('region', { name: 'Endereços da pessoa' });
        await expect(tabela).toBeVisible();
        await expect.poll(() => estado.listasEnderecos).toBe(1);

        await tabela.getByRole('button', { name: 'Vincular município do endereço Rua Beta, 20' }).click();
        const dialogo = page.getByRole('dialog', { name: 'Vincular município' });
        await expect(dialogo).toBeVisible();
        await abrirDropdown(page, 'Selecione o município');
        await page.getByRole('option', { name: 'Rio de Janeiro', exact: true }).click();
        await dialogo.getByRole('button', { name: 'Vincular', exact: true }).click();

        await expect(dialogo).toBeHidden();
        expect(estado.escritas).toHaveLength(1);
        expect(estado.escritas[0].method()).toBe('PATCH');
        expect(new URL(estado.escritas[0].url()).pathname).toBe(`${baseEnderecos}/${enderecoId}/municipio`);
        expect(estado.escritas[0].postDataJSON()).toEqual({ municipioIbgeCodigo: '3304557' });
        await expect.poll(() => estado.listasEnderecos).toBe(2);
        await expect(tabela.getByText('Vinculado', { exact: true })).toBeVisible();
    });

    test('edita um campo fiscal mas envia os oito, e a aba recarrega a pessoa pelo GET', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: S2, email: 'pessoa-fiscal-b75@logosoft.local', name: 'Pessoa Fiscal B75' });
        const estado = await instalarRotas(page);
        const dialogoPessoa = await abrirEdicao(page);
        await dialogoPessoa.getByRole('tab', { name: 'Dados fiscais', exact: true }).click();
        await dialogoPessoa.getByLabel('Inscrição SUFRAMA').fill('111222333');
        await dialogoPessoa.getByRole('button', { name: 'Salvar dados fiscais', exact: true }).click();

        await expect.poll(() => estado.escritas).toHaveLength(1);
        const patch = estado.escritas[0];
        expect(new URL(patch.url()).pathname).toBe(`${basePessoas}/${pessoaId}/dados-fiscais`);
        expect(patch.postDataJSON()).toEqual({
            indicadorContribuinteIcms: 3,
            inscricaoEstadualSt: 'ST-ANTIGA',
            suframa: '111222333',
            regimeTributarioParceiro: 1,
            municipioIbgeCodigo: null,
            paisCodigoBacen: null,
            contribuinteIpi: false,
            tomadorOrgaoPublico: true
        });
        await expect.poll(() => estado.listasPessoas).toBeGreaterThan(1);
        await expect(dialogoPessoa.getByLabel('Inscrição SUFRAMA')).toHaveValue('987654321');
    });
});
