import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FaturamentoDetalhePage } from '@/features/faturamento/components/FaturamentoDetalhePage';
import { ProntidaoFaturamentoPanel } from '@/features/faturamento/components/ProntidaoFaturamentoPanel';
import { faturamentoApi } from '@/features/faturamento/api/faturamentoApi';
import { administracaoApi } from '@/features/administracao/api/administracaoApi';
import { FATURAMENTO_PRONTIDAO, PRONTIDAO_RECURSO_ROTULO } from '@/features/faturamento/components/faturamentoLabels';
import type { FaturamentoResponse, ProntidaoFaturamentoResponse } from '@/features/faturamento/types/faturamento.types';

// D113 — painel de LEITURA da prontidão no detalhe do faturamento (AC-8). Consulta só com o pedido; não confirma
// nada. Os dados chegam por `faturamentoApi` (spy na API real, cujo cliente tem teste unitário próprio).

const { permsState } = vi.hoisted(() => ({ permsState: { perms: [] as string[] } }));

vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => ({ success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn() }) }));
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
vi.mock('@/hooks/useOrganizationalContext', () => ({
    useOrganizationalContext: () => ({ snapshot: { empresaId: '11111111-1111-1111-1111-111111111111', filialId: null, isMaster: false, revision: 0 } })
}));
vi.mock('@/lib/api/healthApi', () => ({
    healthApi: { check: async () => ({ status: 'ok', service: 'LogoSoft', utcNow: '2026-09-30T10:00:00Z', fiscal: { mock: false, ambiente: 'homologacao' } }) }
}));
vi.mock('@/features/administracao/api/administracaoApi', () => ({
    administracaoApi: { listarEmpresas: vi.fn(async () => []), listarFiliais: vi.fn(async () => []) }
}));
vi.mock('@/features/financeiro/hooks/useFinanceiroResources', () => ({
    useCondicoesPagamentoOptions: () => ({ options: [], data: [], isFetching: false, isLoading: false })
}));
vi.mock('@/features/vendas/hooks/useVendasResources', () => ({
    usePedidosVenda: () => ({ data: undefined, isFetching: false, isLoading: false })
}));
vi.mock('@/features/anexos/components/AnexosPanel', () => ({ AnexosPanel: () => null }));

const faturamentoId = '99999999-9999-9999-9999-999999999999';
const pedidoVendaId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const PENDENCIAS: ProntidaoFaturamentoResponse = {
    pronto: false,
    avaliacao: 'PrimeiraConfirmacao',
    pendencias: [
        { etapa: 'Natureza', codigo: 'n1', mensagem: 'Natureza sem CFOP', recurso: 'NaturezasOperacao', recursoId: null },
        { etapa: 'Produto', codigo: 'p1', mensagem: 'Produto sem NCM', recurso: 'Produtos', recursoId: null }
    ]
};

const faturamento = (etapa: number): FaturamentoResponse => ({
    id: faturamentoId,
    empresaId: '11111111-1111-1111-1111-111111111111',
    filialId: null,
    pedidoVendaId,
    notaFiscalId: null,
    contaReceberId: null,
    etapa,
    valorTotal: 251,
    confirmadoEm: null,
    confirmadoPor: null,
    canceladoEm: null,
    canceladoPor: null,
    motivoCancelamento: null,
    legs: [{ id: 'l1', leg: 1, estado: 1, ocorreuEm: '2026-09-14T09:00:00Z' }],
    possuiLegComFalha: false,
    possuiLegRevertido: false,
    etapaDivergeDosLegs: false,
    possuiLegEmReversao: false
});

const erroHttp = (status: number, data: unknown) => {
    const response = { status, statusText: 'Erro', headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() }, data } as AxiosResponse;
    return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', undefined, undefined, response);
};

const renderPanel = (pedido: string | null = pedidoVendaId) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ProntidaoFaturamentoPanel pedidoVendaId={pedido} />
        </QueryClientProvider>
    );
};

describe('Detalhe — painel de leitura da prontidão (D113, AC-8)', () => {
    const prontidao = () => vi.mocked(faturamentoApi.prontidao);

    beforeEach(() => {
        permsState.perms = ['FATURAMENTO_CONSULTAR', 'PRODUTOS_CONSULTAR'];
        vi.spyOn(faturamentoApi, 'prontidao').mockResolvedValue(PENDENCIAS);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('a leitura consulta SÓ com o pedido: os parâmetros do Confirmar não entram aqui', async () => {
        renderPanel();

        await waitFor(() => expect(prontidao()).toHaveBeenCalled());
        expect(prontidao().mock.calls[0][0]).toEqual({ pedidoVendaId });
    });

    it('pendências agrupadas; "informe no Confirmar" só nas de natureza e regra fiscal; nenhum botão de confirmar', async () => {
        renderPanel();

        expect(await screen.findByText('Natureza sem CFOP')).toBeInTheDocument();
        const itens = screen.getAllByRole('listitem');
        const natureza = itens.find((item) => item.textContent?.includes('Natureza sem CFOP')) as HTMLElement;
        const produto = itens.find((item) => item.textContent?.includes('Produto sem NCM')) as HTMLElement;
        expect(within(natureza).getByText(FATURAMENTO_PRONTIDAO.informeNoConfirmar)).toBeInTheDocument();
        expect(within(produto).queryByText(FATURAMENTO_PRONTIDAO.informeNoConfirmar)).toBeNull();

        // Leitura: nada confirma daqui.
        expect(screen.queryByRole('button', { name: 'Confirmar' })).toBeNull();
    });

    it('recurso conhecido linka a tela que corrige', async () => {
        renderPanel();

        expect(await screen.findByRole('link', { name: PRONTIDAO_RECURSO_ROTULO.Produtos })).toHaveAttribute('href', '/produtos');
    });

    it('sem a permissão da tela de produtos, não há link e aparece o aviso de quem pode corrigir', async () => {
        permsState.perms = ['FATURAMENTO_CONSULTAR'];
        renderPanel();

        expect(await screen.findByText('Produto sem NCM')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: PRONTIDAO_RECURSO_ROTULO.Produtos })).toBeNull();
        expect(screen.getByText(/Peça a quem tem acesso a Produtos e catálogo para corrigir\./)).toBeInTheDocument();
    });

    it('pronto = true mostra o texto de leitura e nenhuma pendência', async () => {
        prontidao().mockResolvedValue({ pronto: true, avaliacao: 'PrimeiraConfirmacao', pendencias: [] });
        renderPanel();

        expect(await screen.findByText(FATURAMENTO_PRONTIDAO.prontoLeitura)).toBeInTheDocument();
        expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    });

    it('Reconferir refaz a consulta', async () => {
        const user = userEvent.setup({ delay: null });
        renderPanel();
        await screen.findByText('Natureza sem CFOP');

        await user.click(screen.getByRole('button', { name: FATURAMENTO_PRONTIDAO.reconferir }));

        await waitFor(() => expect(prontidao()).toHaveBeenCalledTimes(2));
    });

    it('sem pedido vinculado, não consulta e avisa que a prontidão não pode ser conferida', async () => {
        renderPanel(null);

        expect(await screen.findByText(FATURAMENTO_PRONTIDAO.semPedido)).toBeInTheDocument();
        expect(prontidao()).not.toHaveBeenCalled();
    });

    it('404: mensagem genérica de pedido fora do contexto, sem lista de pendências', async () => {
        prontidao().mockRejectedValue(erroHttp(404, { code: 'Recurso.NaoEncontrado', message: 'Pedido não encontrado.', traceId: 'trace-404' }));
        renderPanel();

        expect(await screen.findByText(FATURAMENTO_PRONTIDAO.erroNaoEncontrado)).toBeInTheDocument();
        expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    });
});

describe('Detalhe da página — o painel aparece só enquanto o faturamento pode ser confirmado (AC-8)', () => {
    beforeEach(() => {
        permsState.perms = ['FATURAMENTO_CONSULTAR'];
        vi.mocked(administracaoApi.listarEmpresas).mockClear();
        vi.mocked(administracaoApi.listarFiliais).mockClear();
        vi.spyOn(faturamentoApi, 'historico').mockResolvedValue([]);
        vi.spyOn(faturamentoApi, 'ocorrencias').mockResolvedValue([]);
        vi.spyOn(faturamentoApi, 'prontidao').mockResolvedValue(PENDENCIAS);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const renderPage = (etapa: number) => {
        vi.spyOn(faturamentoApi, 'obter').mockResolvedValue(faturamento(etapa));
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        return render(
            <QueryClientProvider client={queryClient}>
                <FaturamentoDetalhePage faturamentoId={faturamentoId} />
            </QueryClientProvider>
        );
    };

    it('etapa Rascunho/Pendente (pode confirmar): o painel de prontidão aparece no detalhe', async () => {
        renderPage(2);

        expect(await screen.findByRole('region', { name: FATURAMENTO_PRONTIDAO.titulo })).toBeInTheDocument();
    });

    it('etapa Faturado: o painel não aparece', async () => {
        renderPage(5);

        expect(await screen.findByText('Legs de integração')).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: FATURAMENTO_PRONTIDAO.titulo })).toBeNull();
    });

    it('Confirmar fechado, com ADMINISTRACAO_CONSULTAR: nenhuma consulta de administração sai do diálogo; a prontidão só tem a do painel (só o pedido)', async () => {
        permsState.perms.push('ADMINISTRACAO_CONSULTAR');
        renderPage(2);

        expect(await screen.findByRole('region', { name: FATURAMENTO_PRONTIDAO.titulo })).toBeInTheDocument();
        await waitFor(() => expect(vi.mocked(faturamentoApi.prontidao)).toHaveBeenCalled());

        // O diálogo está fechado: empresas e filiais não são consultadas por ele.
        expect(vi.mocked(administracaoApi.listarEmpresas)).not.toHaveBeenCalled();
        expect(vi.mocked(administracaoApi.listarFiliais)).not.toHaveBeenCalled();
        // Só a consulta do painel de leitura (parâmetros só com o pedido); o diálogo não consultou com os seus.
        const chamadas = vi.mocked(faturamentoApi.prontidao).mock.calls;
        expect(chamadas).toHaveLength(1);
        expect(chamadas[0][0]).toEqual({ pedidoVendaId });
    });

    it('etapa Cancelado: o painel não aparece', async () => {
        renderPage(6);

        expect(await screen.findByText('Legs de integração')).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: FATURAMENTO_PRONTIDAO.titulo })).toBeNull();
    });
});
