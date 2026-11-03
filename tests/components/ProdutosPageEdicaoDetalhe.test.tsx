import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProdutosPage } from '@/features/produtos/components/ProdutosPage';
import { httpClient } from '@/lib/http/httpClient';
import { EntityStatus, TipoItemFiscal, TipoItemSped, TipoProduto } from '@/types/erp';

// v1.11.0a8b77.c1 — COMPORTAMENTO da edição do produto. A listagem (`GET /api/produtos`) devolve o DTO enxuto
// (`ProdutoListagemItemResponse`: do bloco fiscal só `ncm` e `tipoItemSped`); o produto completo vem de
// `GET /api/produtos/{id}`. A página, o diálogo, os hooks, o client e o `httpClient` são os reais; só a rede (adapter)
// e o `Dropdown` (dublê em tests/mocks) são trocados. Sem a correção, o formulário reabria com os campos fiscais vazios
// e o salvamento reenviava o bloco fiscal em branco.

vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));

const { toastMock } = vi.hoisted(() => ({
    toastMock: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn() }
}));

vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => toastMock }));

vi.mock('@/features/auth/hooks/usePermissions', () => {
    const has = () => true;
    return { usePermissions: () => ({ hasPermission: has, hasAnyPermission: has, hasAllPermissions: has }) };
});

vi.mock('@/features/fornecedores/hooks/useFornecedoresResources', () => ({
    useFornecedores: () => ({ data: [], isFetching: false, isLoading: false })
}));

vi.mock('@/hooks/useOrganizationalContext', () => ({
    useOrganizationalContext: () => ({ snapshot: { empresaId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', filialId: null, isMaster: true, revision: 1 } })
}));

// Seletores de empresa/filial do filtro da página: fora do escopo deste teste, respondem lista vazia.
vi.mock('@/features/administracao/api/administracaoApi', () => ({
    administracaoApi: { listarEmpresas: async () => [], listarFiliais: async () => [], listarSetores: async () => [] }
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    usePathname: () => '/produtos',
    useSearchParams: () => new URLSearchParams()
}));

const EMPRESA = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PRODUTO = 'pppppppp-pppp-4ppp-8ppp-pppppppppppp';
const UNIDADE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const UNIDADE_TRIBUTAVEL = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const GRUPO = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const pagina = (items: unknown[]) => ({ items, page: 1, pageSize: 100, totalItems: items.length, totalPages: 1 });

// Linha da listagem: o DTO enxuto, sem Cest, Origem, TipoItemFiscal, unidade tributável, ExTipi, benefício, código externo e grupo.
const linhaDaLista = {
    id: PRODUTO,
    empresaId: EMPRESA,
    filialId: null,
    codigo: 'P-001',
    descricao: 'Produto Detalhado',
    tipoProduto: TipoProduto.Mercadoria,
    unidadeMedidaId: UNIDADE,
    precoVendaBase: 10,
    custoReferencial: 5,
    controlaEstoque: true,
    controlaQualidade: false,
    permiteVenda: true,
    permiteCompra: true,
    ncm: '22030000',
    tipoItemSped: TipoItemSped.MercadoriaParaRevenda,
    status: EntityStatus.Ativo,
    codigosBarras: [],
    fornecedores: []
};

// `GET /api/produtos/{id}`: o `ProdutoResponse` completo.
const detalheCompleto = {
    ...linhaDaLista,
    grupoProdutoId: GRUPO,
    cest: '0300100',
    origemMercadoriaCodigo: '0',
    tipoItemFiscal: TipoItemFiscal.Mercadoria,
    unidadeTributavelSigla: 'CX',
    unidadeMedidaTributavelId: UNIDADE_TRIBUTAVEL,
    exTipi: '01',
    codigoBeneficioFiscalPadrao: 'RS123456',
    codigoFiscalExterno: 'EXT-77'
};

type Chamada = { method: string; url: string; body: Record<string, unknown> | null };

let chamadas: Chamada[];
let respostaDetalhe: (config: InternalAxiosRequestConfig) => Promise<{ status: number; data: unknown }>;
const adapterOriginal = httpClient.defaults.adapter;

const corpo = (config: InternalAxiosRequestConfig) => {
    if (typeof config.data !== 'string') return null;
    return JSON.parse(config.data) as Record<string, unknown>;
};

beforeEach(() => {
    chamadas = [];
    respostaDetalhe = async () => ({ status: 200, data: detalheCompleto });
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        const method = String(config.method ?? 'get').toLowerCase();
        const url = String(config.url);
        chamadas.push({ method, url, body: corpo(config) });
        let status = 200;
        let data: unknown = pagina([]);
        if (method === 'get') {
            if (url === '/api/produtos') data = [linhaDaLista];
            else if (url === `/api/produtos/${PRODUTO}`) ({ status, data } = await respostaDetalhe(config));
            else if (url === '/api/produtos/unidades-medida') data = [{ id: UNIDADE, empresaId: EMPRESA, sigla: 'UN', descricao: 'Unidade', status: EntityStatus.Ativo }, { id: UNIDADE_TRIBUTAVEL, empresaId: EMPRESA, sigla: 'CX', descricao: 'Caixa', status: EntityStatus.Ativo }];
            else if (['/api/produtos/categorias', '/api/produtos/marcas'].includes(url)) data = [];
            else if (url === '/api/produtos/grupos') data = pagina([{ id: GRUPO, empresaId: EMPRESA, codigo: 'G1', descricao: 'Grupo Um', status: EntityStatus.Ativo }]);
            else if (url === '/api/fiscal/cadastros/origens-mercadoria') data = pagina([{ id: 'o0', codigo: '0', descricao: 'Nacional', ehEstrangeira: false, ativo: true }]);
        } else {
            data = detalheCompleto;
        }
        if (status >= 400) {
            const { AxiosError } = await import('axios');
            throw new AxiosError('falha', 'ERR_BAD_RESPONSE', config, null, { status, statusText: 'ERR', headers: new AxiosHeaders(), config, data });
        }
        return { data, status, statusText: 'OK', headers: new AxiosHeaders(), config };
    });
});

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
    vi.clearAllMocks();
});

const montar = () => {
    const user = userEvent.setup();
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
            <ProdutosPage />
        </QueryClientProvider>
    );
    return user;
};

const clicarEditar = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole('button', { name: 'Editar' }));
};

const abrirAbaFiscal = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole('tab', { name: 'Dados fiscais' }));
    await screen.findByRole('combobox', { name: 'NCM' });
};

const selectDo = (id: string) => document.querySelector(`#${id} select`) as HTMLSelectElement;
const salvarBotao = () => screen.getByRole('button', { name: /Salvar/ });
const patchDadosFiscais = () => chamadas.find((chamada) => chamada.method === 'patch' && chamada.url === `/api/produtos/${PRODUTO}/dados-fiscais`);

describe('ProdutosPage: Editar carrega o produto completo por id (a linha da lista é parcial)', () => {
    it('a listagem não traz o bloco fiscal completo, e o formulário mostra o que veio do detalhe', async () => {
        expect(Object.keys(linhaDaLista)).not.toContain('origemMercadoriaCodigo');
        const user = montar();
        await clicarEditar(user);
        await abrirAbaFiscal(user);

        expect(chamadas.some((chamada) => chamada.method === 'get' && chamada.url === `/api/produtos/${PRODUTO}`)).toBe(true);
        expect(screen.getByRole('combobox', { name: 'Origem da mercadoria' })).toHaveDisplayValue('0 — Nacional');
        expect(selectDo('tipoItemFiscal')).toHaveDisplayValue('Mercadoria');
        expect(selectDo('unidadeTributavelSigla')).toHaveDisplayValue('CX');
        expect(selectDo('unidadeMedidaTributavelId')).toHaveDisplayValue('CX - Caixa');
        expect(screen.getByLabelText('Código de benefício fiscal')).toHaveValue('RS123456');
        expect(screen.getByLabelText('Código fiscal externo')).toHaveValue('EXT-77');
        expect(screen.getByLabelText('EX-TIPI')).toHaveValue('01');
    });

    it('salvar sem mexer reenvia o bloco fiscal do detalhe (nunca null) e não regrava o grupo', async () => {
        const user = montar();
        await clicarEditar(user);
        await abrirAbaFiscal(user);
        await user.click(salvarBotao());

        await waitFor(() => expect(patchDadosFiscais()).toBeDefined());
        expect(patchDadosFiscais()?.body).toMatchObject({
            ncmCodigo: '22030000',
            cestCodigo: '0300100',
            origemMercadoriaCodigo: '0',
            tipoItemFiscal: TipoItemFiscal.Mercadoria,
            tipoItemSped: TipoItemSped.MercadoriaParaRevenda,
            unidadeTributavelSigla: 'CX',
            unidadeMedidaTributavelId: UNIDADE_TRIBUTAVEL,
            exTipi: '01',
            codigoBeneficioFiscalPadrao: 'RS123456',
            codigoFiscalExterno: 'EXT-77'
        });
        // O grupo do detalhe é a referência: sem troca, não há PUT /classificacao.
        expect(chamadas.some((chamada) => chamada.method === 'put' && chamada.url === `/api/produtos/${PRODUTO}/classificacao`)).toBe(false);
    });

    it('enquanto o produto carrega: indicador de loading, sem formulário e Salvar desabilitado', async () => {
        let liberar: () => void = () => undefined;
        respostaDetalhe = () => new Promise((resolve) => { liberar = () => resolve({ status: 200, data: detalheCompleto }); });
        const user = montar();
        await clicarEditar(user);

        expect(await screen.findByText('Carregando dados do produto...')).toBeInTheDocument();
        expect(salvarBotao()).toBeDisabled();
        expect(screen.queryByRole('tab', { name: 'Dados fiscais' })).not.toBeInTheDocument();
        // O diálogo se apresenta como edição desde o primeiro instante (o botão "Novo produto" da página não conta).
        expect(within(screen.getByRole('dialog')).getByText('Editar produto')).toBeInTheDocument();

        liberar();
        await abrirAbaFiscal(user);
        expect(salvarBotao()).toBeEnabled();
    });

    it('erro ao carregar: mensagem, Salvar desabilitado, sem cair na linha da lista, e "Tentar novamente" recupera', async () => {
        let tentativas = 0;
        respostaDetalhe = async () => {
            tentativas += 1;
            return tentativas === 1 ? { status: 500, data: { message: 'Falha no servidor.' } } : { status: 200, data: detalheCompleto };
        };
        const user = montar();
        await clicarEditar(user);

        expect(await screen.findByText(/Não foi possível carregar o produto/)).toBeInTheDocument();
        expect(salvarBotao()).toBeDisabled();
        expect(screen.queryByRole('tab', { name: 'Dados fiscais' })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
        await abrirAbaFiscal(user);
        expect(within(document.body).queryByText(/Não foi possível carregar o produto/)).not.toBeInTheDocument();
        expect(screen.getByLabelText('Código fiscal externo')).toHaveValue('EXT-77');
        expect(salvarBotao()).toBeEnabled();
    });
});
