import { expect, test, type Locator, type Page, type Request, type Route } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

/**
 * v1.11.0a8b72 — Naturezas de operação: AC-2, AC-3, AC-4, AC-5, AC-6 e AC-7 na tela real.
 *
 * Os textos esperados estão copiados literalmente da produção de propósito (`naturezasOperacaoLabels.ts`):
 * importar a constante faria o teste concordar com qualquer valor que ela tivesse.
 *
 * Tudo mockado: `mockApiRoutes` cobre o shell (auth, /me, empresas, filiais); as rotas desta spec são
 * registradas DEPOIS e, por isso, têm precedência.
 *
 * Execução (receita do CLAUDE.md — um servidor só, porta 3411):
 *   npx next dev -p 3411
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3411 npx playwright test --config=playwright.isolated.config.ts tests/e2e/v1.11.0a8b72-naturezas-operacao.spec.ts
 */

const empresaId = '11111111-1111-1111-1111-111111111111';

const NATUREZA_VENDA_ID = 'b72b72b7-0000-4000-8000-0000000000a1';
const NATUREZA_REMESSA_ID = 'b72b72b7-0000-4000-8000-0000000000a2';
const NATUREZA_CRIADA_ID = 'b72b72b7-0000-4000-8000-0000000000a3';
const CFOP_5102_ID = 'b72b72b7-0000-4000-8000-0000000000c1';
const CFOP_6102_ID = 'b72b72b7-0000-4000-8000-0000000000c2';
const CFOP_5405_ID = 'b72b72b7-0000-4000-8000-0000000000c3';

// Sessões do plano (§5): S1 só consultar; S2 consultar + gerenciar; S4 nenhuma das duas (com FISCAL_CONSULTAR).
const S1 = ['FISCAL_CONSULTAR', 'FISCAL_CADASTROS_CONSULTAR'];
const S2 = ['FISCAL_CONSULTAR', 'FISCAL_CADASTROS_CONSULTAR', 'FISCAL_CADASTROS_GERENCIAR'];
const S4 = ['FISCAL_CONSULTAR'];

// Textos de `naturezasOperacaoLabels.ts` e de `routePermissions.ts`.
const TITULO = 'Naturezas de operação';
const NOVA_NATUREZA = 'Nova natureza';
const NOVA_SEM_GERENCIAR = 'Permissão necessária: FISCAL_CADASTROS_GERENCIAR.';
const CRIAR_DIALOG = 'Cadastrar natureza de operação';
const EDITAR_DIALOG = (codigo: string) => `Editar natureza de operação ${codigo}`;
const INATIVAR_DIALOG = (codigo: string) => `Inativar natureza de operação ${codigo} (definitivo)`;
const VAZIO_FILTRADO_TITULO = 'Nenhuma natureza ativa encontrada';
const VAZIO_FILTRADO_DESCRICAO = 'Não há natureza ativa nesta empresa. Cadastre uma natureza de operação ou mude a situação para Todas para ver as inativas.';
const ROTA_NEGADA = 'A rota Naturezas de operação exige uma das permissões: FISCAL_CADASTROS_CONSULTAR, FISCAL_CADASTROS_GERENCIAR.';

// Enums numéricos do C# (sem JsonStringEnumConverter), conferidos em `naturezasOperacaoLabels.ts`.
const AMBITO = { Interno: 1, Interestadual: 2 } as const;
const TIPO_ITEM = { Revenda: 1 } as const;
const TIPO_CFOP_SAIDA = 2;

type Mapeamento = { ambito: number; cfopId: string; cfopCodigo: string; tipoItem: number | null };

// Formato do record C# `NaturezaOperacaoResponse` (NaturezaOperacaoContracts.cs:53-68), 15 campos.
const natureza = (id: string, codigo: string, descricao: string, cfops: Mapeamento[], tipoOperacao = 1) => ({
    id,
    empresaId,
    filialId: null as string | null,
    codigo,
    descricao,
    tipoDocumento: 1,
    tipoOperacao,
    finalidade: 1,
    indicadorPresencaComprador: 1,
    indicadorConsumidorFinal: false,
    movimentaEstoque: true,
    geraFinanceiro: true,
    observacao: null as string | null,
    ativa: true,
    cfops
});
type Natureza = ReturnType<typeof natureza>;

// Três mapeamentos, um deles com tipoItem (Revenda) e dois genéricos (tipoItem nulo = "Qualquer item").
const MAPEAMENTOS_VENDA: Mapeamento[] = [
    { ambito: AMBITO.Interno, cfopId: CFOP_5102_ID, cfopCodigo: '5102', tipoItem: null },
    { ambito: AMBITO.Interestadual, cfopId: CFOP_6102_ID, cfopCodigo: '6102', tipoItem: null },
    { ambito: AMBITO.Interno, cfopId: CFOP_5405_ID, cfopCodigo: '5405', tipoItem: TIPO_ITEM.Revenda }
];

// Formato do record C# `CfopResumoResponse` (lido pelo `cfopResumoResponseSchema`).
const CFOPS = [
    { id: CFOP_5102_ID, codigo: '5102', descricao: 'Venda de mercadoria adquirida de terceiros', tipo: TIPO_CFOP_SAIDA, ambito: AMBITO.Interno, ativo: true },
    { id: CFOP_5405_ID, codigo: '5405', descricao: 'Venda de mercadoria com ST', tipo: TIPO_CFOP_SAIDA, ambito: AMBITO.Interno, ativo: true },
    { id: CFOP_6102_ID, codigo: '6102', descricao: 'Venda interestadual de mercadoria adquirida', tipo: TIPO_CFOP_SAIDA, ambito: AMBITO.Interestadual, ativo: true }
];

const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
// Formato do record C# `PagedResult<T>` (Erp.Shared/Kernel/PagedResult.cs).
const paged = <T>(items: T[]) => ({ items, page: 1, pageSize: 20, totalItems: items.length, totalPages: items.length ? 1 : 0, hasPreviousPage: false, hasNextPage: false });

type Estado = {
    naturezas: Natureza[];
    listas: URL[];
    buscasCfop: URL[];
    posts: Request[];
    puts: Request[];
    inativacoes: Request[];
};

const instalarRotas = async (page: Page, naturezas: Natureza[]): Promise<Estado> => {
    const estado: Estado = { naturezas, listas: [], buscasCfop: [], posts: [], puts: [], inativacoes: [] };

    await page.route(
        (url) => url.pathname.startsWith('/api/fiscal/naturezas-operacao'),
        (route) => {
            const request = route.request();
            const url = new URL(request.url());
            const path = url.pathname;
            if (request.method() === 'GET' && path === '/api/fiscal/naturezas-operacao') {
                estado.listas.push(url);
                const somenteAtivas = url.searchParams.get('somenteAtivas') === 'true';
                return json(route, paged(estado.naturezas.filter((item) => !somenteAtivas || item.ativa)));
            }
            if (request.method() === 'POST' && path === '/api/fiscal/naturezas-operacao') {
                estado.posts.push(request);
                const body = request.postDataJSON() as Record<string, any>;
                const criada: Natureza = {
                    ...natureza(NATUREZA_CRIADA_ID, String(body.codigo).toUpperCase(), body.descricao, []),
                    ...body,
                    id: NATUREZA_CRIADA_ID,
                    codigo: String(body.codigo).toUpperCase(),
                    ativa: true,
                    cfops: (body.cfops as { ambito: number; cfopCodigo: string; tipoItem: number | null }[]).map((item) => ({
                        ambito: item.ambito,
                        cfopCodigo: item.cfopCodigo,
                        tipoItem: item.tipoItem,
                        cfopId: CFOPS.find((cfop) => cfop.codigo === item.cfopCodigo)?.id ?? CFOP_5102_ID
                    }))
                };
                estado.naturezas = [...estado.naturezas, criada];
                return json(route, criada, 201);
            }
            const alvo = estado.naturezas.find((item) => path.startsWith(`/api/fiscal/naturezas-operacao/${item.id}`));
            if (alvo && request.method() === 'PUT' && path === `/api/fiscal/naturezas-operacao/${alvo.id}`) {
                estado.puts.push(request);
                const body = request.postDataJSON() as Record<string, any>;
                const atualizada: Natureza = { ...alvo, descricao: body.descricao };
                estado.naturezas = estado.naturezas.map((item) => (item.id === alvo.id ? atualizada : item));
                return json(route, atualizada);
            }
            if (alvo && request.method() === 'POST' && path === `/api/fiscal/naturezas-operacao/${alvo.id}/inativar`) {
                estado.inativacoes.push(request);
                estado.naturezas = estado.naturezas.map((item) => (item.id === alvo.id ? { ...item, ativa: false } : item));
                // `inativar` devolve 204 sem corpo (`NaturezasOperacaoController.cs:106-120`).
                return route.fulfill({ status: 204, body: '' });
            }
            return route.fallback();
        }
    );

    await page.route(
        (url) => url.pathname === '/api/fiscal/cadastros/cfop',
        (route) => {
            const url = new URL(route.request().url());
            estado.buscasCfop.push(url);
            const ambito = Number(url.searchParams.get('ambito'));
            return json(route, paged(CFOPS.filter((cfop) => !ambito || cfop.ambito === ambito)));
        }
    );

    return estado;
};

const sessao = async (page: Page, permissions: string[]) => {
    await mockApiRoutes(page);
    await writeSession(page, { permissions, email: 'fiscal-b72@logosoft.local', name: 'Fiscal B72' });
};

// Dropdown do PrimeReact pelo `inputId`: o clique vai no contêiner, a opção é escolhida pelo papel.
const escolher = async (page: Page, dropdown: Locator, opcao: string | RegExp) => {
    await dropdown.click();
    await page.getByRole('option', { name: opcao, exact: typeof opcao === 'string' }).click();
};
const dropdownPorInputId = (escopo: Locator, inputId: string) => escopo.locator(`.p-dropdown:has(#${inputId})`);

const linhaDaTabela = (page: Page, codigo: string) => page.getByRole('row').filter({ has: page.getByRole('cell', { name: codigo, exact: true }) });

test.describe('v1.11.0a8b72 — S2 opera naturezas de operação (AC-4, AC-5, AC-6, AC-7)', () => {
    test('(a) S2 abre pelo menu Fiscal, cria com 2 linhas de CFOP e o POST leva cfops completo com tipoItem', async ({ page }) => {
        await sessao(page, S2);
        const estado = await instalarRotas(page, []);

        await page.goto('/dashboard');
        const grupoFiscal = page.locator('li.layout-root-menuitem').filter({ has: page.locator('.layout-menuitem-root-text', { hasText: /^Fiscal$/ }) });
        await grupoFiscal.getByRole('link', { name: /Naturezas de operação$/ }).click();
        await expect(page).toHaveURL(/\/fiscal\/naturezas-operacao$/);
        await expect(page.getByRole('heading', { name: TITULO, exact: true })).toBeVisible();
        await expect.poll(() => estado.listas.length).toBeGreaterThan(0);
        expect(estado.listas[0].searchParams.get('empresaId')).toBe(empresaId);

        await page.getByRole('button', { name: NOVA_NATUREZA }).first().click();
        const dialog = page.getByRole('dialog', { name: CRIAR_DIALOG });
        await expect(dialog).toBeVisible();

        await dialog.getByLabel('Código', { exact: true }).fill('venda-b72');
        await dialog.getByLabel('Descrição', { exact: true }).fill('Venda de mercadoria B72');
        await dialog.getByLabel('Observação (opcional)', { exact: true }).fill('Criada no E2E da b72.');
        await escolher(page, dropdownPorInputId(dialog, 'naturezaTipoDocumento'), 'NF-e');
        await escolher(page, dropdownPorInputId(dialog, 'naturezaTipoOperacao'), 'Venda');
        await escolher(page, dropdownPorInputId(dialog, 'naturezaFinalidade'), 'Normal');
        await escolher(page, dropdownPorInputId(dialog, 'naturezaPresenca'), 'Presencial');

        // Duas linhas: a 1ª nasce Interno × Qualquer item; a 2ª, Interestadual × Qualquer item (primeira combinação livre).
        await dialog.getByRole('button', { name: 'Adicionar CFOP' }).click();
        await dialog.getByRole('button', { name: 'Adicionar CFOP' }).click();
        const linhas = dialog.getByTestId('natureza-cfop-linha');
        await expect(linhas).toHaveCount(2);

        // Linha 2: tipo de item Revenda (o tipoItem precisa chegar ao body como 1, não sumir).
        await escolher(page, linhas.nth(1).locator('.p-dropdown:has([id^="naturezaCfopTipoItem-"])'), 'Revenda');

        await escolher(page, linhas.nth(0).locator('[id^="naturezaCfop-"]'), /^5102 — Venda de mercadoria adquirida de terceiros$/);
        await escolher(page, linhas.nth(1).locator('[id^="naturezaCfop-"]'), /^6102 — Venda interestadual/);

        // AC-5: a busca de CFOP da linha filtra por âmbito, e Venda -> tipo Saída (emenda da D98).
        expect(estado.buscasCfop.some((url) => url.searchParams.get('ambito') === String(AMBITO.Interno) && url.searchParams.get('tipo') === String(TIPO_CFOP_SAIDA))).toBe(true);
        expect(estado.buscasCfop.some((url) => url.searchParams.get('ambito') === String(AMBITO.Interestadual) && url.searchParams.get('tipo') === String(TIPO_CFOP_SAIDA))).toBe(true);

        const postPromise = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/fiscal/naturezas-operacao');
        await dialog.getByRole('button', { name: 'Cadastrar', exact: true }).click();
        const body = (await postPromise).postDataJSON() as Record<string, unknown>;

        expect(Object.keys(body).sort()).toEqual(
            ['cfops', 'codigo', 'descricao', 'empresaId', 'filialId', 'finalidade', 'geraFinanceiro', 'indicadorConsumidorFinal', 'indicadorPresencaComprador', 'movimentaEstoque', 'observacao', 'tipoDocumento', 'tipoOperacao'].sort()
        );
        expect(body.empresaId).toBe(empresaId);
        expect(body.filialId).toBeNull();
        expect(body.codigo).toBe('venda-b72');
        expect(body.tipoDocumento).toBe(1);
        expect(body.tipoOperacao).toBe(1);
        // Item a item: âmbito, código do CFOP (nunca o id) e tipoItem, com a chave presente mesmo quando nula.
        const cfops = body.cfops as Record<string, unknown>[];
        expect(cfops).toHaveLength(2);
        expect(cfops[0]).toEqual({ ambito: AMBITO.Interno, cfopCodigo: '5102', tipoItem: null });
        expect(cfops[1]).toEqual({ ambito: AMBITO.Interestadual, cfopCodigo: '6102', tipoItem: TIPO_ITEM.Revenda });
        cfops.forEach((item) => expect(Object.keys(item)).toContain('tipoItem'));

        await expect(dialog).toBeHidden();
        await expect(linhaDaTabela(page, 'VENDA-B72')).toBeVisible();
    });

    test('(b) S2 edita só a descrição e o PUT reenvia todos os mapeamentos carregados', async ({ page }) => {
        await sessao(page, S2);
        const estado = await instalarRotas(page, [natureza(NATUREZA_VENDA_ID, 'VENDA-INT', 'Venda interna', MAPEAMENTOS_VENDA)]);

        await page.goto('/fiscal/naturezas-operacao');
        const linha = linhaDaTabela(page, 'VENDA-INT');
        await expect(linha).toBeVisible();
        await linha.getByRole('button', { name: 'Editar' }).click();

        const dialog = page.getByRole('dialog', { name: EDITAR_DIALOG('VENDA-INT') });
        await expect(dialog).toBeVisible();
        // O formulário carregou as 3 linhas da resposta antes de salvar.
        await expect(dialog.getByTestId('natureza-cfop-linha')).toHaveCount(3);
        await expect(dialog.getByLabel('Código', { exact: true })).toBeDisabled();

        const descricao = dialog.getByLabel('Descrição', { exact: true });
        await descricao.fill('Venda interna revisada');

        const putPromise = page.waitForRequest((request) => request.method() === 'PUT' && request.url().includes(`/api/fiscal/naturezas-operacao/${NATUREZA_VENDA_ID}`));
        await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
        const body = (await putPromise).postDataJSON() as Record<string, unknown>;

        expect(body.descricao).toBe('Venda interna revisada');
        // 10 campos do AtualizarNaturezaOperacaoRequest: sem empresa, filial e código.
        expect(Object.keys(body)).not.toContain('codigo');
        expect(Object.keys(body)).not.toContain('empresaId');
        expect(Object.keys(body)).not.toContain('filialId');
        // Nunca `cfops: null` (preservaria em silêncio) nem lista parcial (apagaria): a lista inteira, item a item.
        expect(body.cfops).not.toBeNull();
        expect(body.cfops).toEqual(MAPEAMENTOS_VENDA.map(({ ambito, cfopCodigo, tipoItem }) => ({ ambito, cfopCodigo, tipoItem })));
        expect(estado.puts).toHaveLength(1);

        await expect(dialog).toBeHidden();
        await expect(linhaDaTabela(page, 'VENDA-INT')).toContainText('Venda interna revisada');
    });

    test('(c) S2 inativa com motivo, recebe 204 e a lista refaz a consulta', async ({ page }) => {
        await sessao(page, S2);
        const estado = await instalarRotas(page, [
            natureza(NATUREZA_VENDA_ID, 'VENDA-INT', 'Venda interna', MAPEAMENTOS_VENDA),
            natureza(NATUREZA_REMESSA_ID, 'REMESSA', 'Remessa para conserto', [], 4)
        ]);

        await page.goto('/fiscal/naturezas-operacao');
        const linha = linhaDaTabela(page, 'VENDA-INT');
        await expect(linha).toBeVisible();
        await expect(linhaDaTabela(page, 'REMESSA')).toBeVisible();
        const listasAntes = estado.listas.length;

        await linha.getByRole('button', { name: 'Inativar' }).click();
        const dialog = page.getByRole('dialog', { name: INATIVAR_DIALOG('VENDA-INT') });
        await expect(dialog).toBeVisible();
        const confirmar = dialog.getByRole('button', { name: 'Inativar', exact: true });
        // Sem motivo, a ação não sai.
        await expect(confirmar).toBeDisabled();
        await dialog.getByLabel('Motivo obrigatório').fill('Natureza substituída pela VENDA-SP.');
        await confirmar.click();

        await expect.poll(() => estado.inativacoes.length).toBe(1);
        expect(estado.inativacoes[0].postDataJSON()).toEqual({ motivo: 'Natureza substituída pela VENDA-SP.' });
        await expect(dialog).toBeHidden();

        // A lista refez a consulta (filtro Ativas) e a inativada saiu; a outra continua.
        await expect.poll(() => estado.listas.length).toBeGreaterThan(listasAntes);
        expect(estado.listas[estado.listas.length - 1].searchParams.get('somenteAtivas')).toBe('true');
        await expect(linhaDaTabela(page, 'VENDA-INT')).toHaveCount(0);
        await expect(linhaDaTabela(page, 'REMESSA')).toBeVisible();
    });
});

test.describe('v1.11.0a8b72 — permissões e vazio (AC-2, AC-3)', () => {
    test('(d) S1 vê a lista sem Nova natureza habilitada e sem Editar/Inativar', async ({ page }) => {
        await sessao(page, S1);
        const estado = await instalarRotas(page, [natureza(NATUREZA_VENDA_ID, 'VENDA-INT', 'Venda interna', MAPEAMENTOS_VENDA)]);

        await page.goto('/fiscal/naturezas-operacao');
        const linha = linhaDaTabela(page, 'VENDA-INT');
        await expect(linha).toBeVisible();
        await expect(linha).toContainText('Venda interna');

        // Padrão de Séries (D48): o botão do cabeçalho fica, desabilitado, com o motivo no title.
        const nova = page.getByRole('button', { name: NOVA_NATUREZA });
        await expect(nova).toBeDisabled();
        await expect(nova).toHaveAttribute('title', NOVA_SEM_GERENCIAR);
        await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Inativar' })).toHaveCount(0);
        expect(estado.posts).toHaveLength(0);
        expect(estado.puts).toHaveLength(0);
        expect(estado.inativacoes).toHaveLength(0);
    });

    test('(e) S4 não vê o item de menu e a rota nega sem consultar a API', async ({ page }) => {
        await sessao(page, S4);
        const estado = await instalarRotas(page, [natureza(NATUREZA_VENDA_ID, 'VENDA-INT', 'Venda interna', MAPEAMENTOS_VENDA)]);

        await page.goto('/dashboard');
        const grupoFiscal = page.locator('li.layout-root-menuitem').filter({ has: page.locator('.layout-menuitem-root-text', { hasText: /^Fiscal$/ }) });
        // Controle positivo: o grupo Fiscal aparece para S4 (FISCAL_CONSULTAR), com Notas fiscais.
        await expect(grupoFiscal.getByRole('link', { name: /Notas fiscais$/ })).toBeVisible();
        await expect(page.locator('a[href="/fiscal/naturezas-operacao"]')).toHaveCount(0);

        await page.goto('/fiscal/naturezas-operacao');
        await expect(page.getByText(ROTA_NEGADA, { exact: true })).toBeVisible();
        expect(estado.listas).toHaveLength(0);
    });

    test('(f) empresa com 0 naturezas e filtro Ativas mostra o texto com o próximo passo', async ({ page }) => {
        await sessao(page, S2);
        const estado = await instalarRotas(page, []);

        await page.goto('/fiscal/naturezas-operacao');
        await expect(page.getByRole('heading', { name: VAZIO_FILTRADO_TITULO, exact: true })).toBeVisible();
        await expect(page.getByText(VAZIO_FILTRADO_DESCRICAO, { exact: true })).toBeVisible();
        // O vazio é filtrado: a consulta levou empresaId e somenteAtivas=true.
        const ultima = estado.listas[estado.listas.length - 1];
        expect(ultima.searchParams.get('empresaId')).toBe(empresaId);
        expect(ultima.searchParams.get('somenteAtivas')).toBe('true');
        // O próximo passo é acionável para S2: há "Nova natureza" habilitado no próprio vazio, além do cabeçalho.
        await expect(page.getByRole('button', { name: NOVA_NATUREZA })).toHaveCount(2);
        await page.getByRole('button', { name: NOVA_NATUREZA }).last().click();
        await expect(page.getByRole('dialog', { name: CRIAR_DIALOG })).toBeVisible();
    });
});
