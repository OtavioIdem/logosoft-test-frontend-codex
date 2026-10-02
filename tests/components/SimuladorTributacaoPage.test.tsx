import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimuladorTributacaoPage } from '@/features/tributacao/components/SimuladorTributacaoPage';
import { TRIBUTACAO_ERROR_CATALOG } from '@/features/tributacao/components/tributacaoErrors';
import { httpClient } from '@/lib/http/httpClient';

// b74 (D103, AC-4) — simulador de tributação com a página, o hook, o client e o `httpClient` REAIS. Só a rede
// (adapter do axios) é trocada. Ficam dublados apenas a sessão (permissões), as listas de empresa/filial (fora da
// prova) e o `Dropdown` do PrimeReact (dublê em `tests/mocks/primereact/dropdown.tsx`, porque o painel real não é
// operável no jsdom). Mesmo cabeçalho de `tests/components/NaturezasOperacaoPage.test.tsx`.

const { estado } = vi.hoisted(() => ({ estado: { perms: [] as string[] } }));

vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));
vi.mock('@/features/auth/hooks/usePermissions', () => {
    const has = (code?: string) => !code || estado.perms.includes(code);
    return {
        usePermissions: () => ({
            hasPermission: has,
            hasAnyPermission: (codes?: string[]) => !codes || codes.length === 0 || codes.some(has),
            hasAllPermissions: (codes?: string[]) => !codes || codes.length === 0 || codes.every(has)
        })
    };
});
vi.mock('@/features/administracao/hooks/useEmpresaFilialOptions', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/features/administracao/hooks/useEmpresaFilialOptions')>()),
    useEmpresasOptions: () => ({ options: [{ label: 'Empresa A', value: '11111111-1111-1111-1111-111111111111' }], data: [], isLoading: false, isFetching: false }),
    useFiliaisOptions: () => ({ options: [], data: [], isLoading: false, isFetching: false, isFetched: true, isError: false, error: null })
}));

const ST_DIFAL = 'FISCAL_TRIBUTACAO_ST_INCOMPATIVEL_COM_DIFAL';
const MENSAGEM_SERVIDOR = 'Regra 7f3a: CST 10 com ST em venda interestadual a consumidor final não contribuinte (DIFAL).';

type Capturado = { method?: string; url?: string; body: Record<string, unknown> | undefined };

let capturados: Capturado[];
let respostaSimular: { status: number; data: Record<string, unknown> };
const adapterOriginal = httpClient.defaults.adapter;

const pagina = (items: unknown[]) => ({ items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 });

beforeEach(() => {
    estado.perms = ['FISCAL_REGRAS_CONSULTAR'];
    capturados = [];
    respostaSimular = { status: 422, data: { code: ST_DIFAL, message: MENSAGEM_SERVIDOR, traceId: 'trace-st-difal' } };
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        capturados.push({ method: config.method, url: config.url, body: config.data ? JSON.parse(String(config.data)) : undefined });
        if (config.method === 'post' && config.url === '/api/fiscal/tributacao/simular') {
            const response = { data: respostaSimular.data, status: respostaSimular.status, statusText: 'Unprocessable Entity', headers: new AxiosHeaders(), config };
            throw new AxiosError(`Request failed with status code ${respostaSimular.status}`, 'ERR_BAD_REQUEST', config, {}, response);
        }
        // Buscas de NCM/CFOP da grade de itens: fora da prova, respondem página vazia.
        if (config.method === 'get') return { data: pagina([]), status: 200, statusText: 'OK', headers: {}, config };
        throw new Error(`Rota não esperada no teste: ${config.method} ${config.url}`);
    });
});

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

const renderPagina = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
            <SimuladorTributacaoPage />
        </QueryClientProvider>
    );

/** Venda interestadual (SP → MG) a consumidor final não contribuinte: a operação que expõe ST × DIFAL. */
const preencherOperacaoDifalESimular = async () => {
    const user = userEvent.setup({ delay: null });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Buscar empresa obrigatória' }), 'Empresa A');
    await user.type(screen.getByLabelText('UF de origem'), 'sp');
    await user.type(screen.getByLabelText('UF de destino'), 'mg');
    await user.selectOptions(screen.getByLabelText('Indicador do destinatário'), 'Não contribuinte');
    await user.click(screen.getByLabelText(/Consumidor final/));
    await user.click(screen.getByRole('button', { name: 'Simular tributação' }));
};

const simulacoes = () => capturados.filter((item) => item.method === 'post' && item.url === '/api/fiscal/tributacao/simular');

describe('AC-4: simulador recebe 422 de ST incompatível com DIFAL', () => {
    it('mostra o aviso de cadastro do catálogo (warn), a mensagem do servidor como detalhe e nenhum total', async () => {
        const info = TRIBUTACAO_ERROR_CATALOG[ST_DIFAL];
        renderPagina();
        await preencherOperacaoDifalESimular();

        // O aviso amigável é do catálogo, com os textos literais.
        const titulo = await screen.findByText('Regra com substituição tributária em operação sujeita a DIFAL');
        const aviso = titulo.closest('[role="alert"]') as HTMLElement;
        expect(aviso).not.toBeNull();
        expect(within(aviso).getByText(info.mensagem)).toBeInTheDocument();
        expect(within(aviso).getByText(/^Corrija o cadastro da regra fiscal: use um CST\/CSOSN sem substituição tributária/)).toBeInTheDocument();
        // Não é carga pendente: o texto de "carga de tabela" não aparece.
        expect(within(aviso).queryByText(/Carga de tabela pendente/)).not.toBeInTheDocument();

        // Severidade de aviso, e não de erro. O PrimeReact só expõe a severidade pela classe do Message.
        expect(aviso.className).toContain('p-inline-message-warn');
        expect(aviso.className).not.toContain('p-inline-message-error');

        // A mensagem do servidor continua visível como detalhe técnico, com código e status.
        expect(screen.getByText(MENSAGEM_SERVIDOR)).toBeInTheDocument();
        expect(screen.getByText(/Código: FISCAL_TRIBUTACAO_ST_INCOMPATIVEL_COM_DIFAL/)).toHaveTextContent('HTTP 422');

        // Nenhum total: o resultado não aparece e o aviso de "nenhum total" está presente.
        expect(screen.getByText(/Nenhum total é exibido quando o cálculo falha/)).toBeInTheDocument();
        expect(screen.getByText('Nenhuma simulação executada nesta sessão.')).toBeInTheDocument();
        expect(screen.queryByText(/Total com FCP/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Total destino/)).not.toBeInTheDocument();

        // A simulação realmente saiu com a operação de DIFAL (o erro veio do servidor, não da validação local).
        expect(simulacoes()).toHaveLength(1);
        expect(simulacoes()[0].body).toMatchObject({ ufOrigem: 'SP', ufDestino: 'MG', consumidorFinal: true, indicadorContribuinteDestinatario: 3 });
    });

    it('controle: código fora do catálogo não ganha aviso amigável, só o erro genérico do servidor', async () => {
        respostaSimular = { status: 422, data: { code: 'FISCAL_TRIBUTACAO_CODIGO_DESCONHECIDO', message: MENSAGEM_SERVIDOR } };
        renderPagina();
        await preencherOperacaoDifalESimular();

        expect(await screen.findByText(MENSAGEM_SERVIDOR)).toBeInTheDocument();
        expect(screen.queryByText('Regra com substituição tributária em operação sujeita a DIFAL')).not.toBeInTheDocument();
        expect(screen.queryByText(/Corrija o cadastro da regra fiscal/)).not.toBeInTheDocument();
        expect(screen.getAllByRole('alert').some((el) => el.className.includes('p-inline-message-warn') && el.textContent?.includes('Corrija'))).toBe(false);
    });
});
