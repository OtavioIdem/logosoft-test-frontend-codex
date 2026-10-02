import { expect, test, type Locator, type Page, type Request, type Route } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

/**
 * v1.11.0a8b73 — Endereços da Pessoa (D102): AC-4, AC-5 e AC-6 na tela real.
 *
 * Os textos esperados estão copiados literalmente da produção de propósito (`pessoaEnderecosLabels.ts`):
 * importar a constante faria o teste concordar com qualquer valor que ela tivesse.
 *
 * Tudo mockado: `mockApiRoutes` cobre o shell (auth, /me, empresas, pessoas). A fixture responde a QUALQUER
 * `/api/pessoas*` com o array de pessoas (`fixtures/logosoft.ts:741`), inclusive `GET …/enderecos`; a rota de
 * endereços desta spec é registrada DEPOIS e, por isso, tem precedência.
 *
 * A resposta de toda mutação é deliberadamente DIFERENTE do que o GET seguinte devolve (EP-5/EP-6): se a tela
 * remendasse a lista com a resposta, "Rua Resposta Da Mutacao" apareceria e o endereço relido não.
 *
 * Execução (receita do CLAUDE.md — um servidor só, porta 3411):
 *   npx next dev -p 3411
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3411 npx playwright test --config=playwright.isolated.config.ts tests/e2e/v1.11.0a8b73-endereco-pessoa.spec.ts
 */

// Pessoa da fixture (`fixtures/logosoft.ts:180,208-210`).
const pessoaId = '66666666-6666-6666-6666-666666666666';
const PESSOA_NOME = 'Cliente demonstração LTDA';

const ID_ALFA = 'b73b73b7-0000-4000-8000-0000000000a1';
const ID_BETA = 'b73b73b7-0000-4000-8000-0000000000b2';
const ID_CRIADO = 'b73b73b7-0000-4000-8000-0000000000c3';
const ID_RESPOSTA = 'b73b73b7-0000-4000-8000-0000000000ff';
const MUNICIPIO_SP = 'b73b73b7-0000-4000-8000-000000003550';

// Sessão S2 do plano (§5): PESSOAS_CONSULTAR + PESSOAS_GERENCIAR.
const S2 = ['PESSOAS_CONSULTAR', 'PESSOAS_GERENCIAR'];

// Textos de `pessoaEnderecosLabels.ts`, copiados.
const ABA = 'Endereços';
const TABELA_ARIA = 'Endereços da pessoa';
const NOVO_ENDERECO = 'Novo endereço';
const MARCA_PRINCIPAL = 'Principal';
const EDITAR_ARIA = (linha: string) => `Editar endereço ${linha}`;
const PRINCIPAL_ARIA = (linha: string) => `Marcar como principal o endereço ${linha}`;
const EXCLUIR_ARIA = (linha: string) => `Excluir endereço ${linha}`;
const EXCLUIR_TITULO = (linha: string) => `Excluir endereço ${linha} (definitivo)`;
const AVISO_PROMOCAO = 'Este é o endereço principal. Ao excluir, o sistema escolhe outro endereço da pessoa como principal, sem ordem definida: confira na lista qual passou a valer na nota fiscal.';
const AVISO_UF_COM_VINCULO = 'Ao trocar a UF, o vínculo do município fiscal deste endereço será removido. Será preciso vincular o município de novo.';
const TOAST_PRINCIPAL = 'Endereço marcado como principal. Ele passa a ser o usado na nota fiscal.';
const TOAST_EXCLUIDO_PROMOVIDO = 'Endereço principal excluído. O sistema escolheu outro endereço como principal: confira a lista.';

const NOVE_CAMPOS = ['bairro', 'cep', 'cidade', 'complemento', 'logradouro', 'numero', 'principal', 'tipo', 'uf'];

// Formato do record C# `EnderecoPessoaResponse` (lido pelo `enderecoPessoaResponseSchema`), enums numéricos.
const endereco = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    pessoaId,
    tipo: 1,
    logradouro: 'Rua',
    numero: '1',
    complemento: null as string | null,
    bairro: 'Centro',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01310100',
    principal: false,
    status: 1,
    municipioIbgeId: null as string | null,
    ...extra
});
type Endereco = ReturnType<typeof endereco>;

// Alfa: principal, com município vinculado. Beta: sem vínculo.
const alfa = (extra: Record<string, unknown> = {}) => endereco(ID_ALFA, { logradouro: 'Rua Alfa', numero: '10', principal: true, municipioIbgeId: MUNICIPIO_SP, ...extra });
const beta = (extra: Record<string, unknown> = {}) => endereco(ID_BETA, { logradouro: 'Rua Beta', numero: '20', bairro: 'Saúde', cidade: 'Rio de Janeiro', uf: 'RJ', cep: '20040002', ...extra });
const respostaDaMutacao = () => endereco(ID_RESPOSTA, { logradouro: 'Rua Resposta Da Mutacao', numero: '999', principal: true });

const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

type Estado = { enderecos: Endereco[]; listas: number; escritas: Request[] };

const base = `/api/pessoas/${pessoaId}/enderecos`;

/**
 * Servidor de endereços em memória com as regras do backend que a tela precisa respeitar: o POST cria, o
 * `…/principal` troca a marca, o DELETE remove e promove outro quando o removido era o principal (EP-6).
 */
const instalarRotas = async (page: Page, enderecos: Endereco[]): Promise<Estado> => {
    const estado: Estado = { enderecos, listas: 0, escritas: [] };

    await page.route(
        (url) => url.pathname === base || url.pathname.startsWith(`${base}/`),
        (route) => {
            const request = route.request();
            const path = new URL(request.url()).pathname;
            const method = request.method();
            if (method === 'GET' && path === base) {
                estado.listas += 1;
                return json(route, estado.enderecos);
            }
            if (method === 'POST' && path === base) {
                estado.escritas.push(request);
                const body = request.postDataJSON() as Record<string, unknown>;
                const criado = endereco(ID_CRIADO, { ...body, principal: Boolean(body.principal) || estado.enderecos.length === 0 });
                estado.enderecos = [...estado.enderecos, criado];
                return json(route, respostaDaMutacao(), 201);
            }
            const principal = path.match(new RegExp(`^${base}/([^/]+)/principal$`));
            if (method === 'POST' && principal) {
                estado.escritas.push(request);
                estado.enderecos = estado.enderecos.map((item) => ({ ...item, principal: item.id === principal[1] }));
                return json(route, respostaDaMutacao());
            }
            const unico = path.match(new RegExp(`^${base}/([^/]+)$`));
            if (method === 'PUT' && unico) {
                estado.escritas.push(request);
                const body = request.postDataJSON() as Record<string, unknown>;
                estado.enderecos = estado.enderecos.map((item) => (item.id === unico[1] ? { ...item, ...body } : item));
                return json(route, respostaDaMutacao());
            }
            if (method === 'DELETE' && unico) {
                estado.escritas.push(request);
                const removido = estado.enderecos.find((item) => item.id === unico[1]);
                const restantes = estado.enderecos.filter((item) => item.id !== unico[1]);
                estado.enderecos = removido?.principal && restantes.length ? restantes.map((item, index) => ({ ...item, principal: index === 0 })) : restantes;
                return route.fulfill({ status: 204, body: '' });
            }
            return route.fallback();
        }
    );

    return estado;
};

const sessaoS2 = async (page: Page) => {
    await mockApiRoutes(page);
    await writeSession(page, { permissions: S2, email: 'pessoas-b73@logosoft.local', name: 'Pessoas B73' });
};

/** S2 abre /pessoas, edita a pessoa da fixture e vai à aba Endereços; devolve o diálogo da Pessoa. */
const abrirAbaEnderecos = async (page: Page, estado: Estado) => {
    await page.goto('/pessoas');
    await expect(page.getByRole('heading', { name: 'Pessoas', exact: true })).toBeVisible();
    const linhaPessoa = page.getByRole('row').filter({ has: page.getByRole('cell', { name: PESSOA_NOME, exact: true }) });
    await linhaPessoa.getByRole('button', { name: 'Editar', exact: true }).click();
    const dialogoPessoa = page.getByRole('dialog', { name: 'Editar pessoa' });
    await expect(dialogoPessoa).toBeVisible();
    await dialogoPessoa.getByRole('tab', { name: ABA }).click();
    await expect(dialogoPessoa.getByRole('region', { name: TABELA_ARIA })).toBeVisible();
    await expect.poll(() => estado.listas).toBe(1);
    return dialogoPessoa;
};

// O locator interno do `has` é consultado DENTRO da linha: por isso parte de `page`, não do escopo.
const linhaEndereco = (escopo: Locator, linha: string) => escopo.getByRole('row').filter({ has: escopo.page().getByRole('cell', { name: linha, exact: true }) });

// Dropdown do PrimeReact pelo `inputId`: o clique vai no contêiner, a opção é escolhida pelo papel.
const escolher = async (page: Page, escopo: Locator, inputId: string, opcao: string) => {
    await escopo.locator(`.p-dropdown:has(#${inputId})`).click();
    await page.getByRole('option', { name: opcao, exact: true }).click();
};

test.describe('v1.11.0a8b73 — S2 opera os endereços da pessoa (AC-4, AC-5, AC-6)', () => {
    test('(a) cria um endereço: POST com os 9 campos e CEP só com dígitos, e a lista é relida', async ({ page }) => {
        await sessaoS2(page);
        const estado = await instalarRotas(page, [alfa(), beta()]);
        const dialogoPessoa = await abrirAbaEnderecos(page, estado);

        await dialogoPessoa.getByRole('button', { name: NOVO_ENDERECO }).click();
        const dialogo = page.getByRole('dialog', { name: 'Novo endereço' });
        await expect(dialogo).toBeVisible();
        await dialogo.getByLabel(/^Logradouro/).fill('Rua Gama');
        await dialogo.getByLabel(/^Número/).fill('30');
        await dialogo.getByLabel(/^Bairro/).fill('Cambuí');
        await dialogo.getByLabel(/^Cidade/).fill('Campinas');
        await escolher(page, dialogo, 'enderecoUf', 'SP');
        const cep = dialogo.getByLabel(/^CEP/);
        await cep.click();
        await cep.pressSequentially('13010000');
        await expect(cep).toHaveValue('13010-000');
        await dialogo.getByRole('button', { name: 'Cadastrar' }).click();

        await expect(dialogo).toBeHidden();
        const tabela = dialogoPessoa.getByRole('region', { name: TABELA_ARIA });
        await expect(tabela.getByRole('cell', { name: 'Rua Gama, 30', exact: true })).toBeVisible();
        await expect(tabela.getByText(/Rua Resposta Da Mutacao/)).toHaveCount(0);
        await expect(linhaEndereco(tabela, 'Rua Gama, 30').getByRole('cell', { name: '13010-000', exact: true })).toBeVisible();

        expect(estado.escritas).toHaveLength(1);
        const post = estado.escritas[0];
        expect(post.method()).toBe('POST');
        expect(new URL(post.url()).pathname).toBe(base);
        const enviado = post.postDataJSON() as Record<string, unknown>;
        expect(Object.keys(enviado).sort()).toEqual(NOVE_CAMPOS);
        expect(enviado).toEqual({ tipo: 1, logradouro: 'Rua Gama', numero: '30', complemento: null, bairro: 'Cambuí', cidade: 'Campinas', uf: 'SP', cep: '13010000', principal: false });
        expect(estado.listas).toBe(2);
    });

    test('(b) marca outro endereço como principal: POST …/principal sem corpo, e a marca muda de linha após a releitura', async ({ page }) => {
        await sessaoS2(page);
        const estado = await instalarRotas(page, [alfa(), beta()]);
        const dialogoPessoa = await abrirAbaEnderecos(page, estado);
        const tabela = dialogoPessoa.getByRole('region', { name: TABELA_ARIA });

        await expect(linhaEndereco(tabela, 'Rua Alfa, 10').getByText(MARCA_PRINCIPAL, { exact: true })).toBeVisible();
        await expect(linhaEndereco(tabela, 'Rua Beta, 20').getByText(MARCA_PRINCIPAL, { exact: true })).toHaveCount(0);

        await tabela.getByRole('button', { name: PRINCIPAL_ARIA('Rua Beta, 20') }).click();

        await expect(linhaEndereco(tabela, 'Rua Beta, 20').getByText(MARCA_PRINCIPAL, { exact: true })).toBeVisible();
        await expect(linhaEndereco(tabela, 'Rua Alfa, 10').getByText(MARCA_PRINCIPAL, { exact: true })).toHaveCount(0);
        await expect(page.getByText(TOAST_PRINCIPAL)).toBeVisible();
        await expect(tabela.getByText(/Rua Resposta Da Mutacao/)).toHaveCount(0);

        expect(estado.escritas).toHaveLength(1);
        const post = estado.escritas[0];
        expect(post.method()).toBe('POST');
        expect(new URL(post.url()).pathname).toBe(`${base}/${ID_BETA}/principal`);
        expect(post.postData()).toBeNull();
        expect(estado.listas).toBe(2);
    });

    test('(c) exclui o principal: aviso de promoção, DELETE sem corpo, e a lista é relida', async ({ page }) => {
        await sessaoS2(page);
        const estado = await instalarRotas(page, [alfa(), beta()]);
        const dialogoPessoa = await abrirAbaEnderecos(page, estado);
        const tabela = dialogoPessoa.getByRole('region', { name: TABELA_ARIA });

        await tabela.getByRole('button', { name: EXCLUIR_ARIA('Rua Alfa, 10') }).click();
        const confirmar = page.getByRole('alertdialog', { name: EXCLUIR_TITULO('Rua Alfa, 10') }).or(page.getByRole('dialog', { name: EXCLUIR_TITULO('Rua Alfa, 10') }));
        await expect(confirmar).toBeVisible();
        await expect(confirmar.getByText(AVISO_PROMOCAO, { exact: true })).toBeVisible();
        expect(estado.escritas).toHaveLength(0);
        await confirmar.getByRole('button', { name: 'Excluir', exact: true }).click();

        await expect(tabela.getByRole('cell', { name: 'Rua Alfa, 10', exact: true })).toHaveCount(0);
        await expect(linhaEndereco(tabela, 'Rua Beta, 20').getByText(MARCA_PRINCIPAL, { exact: true })).toBeVisible();
        await expect(page.getByText(TOAST_EXCLUIDO_PROMOVIDO)).toBeVisible();

        expect(estado.escritas).toHaveLength(1);
        const del = estado.escritas[0];
        expect(del.method()).toBe('DELETE');
        expect(new URL(del.url()).pathname).toBe(`${base}/${ID_ALFA}`);
        expect(del.postData()).toBeNull();
        expect(estado.listas).toBe(2);
    });

    test('(d) edita trocando a UF de um endereço com município vinculado: aparece o aviso de remoção do vínculo', async ({ page }) => {
        await sessaoS2(page);
        const estado = await instalarRotas(page, [alfa(), beta()]);
        const dialogoPessoa = await abrirAbaEnderecos(page, estado);

        await dialogoPessoa.getByRole('button', { name: EDITAR_ARIA('Rua Alfa, 10') }).click();
        const dialogo = page.getByRole('dialog', { name: 'Editar endereço' });
        await expect(dialogo).toBeVisible();
        await expect(dialogo.getByText(AVISO_UF_COM_VINCULO, { exact: true })).toHaveCount(0);

        await escolher(page, dialogo, 'enderecoUf', 'RJ');
        await expect(dialogo.getByText(AVISO_UF_COM_VINCULO, { exact: true })).toBeVisible();

        // Controle: voltar a UF original some com o aviso (o aviso depende da troca, não da abertura).
        await escolher(page, dialogo, 'enderecoUf', 'SP');
        await expect(dialogo.getByText(AVISO_UF_COM_VINCULO, { exact: true })).toHaveCount(0);
        expect(estado.escritas).toHaveLength(0);
    });
});
