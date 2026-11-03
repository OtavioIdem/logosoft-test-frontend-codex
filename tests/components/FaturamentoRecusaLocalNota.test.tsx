import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FaturamentoDetalhePage } from '@/features/faturamento/components/FaturamentoDetalhePage';
import { FATURAMENTO_CONFIRMAR, FATURAMENTO_RESULTADO } from '@/features/faturamento/components/faturamentoLabels';
import { httpClient } from '@/lib/http/httpClient';
import type { FaturamentoResponse } from '@/features/faturamento/types/faturamento.types';

// Emenda QA-01 da D113, na página REAL: detalhe, resultado do Confirmar e toast. A recusa local vem do
// `codigoRejeicao` da NOTA (`GET /api/fiscal/notas-fiscais/{id}`), lido só com FISCAL_CONSULTAR e com o leg 4 em Falhou.
// O motivo do leg 4 é o texto REAL do backend (`ConfirmarFaturamentoUseCase.cs:277`), que nunca traz RECUSA_LOCAL.
// O adapter do axios é a única troca: conta cada GET da nota e responde o que o teste escolhe.

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
vi.mock('@/hooks/useOrganizationalContext', () => ({
    useOrganizationalContext: () => ({ snapshot: { empresaId: '11111111-1111-1111-1111-111111111111', filialId: null, isMaster: false, revision: 0 } })
}));
vi.mock('@/lib/api/healthApi', () => ({
    healthApi: { check: async () => ({ status: 'ok', service: 'LogoSoft', utcNow: '2026-09-30T10:00:00Z', fiscal: { mock: false, ambiente: 'homologacao' } }) }
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    usePathname: () => '/faturamento/99999999-9999-9999-9999-999999999999',
    useSearchParams: () => new URLSearchParams()
}));
vi.mock('@/features/financeiro/hooks/useFinanceiroResources', () => ({
    useCondicoesPagamentoOptions: () => ({ options: [], data: [], isFetching: false, isLoading: false })
}));
vi.mock('@/features/vendas/hooks/useVendasResources', () => ({
    usePedidosVenda: () => ({ data: undefined, isFetching: false, isLoading: false })
}));
vi.mock('@/features/anexos/components/AnexosPanel', () => ({ AnexosPanel: () => null }));
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
const notaId = '77777777-7777-7777-7777-777777777777';
const naturezaId = '44444444-4444-4444-4444-444444444444';
const MOTIVO_CSTAT_VAZIO = 'Nota fiscal rejeitada pela SEFAZ. Código: . Motivo: Certificado digital vencido.';

const legsIntegradosExceto4 = [1, 2, 3].map((leg) => ({ id: `l${leg}`, leg, estado: 1, ocorreuEm: '2026-09-30T10:00:00Z' }));
const leg4Falho = { id: 'l4', leg: 4, estado: 2, ocorreuEm: '2026-09-30T10:00:03Z', motivo: MOTIVO_CSTAT_VAZIO };

const faturamentoBase = (overrides: Partial<FaturamentoResponse> = {}): FaturamentoResponse => ({
    id: faturamentoId,
    empresaId,
    filialId: null,
    pedidoVendaId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    notaFiscalId: null,
    contaReceberId: null,
    etapa: 2,
    valorTotal: 251,
    confirmadoEm: null,
    confirmadoPor: null,
    canceladoEm: null,
    canceladoPor: null,
    motivoCancelamento: null,
    legs: [],
    possuiLegComFalha: false,
    possuiLegRevertido: false,
    etapaDivergeDosLegs: false,
    possuiLegEmReversao: false,
    ...overrides
});

// Faturamento com o leg 4 em Falhou e a nota gravada (etapa Erro, como o backend devolve).
const faturamentoComLeg4Falho = (): FaturamentoResponse => faturamentoBase({ etapa: 7, notaFiscalId: notaId, possuiLegComFalha: true, legs: [...legsIntegradosExceto4, leg4Falho] });

describe('Faturamento — recusa local lida da nota (emenda QA-01 da D113)', () => {
    const originalAdapter = httpClient.defaults.adapter;
    let atual: FaturamentoResponse;
    let respostaConfirmar: FaturamentoResponse;
    let notaModo: 'recusa' | 'erro500';
    let notaChamadas: string[];
    let postsConfirmar: number;

    const preparar = (perms: string[]) => {
        permsState.perms = perms;
        atual = faturamentoComLeg4Falho();
        respostaConfirmar = faturamentoComLeg4Falho();
        notaModo = 'recusa';
        notaChamadas = [];
        postsConfirmar = 0;
        httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
            const ok = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config });
            const url = config.url ?? '';
            if (config.method === 'get' && url === `/api/faturamento/${faturamentoId}`) return ok(atual);
            if (config.method === 'get' && (url === `/api/faturamento/${faturamentoId}/historico` || url === `/api/faturamento/${faturamentoId}/ocorrencias`)) return ok([]);
            if (config.method === 'get' && url === '/api/fiscal/naturezas-operacao') {
                return ok({ items: [{ id: naturezaId, empresaId, filialId: null, codigo: '5102', descricao: 'Venda de mercadoria', tipoDocumento: 1, tipoOperacao: 1, finalidade: 1, indicadorPresencaComprador: 1, indicadorConsumidorFinal: false, movimentaEstoque: true, geraFinanceiro: true, observacao: null, ativa: true, cfops: [{ ambito: 1, cfopId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', cfopCodigo: '5102', tipoItem: null }] }], page: 1, pageSize: 200, totalItems: 1, totalPages: 1 });
            }
            if (config.method === 'get' && url === '/api/administracao/empresas') return ok([]);
            if (config.method === 'get' && url === '/api/faturamento/prontidao') return ok({ pronto: true, avaliacao: 'PrimeiraConfirmacao', pendencias: [] });
            if (config.method === 'get' && url.startsWith('/api/fiscal/notas-fiscais/')) {
                notaChamadas.push(url);
                if (notaModo === 'erro500') {
                    const response = { data: { code: 'Erro.Interno', message: 'Falha interna da leitura da nota.', traceId: 'trace-nota' }, status: 500, statusText: 'Erro', headers: new AxiosHeaders(), config };
                    throw new AxiosError('Request failed with status code 500', 'ERR_BAD_REQUEST', config, {}, response);
                }
                // A nota gravada: `codigoRejeicao` é o que o backend guarda na recusa local (FiscalSefazUseCases.cs:268).
                return ok({ id: notaId, codigoRejeicao: 'RECUSA_LOCAL' });
            }
            if (config.method === 'post' && url === `/api/faturamento/${faturamentoId}/confirmar`) {
                postsConfirmar += 1;
                return ok({ faturamento: respostaConfirmar, alertas: [MOTIVO_CSTAT_VAZIO] });
            }
            throw new Error(`Rota não esperada no teste: ${config.method} ${url}`);
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        preparar(['FATURAMENTO_CONSULTAR', 'FATURAMENTO_CONFIRMAR', 'FISCAL_CADASTROS_CONSULTAR', 'FISCAL_CONSULTAR']);
    });

    afterEach(() => {
        httpClient.defaults.adapter = originalAdapter;
    });

    const renderPage = () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        return render(
            <QueryClientProvider client={queryClient}>
                <FaturamentoDetalhePage faturamentoId={faturamentoId} />
            </QueryClientProvider>
        );
    };

    const colar = async (user: ReturnType<typeof userEvent.setup>, campo: HTMLElement, texto: string) => {
        await user.click(campo);
        await user.paste(texto);
    };

    // Abre o Confirmar, preenche e confirma (mesmo caminho da página). Sem pausa entre ações.
    const confirmarNaPagina = async () => {
        const user = userEvent.setup({ delay: null });
        renderPage();
        await user.click(await screen.findByRole('button', { name: 'Confirmar' }));
        const dialog = await screen.findByRole('dialog');
        const combo = await within(dialog).findByRole('combobox', { name: 'natureza de operação' });
        await within(combo).findByRole('option', { name: '5102 — Venda de mercadoria' });
        await waitFor(() => expect(combo).toBeEnabled());
        await user.selectOptions(combo, naturezaId);
        for (const [rotulo, valor] of [['Série', '1'], ['Número *', '1001'], ['UF autorizadora *', 'SP'], ['Unidade comercial padrão *', 'UN']] as const) {
            fireEvent.change(within(dialog).getByLabelText(rotulo), { target: { value: valor } });
        }
        await user.click(within(dialog).getByRole('button', { name: 'Escolher vencimento' }));
        await waitFor(() => expect(within(dialog).getByRole('button', { name: FATURAMENTO_CONFIRMAR.rotuloConfirmar })).toBeEnabled(), { timeout: 3000 });
        await user.click(within(dialog).getByRole('button', { name: FATURAMENTO_CONFIRMAR.rotuloConfirmar }));
    };

    describe('Detalhe (sem confirmar)', () => {
        it('com FISCAL_CONSULTAR e a nota RECUSA_LOCAL: o leg mostra o texto da recusa local, e o motivo do backend não aparece', async () => {
            renderPage();

            expect((await screen.findAllByText(FATURAMENTO_RESULTADO.recusaLocal, { exact: false })).length).toBeGreaterThanOrEqual(1);
            expect(notaChamadas).toEqual([`/api/fiscal/notas-fiscais/${notaId}`]);
            expect(screen.queryByText(/rejeitada pela SEFAZ/i)).toBeNull();
        });

        it('sem FISCAL_CONSULTAR: nenhum GET à nota sai, e o motivo cru aparece', async () => {
            preparar(['FATURAMENTO_CONSULTAR', 'FISCAL_CADASTROS_CONSULTAR']);
            renderPage();

            expect((await screen.findAllByText(MOTIVO_CSTAT_VAZIO, { exact: false })).length).toBeGreaterThanOrEqual(1);
            expect(screen.queryByText(FATURAMENTO_RESULTADO.recusaLocal, { exact: false })).toBeNull();
            expect(notaChamadas).toEqual([]);
        });

        it('leitura da nota em 500: o motivo cru aparece e a página segue montada', async () => {
            notaModo = 'erro500';
            renderPage();

            expect((await screen.findAllByText(MOTIVO_CSTAT_VAZIO, { exact: false })).length).toBeGreaterThanOrEqual(1);
            expect(screen.queryByText(FATURAMENTO_RESULTADO.recusaLocal, { exact: false })).toBeNull();
            expect(await screen.findByText('Legs de integração')).toBeInTheDocument();
            expect(notaChamadas).toHaveLength(1);
        });

        it('leg 4 sem falha: nenhum GET da nota sai, mesmo com a nota gravada e a permissão', async () => {
            atual = faturamentoBase({ etapa: 5, notaFiscalId: notaId, confirmadoEm: '2026-09-30T10:00:10Z', legs: [1, 2, 3, 4, 5, 6].map((leg) => ({ id: `l${leg}`, leg, estado: 1, ocorreuEm: '2026-09-30T10:00:00Z' })) });
            renderPage();

            expect(await screen.findByText('Legs de integração')).toBeInTheDocument();
            expect(notaChamadas).toEqual([]);
        });
    });

    describe('Resultado do Confirmar e toast', () => {
        it('com FISCAL_CONSULTAR e a nota RECUSA_LOCAL: o resultado e o toast usam o texto da recusa local', async () => {
            await confirmarNaPagina();

            await waitFor(() => expect(toastMock.error).toHaveBeenCalledTimes(1));
            // O toast espera a leitura da nota antes de montar o resumo: o texto da recusa local já está nele.
            expect(toastMock.error).toHaveBeenCalledWith(FATURAMENTO_RESULTADO.tituloErro, expect.stringContaining(FATURAMENTO_RESULTADO.recusaLocal));
            expect(toastMock.error.mock.calls[0][1]).not.toContain('rejeitada pela SEFAZ');
            expect((await screen.findAllByText(FATURAMENTO_RESULTADO.recusaLocal, { exact: false })).length).toBeGreaterThanOrEqual(1);
            expect(screen.queryByText(/rejeitada pela SEFAZ/i)).toBeNull();
            expect(postsConfirmar).toBe(1);
            // Toda leitura sai para a nota gravada. Achado: o toast (fetchQuery) e o hook do resultado podem pedir a
            // mesma nota duas vezes; a asserção fixa só o destino, não o número, até o builder decidir dedupe.
            expect(notaChamadas.length).toBeGreaterThanOrEqual(1);
            expect(notaChamadas.every((url) => url === `/api/fiscal/notas-fiscais/${notaId}`)).toBe(true);
        });

        it('sem FISCAL_CONSULTAR: o toast e o resultado mostram o motivo cru, sem afirmar recusa local', async () => {
            preparar(['FATURAMENTO_CONSULTAR', 'FATURAMENTO_CONFIRMAR', 'FISCAL_CADASTROS_CONSULTAR']);
            await confirmarNaPagina();

            await waitFor(() => expect(toastMock.error).toHaveBeenCalledTimes(1));
            expect(toastMock.error.mock.calls[0][1]).toContain(MOTIVO_CSTAT_VAZIO);
            expect(toastMock.error.mock.calls[0][1]).not.toContain(FATURAMENTO_RESULTADO.recusaLocal);
            expect(notaChamadas).toEqual([]);
        });
    });
});
