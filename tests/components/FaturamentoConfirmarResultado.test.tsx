import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FaturamentoDetalhePage } from '@/features/faturamento/components/FaturamentoDetalhePage';
import { FATURAMENTO_CONFIRMAR, FATURAMENTO_RESULTADO } from '@/features/faturamento/components/faturamentoLabels';
import { httpClient } from '@/lib/http/httpClient';
import type { FaturamentoResponse } from '@/features/faturamento/types/faturamento.types';

// b71 — AC-4 (D93) e AC-5 (D93) no detalhe REAL do faturamento. Página, diálogo, hooks, `faturamentoApi` e
// o `httpClient` são os de produção; só o adapter do axios (a rede) responde. O que se prova: o toast e o
// painel leem a etapa real da resposta, e o erro 400 chega ao `ApiErrorPanel` do diálogo com código, status
// e traceId.

const { toastMock, permsState } = vi.hoisted(() => ({
    toastMock: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn() },
    permsState: { perms: [] as string[] }
}));

vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => toastMock }));
vi.mock('@/features/auth/hooks/usePermissions', () => {
    const has = (code?: string) => !code || permsState.perms.includes(code);
    return {
        usePermissions: () => ({
            hasPermission: has,
            hasAnyPermission: (codes?: string[]) => !codes || codes.length === 0 || codes.some(has),
            hasAllPermissions: (codes?: string[]) => !codes || codes.length === 0 || codes.every(has)
        })
    };
});
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    usePathname: () => '/faturamento/99999999-9999-9999-9999-999999999999',
    useSearchParams: () => new URLSearchParams()
}));
// Dependências de outros módulos, fora do recorte deste teste.
vi.mock('@/features/financeiro/hooks/useFinanceiroResources', () => ({
    useCondicoesPagamentoOptions: () => ({ options: [], data: [], isFetching: false, isLoading: false })
}));
vi.mock('@/features/vendas/hooks/useVendasResources', () => ({
    usePedidosVenda: () => ({ data: undefined, isFetching: false, isLoading: false })
}));
vi.mock('@/features/anexos/components/AnexosPanel', () => ({ AnexosPanel: () => null }));
// Controles de seleção simplificados (não estão sob prova); o valor segue pelo mesmo onChange.
vi.mock('@/components/forms/EntitySelect', () => ({
    EntitySelect: ({ id, value, options, onChange, disabled, entityName }: { id?: string; value?: string | null; options: { label: string; value: string }[]; onChange: (value: string | null) => void; disabled?: boolean; entityName: string }) => (
        <select id={id} aria-label={entityName} value={value ?? ''} disabled={disabled} onChange={(event) => onChange(event.target.value || null)}>
            <option value="">Selecione</option>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}));
vi.mock('@/components/forms/DateInput', () => ({
    DateInput: ({ onChange }: { onChange: (value: Date | null) => void }) => (
        <button type="button" onClick={() => onChange(new Date('2026-10-10T00:00:00.000Z'))}>
            Escolher vencimento
        </button>
    )
}));
vi.mock('@/features/fiscal/components/NotaFiscalSerieField', () => ({
    NotaFiscalSerieField: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => <input aria-label="Série" value={value} onChange={(event) => onChange(event.target.value)} />
}));

const empresaId = '11111111-1111-1111-1111-111111111111';
const faturamentoId = '99999999-9999-9999-9999-999999999999';
const naturezaId = '44444444-4444-4444-4444-444444444444';
const motivoSefaz = 'Rejeição 539: duplicidade de NF-e com diferença na chave de acesso';

const faturamentoBase = (overrides: Partial<FaturamentoResponse> = {}): FaturamentoResponse => ({
    id: faturamentoId,
    empresaId,
    filialId: null,
    pedidoVendaId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    notaFiscalId: null,
    contaReceberId: null,
    etapa: 1,
    valorTotal: 251,
    confirmadoEm: null,
    legs: [],
    possuiLegComFalha: false,
    possuiLegRevertido: false,
    etapaDivergeDosLegs: false,
    possuiLegEmReversao: false,
    ...overrides
});

// Resposta 200 do Confirmar com a etapa Erro: legs 1 a 3 integrados, leg 4 (SEFAZ) em falha com motivo.
const faturamentoEmErro = () =>
    faturamentoBase({
        etapa: 7,
        possuiLegComFalha: true,
        legs: [
            { id: 'l1', leg: 1, estado: 1, ocorreuEm: '2026-09-30T10:00:00Z' },
            { id: 'l2', leg: 2, estado: 1, ocorreuEm: '2026-09-30T10:00:01Z' },
            { id: 'l3', leg: 3, estado: 1, ocorreuEm: '2026-09-30T10:00:02Z' },
            { id: 'l4', leg: 4, estado: 2, ocorreuEm: '2026-09-30T10:00:03Z', motivo: motivoSefaz }
        ]
    });

const faturamentoFaturado = () =>
    faturamentoBase({
        etapa: 5,
        confirmadoEm: '2026-09-30T10:00:10Z',
        legs: [1, 2, 3, 4, 5, 6].map((leg) => ({ id: `l${leg}`, leg, estado: 1, ocorreuEm: '2026-09-30T10:00:00Z' }))
    });

type RespostaConfirmar = { tipo: 200; faturamento: FaturamentoResponse; alertas?: string[] } | { tipo: 400 };

describe('Faturamento — detalhe — resultado do Confirmar (AC-4) e erro da API no diálogo (AC-5)', () => {
    const originalAdapter = httpClient.defaults.adapter;
    let atual: FaturamentoResponse;
    let respostaConfirmar: RespostaConfirmar;
    let postsConfirmar: number;

    const preparar = () => {
        permsState.perms = ['FATURAMENTO_CONSULTAR', 'FATURAMENTO_CONFIRMAR', 'FISCAL_CADASTROS_CONSULTAR'];
        atual = faturamentoBase();
        postsConfirmar = 0;
        httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
            const ok = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config });
            const url = config.url ?? '';
            if (config.method === 'get' && url === `/api/faturamento/${faturamentoId}`) return ok(atual);
            if (config.method === 'get' && url === `/api/faturamento/${faturamentoId}/historico`) return ok([]);
            if (config.method === 'get' && url === `/api/faturamento/${faturamentoId}/ocorrencias`) return ok([]);
            if (config.method === 'get' && url === '/api/fiscal/naturezas-operacao') {
                return ok({ items: [{ id: naturezaId, empresaId, codigo: '5102', descricao: 'Venda de mercadoria', ativa: true }], page: 1, pageSize: 200, totalItems: 1, totalPages: 1 });
            }
            if (config.method === 'post' && url === `/api/faturamento/${faturamentoId}/confirmar`) {
                postsConfirmar += 1;
                if (respostaConfirmar.tipo === 400) {
                    const response = {
                        data: { code: 'Faturamento.CfopNaturezaOperacaoNaoInformada', message: 'Natureza de operação não informada para o CFOP.', traceId: 'trace-b71-ac5' },
                        status: 400,
                        statusText: 'Bad Request',
                        headers: new AxiosHeaders(),
                        config
                    };
                    throw new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', config, {}, response);
                }
                // O backend grava o resultado; a reconsulta do detalhe devolve o mesmo estado.
                atual = respostaConfirmar.faturamento;
                return ok({ faturamento: respostaConfirmar.faturamento, alertas: respostaConfirmar.alertas ?? [] });
            }
            throw new Error(`Rota não esperada no teste: ${config.method} ${url}`);
        });
    };

    beforeEach(preparar);

    // Aquecimento: a primeira montagem da página e do diálogo no worker paga a injeção e o parse dos estilos do
    // PrimeReact no jsdom. Medido: sob a carga da varredura de 28 arquivos, só o PRIMEIRO teste do arquivo
    // estourava 5 s (6,8 s e 6,5 s em duas execuções), e os dois seguintes, com o mesmo trabalho, passavam. O custo
    // fica aqui, no limite próprio do hook, e não no teste. Nada é afirmado; nenhum POST sai.
    beforeAll(async () => {
        preparar();
        const user = userEvent.setup({ delay: null });
        const { unmount } = renderPage();
        await user.click(await screen.findByRole('button', { name: 'Confirmar' }));
        const combo = await within(await screen.findByRole('dialog')).findByRole('combobox', { name: 'natureza de operação' });
        await within(combo).findByRole('option', { name: '5102 — Venda de mercadoria' });
        unmount();
        httpClient.defaults.adapter = originalAdapter;
        vi.clearAllMocks();
    }, 30000);

    afterEach(() => {
        httpClient.defaults.adapter = originalAdapter;
        vi.clearAllMocks();
    });

    const renderPage = () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        return render(
            <QueryClientProvider client={queryClient}>
                <FaturamentoDetalhePage faturamentoId={faturamentoId} />
            </QueryClientProvider>
        );
    };

    const abrirPreencherConfirmar = async () => {
        // Sem pausa entre ações (delay: null): sob carga, a pausa padrão por setTimeout estourava o limite de 5 s.
        const user = userEvent.setup({ delay: null });
        renderPage();
        await user.click(await screen.findByRole('button', { name: 'Confirmar' }));
        const dialog = await screen.findByRole('dialog');
        const combo = await within(dialog).findByRole('combobox', { name: 'natureza de operação' });
        await within(combo).findByRole('option', { name: '5102 — Venda de mercadoria' });
        await waitFor(() => expect(combo).toBeEnabled());
        await user.selectOptions(combo, naturezaId);
        // Texto: um change síncrono por campo com o valor inteiro. Os campos de texto não estão sob prova aqui; o
        // que se prova é o que a página faz com a resposta do Confirmar.
        for (const [rotulo, valor] of [['Série', '1'], ['Número *', '1001'], ['UF autorizadora *', 'SP'], ['Unidade comercial padrão *', 'UN']] as const) {
            fireEvent.change(within(dialog).getByLabelText(rotulo), { target: { value: valor } });
        }
        await user.click(within(dialog).getByRole('button', { name: 'Escolher vencimento' }));
        const correlationId = (within(dialog).getByLabelText(FATURAMENTO_CONFIRMAR.correlationIdRotulo) as HTMLInputElement).value;
        await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
        return { user, correlationId };
    };

    const painelResultado = async () => {
        const titulo = await screen.findByText(FATURAMENTO_RESULTADO.cardTitulo);
        const card = titulo.closest('.p-card');
        if (!card) throw new Error('Card do resultado não encontrado.');
        return card as HTMLElement;
    };

    it('AC-4: 200 com etapa Erro e leg 4 em falha NÃO mostra "Faturamento confirmado"; mostra o leg, o motivo e o próximo passo', async () => {
        respostaConfirmar = { tipo: 200, faturamento: faturamentoEmErro(), alertas: ['Alerta devolvido pelo backend na confirmação.'] };
        const { correlationId } = await abrirPreencherConfirmar();

        const painel = await painelResultado();
        expect(within(painel).getByText(`${FATURAMENTO_RESULTADO.tituloErro}. Parou no leg 4 (Transmitir e autorizar na SEFAZ): ${motivoSefaz}`)).toBeInTheDocument();
        expect(within(painel).getByText(FATURAMENTO_RESULTADO.proximoPasso)).toBeInTheDocument();
        expect(within(painel).getByText('Alerta devolvido pelo backend na confirmação.')).toBeInTheDocument();
        expect((within(painel).getByLabelText(FATURAMENTO_RESULTADO.correlationIdRotulo) as HTMLInputElement).value).toBe(correlationId);

        // O toast também lê a etapa real: erro, nunca sucesso.
        expect(toastMock.error).toHaveBeenCalledWith(FATURAMENTO_RESULTADO.tituloErro, `Parou no leg 4 (Transmitir e autorizar na SEFAZ): ${motivoSefaz}`);
        expect(toastMock.success).not.toHaveBeenCalled();
        expect(screen.queryByText(/Faturamento confirmado/)).not.toBeInTheDocument();
        expect(postsConfirmar).toBe(1);
    });

    it('AC-4: 200 com etapa Faturado mostra "Faturamento confirmado" no toast e no painel', async () => {
        respostaConfirmar = { tipo: 200, faturamento: faturamentoFaturado() };
        await abrirPreencherConfirmar();

        const painel = await painelResultado();
        expect(within(painel).getByText(`${FATURAMENTO_RESULTADO.tituloFaturado}. ${FATURAMENTO_RESULTADO.detalheFaturado}`)).toBeInTheDocument();
        expect(within(painel).queryByText(FATURAMENTO_RESULTADO.proximoPasso)).not.toBeInTheDocument();
        expect(toastMock.success).toHaveBeenCalledWith(FATURAMENTO_RESULTADO.tituloFaturado, FATURAMENTO_RESULTADO.detalheFaturado);
        expect(toastMock.error).not.toHaveBeenCalled();
    });

    it('AC-5: 400 do Confirmar aparece no ApiErrorPanel do diálogo com código, status e traceId; o diálogo fica aberto', async () => {
        respostaConfirmar = { tipo: 400 };
        await abrirPreencherConfirmar();

        const dialog = screen.getByRole('dialog');
        expect(await within(dialog).findByText('Natureza de operação não informada para o CFOP.')).toBeInTheDocument();
        expect(within(dialog).getByText('Código: Faturamento.CfopNaturezaOperacaoNaoInformada • HTTP 400 • Trace: trace-b71-ac5')).toBeInTheDocument();
        expect(screen.queryByText(FATURAMENTO_RESULTADO.cardTitulo)).not.toBeInTheDocument();
        expect(toastMock.success).not.toHaveBeenCalled();
    });
});
