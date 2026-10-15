import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotaFiscalDetalhePage } from '@/features/fiscal/components/NotaFiscalDetalhePage';
import { MOTIVO_EDICAO_ITENS_INDISPONIVEL } from '@/features/fiscal/components/fiscalUiUtils';
import { NotaFiscalResponse } from '@/features/fiscal/types/fiscal.types';
import { OrigemNotaFiscal, StatusNotaFiscal, TipoDocumentoFiscal, TipoOperacaoFiscal } from '@/types/erp';

// R2 (v1.11.0a8b76): os botões "Item" e "Imposto" só editam com a nota em Rascunho. O motivo do bloqueio
// aparece no `title` do botão, vindo de notaEditarItensDisabledReason. Mesmo padrão de mocks de
// NotaFiscalDetalhePageReabrir.test.tsx: a regra e o guard de permissão rodam de verdade.
const { toastMock, permsState, hooksState } = vi.hoisted(() => ({
    toastMock: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn() },
    permsState: { perms: [] as string[] },
    hooksState: { nota: undefined as unknown }
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
    usePathname: () => '/fiscal/notas/99999999-9999-9999-9999-999999999999',
    useSearchParams: () => new URLSearchParams()
}));

// Fronteira de dados: apenas os hooks de consulta e mutação são substituídos.
vi.mock('@/features/fiscal/hooks/useFiscalResources', () => {
    const query = (data: unknown) => ({ data, isLoading: false, isFetching: false, error: null, refetch: vi.fn() });
    const mutacao = { mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false };
    return {
        useNotaFiscal: () => query(hooksState.nota),
        useNotaFiscalResumo: () => query(undefined),
        useNotaFiscalWorkflow: () => query(null),
        useNotaFiscalIntegracoes: () => query([]),
        useFiscalMutations: () => new Proxy({}, { get: () => mutacao })
    };
});

// Dependências de outros módulos montadas pelos diálogos fiscais (fechados, mas instanciados); fora do recorte.
vi.mock('@/features/produtos/hooks/useProdutosResources', () => ({
    useProdutos: () => ({ data: [], isFetching: false, isLoading: false })
}));
vi.mock('@/features/financeiro/hooks/useFinanceiroResources', () => ({
    useCondicoesPagamentoOptions: () => ({ options: [], data: [], isFetching: false, isLoading: false })
}));

const notaId = '99999999-9999-9999-9999-999999999999';

const notaComStatus = (statusFiscal: StatusNotaFiscal): NotaFiscalResponse => ({
    id: notaId,
    empresaId: '11111111-1111-1111-1111-111111111111',
    filialId: null,
    tipoDocumento: TipoDocumentoFiscal.NFe,
    tipoOperacao: TipoOperacaoFiscal.Venda,
    origem: OrigemNotaFiscal.Manual,
    origemId: null,
    serie: '1',
    numero: '1001',
    chaveAcesso: null,
    protocoloAutorizacao: null,
    dataEmissao: '2026-05-18T10:00:00-03:00',
    autorizadaEm: null,
    canceladaEm: null,
    statusFiscal,
    valorProdutos: 0,
    valorDesconto: 0,
    valorFrete: 0,
    valorSeguro: 0,
    valorOutrasDespesas: 0,
    valorTotal: 0,
    codigoRejeicao: null,
    mensagemRejeicao: null,
    motivoCancelamento: null,
    observacao: null,
    itens: [],
    impostos: [],
    xmls: [],
    eventos: []
});

const renderPagina = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <NotaFiscalDetalhePage notaId={notaId} />
        </QueryClientProvider>
    );

describe('R2 (v1.11.0a8b76): botões Item e Imposto da página fiscal', () => {
    beforeEach(() => {
        permsState.perms = ['FISCAL_CONSULTAR', 'FISCAL_GERENCIAR'];
        hooksState.nota = notaComStatus(StatusNotaFiscal.Rascunho);
        toastMock.success.mockClear();
        toastMock.error.mockClear();
    });

    it('desabilita Item e Imposto com o motivo da constante quando a nota está Validada', async () => {
        hooksState.nota = notaComStatus(StatusNotaFiscal.Validada);

        renderPagina();

        const item = await screen.findByRole('button', { name: 'Item' });
        const imposto = screen.getByRole('button', { name: 'Imposto' });
        expect(item).toBeDisabled();
        expect(item).toHaveAttribute('title', MOTIVO_EDICAO_ITENS_INDISPONIVEL);
        expect(imposto).toBeDisabled();
        expect(imposto).toHaveAttribute('title', MOTIVO_EDICAO_ITENS_INDISPONIVEL);
    });

    it('habilita Item e Imposto quando a nota está em Rascunho e a sessão tem FISCAL_GERENCIAR', async () => {
        renderPagina();

        const item = await screen.findByRole('button', { name: 'Item' });
        const imposto = screen.getByRole('button', { name: 'Imposto' });
        expect(item).toBeEnabled();
        expect(imposto).toBeEnabled();
    });
});
