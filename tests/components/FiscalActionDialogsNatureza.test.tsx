import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CriarNotaFiscalDialog, GerarNotaFiscalPedidoVendaDialog, ItemNotaFiscalDialog } from '@/features/fiscal/components/FiscalActionDialogs';
import { fiscalApi } from '@/features/fiscal/api/fiscalApi';
import { GERAR_NF_PEDIDO_VENDA } from '@/features/fiscal/components/fiscalLabels';
import { NATUREZA_OPERACAO_FIELD_VAZIO, NATUREZA_OPERACAO_LINK } from '@/features/fiscal/components/naturezasOperacaoLabels';
import { httpClient } from '@/lib/http/httpClient';

// b72 — D100 (AC-9) e D101 (AC-10) nos diálogos REAIS do Fiscal. O `onSubmit` é o mesmo caminho das páginas: o
// `fiscalApi` real, sobre o `httpClient` real; só a rede (adapter do axios) responde. O `NaturezaOperacaoField`,
// o hook do combo e o client de naturezas são os de produção. Dublados: sessão, listas de outros módulos
// (pessoa, pedido, produto, condição), o campo de série e o `Dropdown` do PrimeReact (tests/mocks).

const { estado } = vi.hoisted(() => ({ estado: { perms: [] as string[] } }));

vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));
vi.mock('@/features/auth/hooks/usePermissions', () => {
    const has = (code?: string) => !code || estado.perms.includes(code);
    return { usePermissions: () => ({ hasPermission: has, hasAnyPermission: (codes?: string[]) => !codes || codes.length === 0 || codes.some(has), hasAllPermissions: (codes?: string[]) => !codes || codes.length === 0 || codes.every(has) }) };
});
vi.mock('@/features/administracao/hooks/useEmpresaFilialOptions', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/features/administracao/hooks/useEmpresaFilialOptions')>()),
    useEmpresasOptions: () => ({ options: [{ label: 'Empresa A', value: '11111111-1111-1111-1111-111111111111' }], data: [], isLoading: false, isFetching: false }),
    useFiliaisOptions: () => ({ options: [], data: [], isLoading: false, isFetching: false, isFetched: true, isError: false, error: null })
}));
vi.mock('@/features/pessoas/hooks/usePessoasResources', () => ({ usePessoas: () => ({ data: [], isLoading: false, isFetching: false }) }));
vi.mock('@/features/produtos/hooks/useProdutosResources', () => ({ useProdutos: () => ({ data: [], isLoading: false, isFetching: false }) }));
vi.mock('@/features/vendas/hooks/useVendasResources', () => ({ usePedidosVenda: () => ({ data: [], isLoading: false, isFetching: false }) }));
vi.mock('@/features/financeiro/hooks/useFinanceiroResources', () => ({ useCondicoesPagamentoOptions: () => ({ options: [], data: [], isFetching: false, isLoading: false }) }));
vi.mock('@/features/fiscal/components/NotaFiscalSerieField', () => ({
    NotaFiscalSerieField: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => <input aria-label="Série" value={value} onChange={(event) => onChange(event.target.value)} />
}));

const empresaA = '11111111-1111-1111-1111-111111111111';
const pedidoId = '77777777-7777-7777-7777-777777777777';
const notaId = '88888888-8888-8888-8888-888888888888';
const naturezaVendaId = '44444444-4444-4444-4444-444444444444';
const naturezaRemessaId = '55555555-5555-5555-5555-555555555555';
const CFOP_SEM_MAPEAMENTO = 'Fiscal.CfopSemMapeamentoParaAmbito';

const S1 = ['FISCAL_CONSULTAR', 'FISCAL_GERENCIAR', 'FISCAL_CADASTROS_CONSULTAR'];
const S2 = ['FISCAL_CONSULTAR', 'FISCAL_GERENCIAR', 'FISCAL_CADASTROS_CONSULTAR', 'FISCAL_CADASTROS_GERENCIAR'];
const S3 = ['FISCAL_CONSULTAR', 'FISCAL_GERENCIAR', 'FISCAL_CADASTROS_GERENCIAR'];
const S4 = ['FISCAL_CONSULTAR', 'FISCAL_GERENCIAR'];

const natureza = (id: string, codigo: string, descricao: string) => ({
    id, empresaId: empresaA, filialId: null, codigo, descricao, tipoDocumento: 1, tipoOperacao: 1, finalidade: 1, indicadorPresencaComprador: 1,
    indicadorConsumidorFinal: false, movimentaEstoque: true, geraFinanceiro: true, observacao: null, ativa: true, cfops: []
});

type Capturado = { method?: string; url?: string; params: Record<string, unknown>; body?: Record<string, unknown> };
let capturados: Capturado[];
let naturezas: ReturnType<typeof natureza>[];
let respostaPost: 'ok' | 'cfopSemMapeamento';
const adapterOriginal = httpClient.defaults.adapter;

beforeEach(() => {
    estado.perms = S1;
    naturezas = [natureza(naturezaVendaId, 'VENDA', 'Venda de mercadoria'), natureza(naturezaRemessaId, 'REMESSA', 'Remessa')];
    respostaPost = 'ok';
    capturados = [];
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        const params = (config.params ?? {}) as Record<string, unknown>;
        capturados.push({ method: config.method, url: config.url, params, body: config.data ? JSON.parse(String(config.data)) : undefined });
        if (config.method === 'get' && config.url === '/api/fiscal/naturezas-operacao') return { data: { items: naturezas, page: 1, pageSize: 200, totalItems: naturezas.length, totalPages: 1 }, status: 200, statusText: 'OK', headers: {}, config };
        if (config.method === 'post') {
            if (respostaPost === 'cfopSemMapeamento') {
                const response = { data: { code: CFOP_SEM_MAPEAMENTO, message: 'Natureza VENDA sem CFOP para o âmbito Interno.', traceId: 'trace-d101' }, status: 400, statusText: 'Bad Request', headers: new AxiosHeaders(), config };
                throw new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', config, {}, response);
            }
            return { data: { id: notaId, notaFiscal: { id: notaId } }, status: 200, statusText: 'OK', headers: {}, config };
        }
        throw new Error(`Rota não esperada no teste: ${config.method} ${config.url}`);
    });
});

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

// Limite por teste: medido na varredura de 54 arquivos, o arquivo levou 31 s para 11 testes sob carga (contra
// ~1 s por teste isolado). O padrão de 5 s estoura sem falha de asserção; nenhuma asserção muda.
vi.setConfig({ testTimeout: 30_000 });

const renderCom = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{ui}</QueryClientProvider>);
const posts = () => capturados.filter((item) => item.method === 'post');
// Os `Field` destes diálogos têm `<label>` sem `htmlFor` (dívida de acessibilidade existente, fora do recorte);
// o controle é procurado no contêiner do rótulo.
const campoTexto = (dialog: HTMLElement, rotulo: string) => within(within(dialog).getByText(rotulo, { selector: 'label' }).parentElement as HTMLElement).getByRole('textbox');
const escolherNatureza = async (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, rotulo: string) => {
    const combo = await within(dialog).findByRole('combobox', { name: 'Buscar natureza de operação' });
    await within(combo).findByRole('option', { name: rotulo });
    await waitFor(() => expect(combo).toBeEnabled());
    await user.selectOptions(combo, rotulo);
};

describe('AC-9: Nova nota envia a natureza escolhida', () => {
    it('o POST /notas-fiscais leva o naturezaOperacaoId escolhido no combo (não o primeiro da lista)', async () => {
        const user = userEvent.setup({ delay: null });
        renderCom(<CriarNotaFiscalDialog visible onHide={vi.fn()} onSubmit={async (values) => { await fiscalApi.criarNota(values); }} />);
        const dialog = await screen.findByRole('dialog', { name: 'Nova nota fiscal manual' });
        await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Buscar empresa obrigatória' }), 'Empresa A');
        await escolherNatureza(user, dialog, 'REMESSA — Remessa');
        await user.type(campoTexto(dialog, 'Número'), '1001');
        await user.click(within(dialog).getByRole('button', { name: 'Criar nota' }));

        await waitFor(() => expect(posts()).toHaveLength(1));
        expect(posts()[0]).toMatchObject({ url: '/api/fiscal/notas-fiscais' });
        expect(posts()[0].body).toMatchObject({ empresaId: empresaA, naturezaOperacaoId: naturezaRemessaId });
        // O combo pediu só as ativas da empresa escolhida.
        expect(capturados.find((item) => item.url === '/api/fiscal/naturezas-operacao')?.params).toMatchObject({ empresaId: empresaA, somenteAtivas: true });
    });
});

describe('AC-9: Gerar NF envia a natureza escolhida e fica indisponível sem ela', () => {
    const renderGerar = () =>
        renderCom(<GerarNotaFiscalPedidoVendaDialog visible pedidoVendaId={pedidoId} escopoPedido={{ empresaId: empresaA, filialId: null }} onHide={vi.fn()} onSubmit={async (values) => { await fiscalApi.gerarNotaDePedidoVenda(values); }} />);

    it('sem natureza escolhida o Gerar NF fica desabilitado com o motivo; escolhida, o POST leva o id', async () => {
        const user = userEvent.setup({ delay: null });
        renderGerar();
        const dialog = await screen.findByRole('dialog', { name: 'Gerar nota fiscal de pedido de venda' });
        await within(dialog).findByRole('option', { name: 'VENDA — Venda de mercadoria' });
        expect(within(dialog).getByText(`${GERAR_NF_PEDIDO_VENDA.indisponivelPrefixo} ${GERAR_NF_PEDIDO_VENDA.naturezaObrigatoria}`)).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Gerar NF' })).toBeDisabled();

        await escolherNatureza(user, dialog, 'VENDA — Venda de mercadoria');
        await user.type(campoTexto(dialog, 'Número'), '2002');
        expect(within(dialog).queryByText(new RegExp(GERAR_NF_PEDIDO_VENDA.indisponivelPrefixo))).not.toBeInTheDocument();
        await user.click(within(dialog).getByRole('button', { name: 'Gerar NF' }));

        await waitFor(() => expect(posts()).toHaveLength(1));
        expect(posts()[0]).toMatchObject({ url: '/api/fiscal/notas-fiscais/gerar-de-pedido-venda' });
        expect(posts()[0].body).toMatchObject({ pedidoVendaId: pedidoId, naturezaOperacaoId: naturezaVendaId });
    });

    it('sem natureza ativa na empresa: Gerar NF indisponível, motivo visível, link para o cadastro (S1) e 0 POST', async () => {
        const user = userEvent.setup({ delay: null });
        naturezas = [];
        renderGerar();
        const dialog = await screen.findByRole('dialog', { name: 'Gerar nota fiscal de pedido de venda' });
        expect(await within(dialog).findByText(`${GERAR_NF_PEDIDO_VENDA.indisponivelPrefixo} ${NATUREZA_OPERACAO_FIELD_VAZIO.comPermissao}`)).toBeInTheDocument();
        expect(within(dialog).getByRole('link', { name: NATUREZA_OPERACAO_LINK.cadastrar })).toHaveAttribute('href', '/fiscal/naturezas-operacao');
        const gerar = within(dialog).getByRole('button', { name: 'Gerar NF' });
        expect(gerar).toBeDisabled();
        await user.click(gerar);
        expect(posts()).toHaveLength(0);
    });

    it('S3 (só gerenciar cadastros) não lista naturezas: Gerar NF indisponível pelo motivo de permissão, 0 GET e 0 POST', async () => {
        estado.perms = S3;
        renderGerar();
        const dialog = await screen.findByRole('dialog', { name: 'Gerar nota fiscal de pedido de venda' });
        expect(await within(dialog).findByText(/Gerar NF indisponível: Listar as naturezas de operação exige a permissão FISCAL_CADASTROS_CONSULTAR\./)).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Gerar NF' })).toBeDisabled();
        expect(capturados).toHaveLength(0);
    });
});

describe('AC-10: CfopSemMapeamentoParaAmbito leva ao cadastro de naturezas só para S1, S2 e S3', () => {
    const adicionarItemCom400 = async () => {
        const user = userEvent.setup({ delay: null });
        respostaPost = 'cfopSemMapeamento';
        renderCom(<ItemNotaFiscalDialog visible empresaId={empresaA} filialId={null} onHide={vi.fn()} onSubmit={async (values) => { await fiscalApi.adicionarItem(notaId, values); }} />);
        const dialog = await screen.findByRole('dialog', { name: 'Adicionar item fiscal' });
        await user.type(campoTexto(dialog, 'Código'), 'P-1');
        await user.type(campoTexto(dialog, 'Descrição'), 'Produto um');
        await user.click(within(dialog).getByRole('button', { name: 'Adicionar item' }));
        await waitFor(() => expect(posts()).toHaveLength(1));
        expect(posts()[0].url).toBe(`/api/fiscal/notas-fiscais/${notaId}/itens`);
        // O texto do backend aparece no diálogo, junto do título do atalho.
        expect(await within(dialog).findByText('Natureza VENDA sem CFOP para o âmbito Interno.')).toBeInTheDocument();
        expect(within(dialog).getByText(NATUREZA_OPERACAO_LINK.tituloCfopSemMapeamento)).toBeInTheDocument();
        return dialog;
    };

    it.each([
        ['S1', S1],
        ['S2', S2],
        ['S3', S3]
    ])('Adicionar item (%s): o link aponta para /fiscal/naturezas-operacao', async (_sessao, perms) => {
        estado.perms = perms;
        const dialog = await adicionarItemCom400();
        expect(within(dialog).getByRole('link', { name: NATUREZA_OPERACAO_LINK.cadastrar })).toHaveAttribute('href', '/fiscal/naturezas-operacao');
        expect(within(dialog).queryByText(NATUREZA_OPERACAO_LINK.semPermissaoTexto)).not.toBeInTheDocument();
    });

    it('Adicionar item (S4): sem link, com o texto de a quem pedir', async () => {
        estado.perms = S4;
        const dialog = await adicionarItemCom400();
        expect(within(dialog).queryByRole('link', { name: NATUREZA_OPERACAO_LINK.cadastrar })).not.toBeInTheDocument();
        expect(within(dialog).getByText(NATUREZA_OPERACAO_LINK.semPermissaoTexto)).toBeInTheDocument();
    });

    it.each([
        ['S1', S1],
        ['S2', S2]
    ])('Gerar NF (%s): o 400 mostra o texto do backend e o link, e o diálogo fica aberto', async (_sessao, perms) => {
        const user = userEvent.setup({ delay: null });
        estado.perms = perms;
        respostaPost = 'cfopSemMapeamento';
        renderCom(<GerarNotaFiscalPedidoVendaDialog visible pedidoVendaId={pedidoId} escopoPedido={{ empresaId: empresaA, filialId: null }} onHide={vi.fn()} onSubmit={async (values) => { await fiscalApi.gerarNotaDePedidoVenda(values); }} />);
        const dialog = await screen.findByRole('dialog', { name: 'Gerar nota fiscal de pedido de venda' });
        await escolherNatureza(user, dialog, 'VENDA — Venda de mercadoria');
        await user.type(campoTexto(dialog, 'Número'), '2002');
        await user.click(within(dialog).getByRole('button', { name: 'Gerar NF' }));

        expect(await within(dialog).findByText('Natureza VENDA sem CFOP para o âmbito Interno.')).toBeInTheDocument();
        expect(within(dialog).getByText(NATUREZA_OPERACAO_LINK.tituloCfopSemMapeamento)).toBeInTheDocument();
        expect(within(dialog).getByRole('link', { name: NATUREZA_OPERACAO_LINK.cadastrar })).toHaveAttribute('href', '/fiscal/naturezas-operacao');
        expect(screen.getByRole('dialog', { name: 'Gerar nota fiscal de pedido de venda' })).toBeInTheDocument();
    });

    it('outro código de erro não abre o atalho de cadastro', async () => {
        estado.perms = S2;
        const user = userEvent.setup({ delay: null });
        httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
            const response = { data: { code: 'Fiscal.NotaNaoEditavel', message: 'Nota não está em rascunho.', traceId: 't' }, status: 400, statusText: 'Bad Request', headers: new AxiosHeaders(), config };
            throw new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', config, {}, response);
        });
        renderCom(<ItemNotaFiscalDialog visible empresaId={empresaA} filialId={null} onHide={vi.fn()} onSubmit={async (values) => { await fiscalApi.adicionarItem(notaId, values); }} />);
        const dialog = await screen.findByRole('dialog', { name: 'Adicionar item fiscal' });
        await user.type(campoTexto(dialog, 'Código'), 'P-1');
        await user.type(campoTexto(dialog, 'Descrição'), 'Produto um');
        await user.click(within(dialog).getByRole('button', { name: 'Adicionar item' }));
        await waitFor(() => expect(httpClient.defaults.adapter).toHaveBeenCalled());
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(within(dialog).queryByText(NATUREZA_OPERACAO_LINK.tituloCfopSemMapeamento)).not.toBeInTheDocument();
        expect(within(dialog).queryByRole('link', { name: NATUREZA_OPERACAO_LINK.cadastrar })).not.toBeInTheDocument();
    });
});
