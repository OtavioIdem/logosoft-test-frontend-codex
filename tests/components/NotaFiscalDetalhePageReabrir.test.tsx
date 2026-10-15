import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotaFiscalDetalhePage } from '@/features/fiscal/components/NotaFiscalDetalhePage';
import { NotaFiscalResponse, ResumoOperacionalNotaFiscalResponse } from '@/features/fiscal/types/fiscal.types';
import { OrigemNotaFiscal, StatusNotaFiscal, TipoDocumentoFiscal, TipoOperacaoFiscal } from '@/types/erp';

// AC-4 (v1.11.0a8b76, QA-1): o botão "Reabrir nota" depende de duas coisas ao mesmo tempo: a permissão FISCAL_GERENCIAR
// (PermissionGuard) e `resolveReabrirNotaActionState(resumo)`, que lê `acoes.podeReabrir` do backend.
const { toastMock, permsState, hooksState } = vi.hoisted(() => ({
    toastMock: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn() },
    permsState: { perms: [] as string[] },
    hooksState: { nota: undefined as unknown, resumo: undefined as unknown }
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

// Fronteira de dados: os hooks de consulta e mutação são a camada externa da página. A regra de reabertura
// (resolveReabrirNotaActionState) e o guard de permissão são exercitados de verdade.
vi.mock('@/features/fiscal/hooks/useFiscalResources', () => {
    const query = (data: unknown) => ({ data, isLoading: false, isFetching: false, error: null, refetch: vi.fn() });
    const mutacao = { mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false };
    return {
        useNotaFiscal: () => query(hooksState.nota),
        useNotaFiscalResumo: () => query(hooksState.resumo),
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

const notaValidada = (): NotaFiscalResponse => ({
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
    statusFiscal: StatusNotaFiscal.Validada,
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

const resumoComPodeReabrir = (podeReabrir?: boolean): ResumoOperacionalNotaFiscalResponse => ({
    notaFiscalId: notaId,
    empresaId: '11111111-1111-1111-1111-111111111111',
    filialId: null,
    tipoDocumento: TipoDocumentoFiscal.NFe,
    serie: '1',
    numero: '1001',
    statusFiscal: StatusNotaFiscal.Validada,
    origem: OrigemNotaFiscal.Manual,
    origemId: null,
    possuiXmlEnvio: false,
    possuiXmlAutorizado: false,
    possuiDanfe: false,
    acoes: {
        podeValidar: false,
        podeGerarXmlEnvio: false,
        podeAssinarXmlEnvio: false,
        podeTransmitirSefaz: false,
        podeGerarDanfe: false,
        podeBaixarEstoque: false,
        podeGerarContaReceber: false,
        podeCancelar: false,
        podeEmitirCartaCorrecao: false,
        ...(podeReabrir === undefined ? {} : { podeReabrir })
    }
});

const MOTIVO_REABERTURA_INDISPONIVEL = 'A reabertura não está disponível para esta nota conforme o resumo operacional retornado pelo backend.';
const MOTIVO_REABERTURA_AGUARDANDO = 'Aguardando o resumo operacional da nota para liberar a reabertura.';

const renderPagina = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <NotaFiscalDetalhePage notaId={notaId} />
        </QueryClientProvider>
    );

describe('AC-4 (v1.11.0a8b76): botão Reabrir nota da página fiscal', () => {
    beforeEach(() => {
        permsState.perms = ['FISCAL_CONSULTAR'];
        hooksState.nota = notaValidada();
        hooksState.resumo = undefined;
        toastMock.success.mockClear();
        toastMock.error.mockClear();
    });

    it('habilita o botão quando a sessão tem FISCAL_GERENCIAR e o backend devolve podeReabrir = true', async () => {
        permsState.perms = ['FISCAL_CONSULTAR', 'FISCAL_GERENCIAR'];
        hooksState.resumo = resumoComPodeReabrir(true);

        renderPagina();

        const botao = await screen.findByRole('button', { name: 'Reabrir nota' });
        expect(botao).toBeEnabled();
    });

    it('mantém o botão desabilitado e mostra o motivo do resumo quando podeReabrir = false, mesmo com FISCAL_GERENCIAR', async () => {
        permsState.perms = ['FISCAL_CONSULTAR', 'FISCAL_GERENCIAR'];
        hooksState.resumo = resumoComPodeReabrir(false);

        renderPagina();

        const botao = await screen.findByRole('button', { name: 'Reabrir nota' });
        expect(botao).toBeDisabled();
        expect(botao).toHaveAttribute('title', MOTIVO_REABERTURA_INDISPONIVEL);
    });

    it('mantém o botão desabilitado quando o resumo não traz podeReabrir (campo aditivo ausente)', async () => {
        permsState.perms = ['FISCAL_CONSULTAR', 'FISCAL_GERENCIAR'];
        hooksState.resumo = resumoComPodeReabrir();

        renderPagina();

        const botao = await screen.findByRole('button', { name: 'Reabrir nota' });
        expect(botao).toBeDisabled();
        expect(botao).toHaveAttribute('title', MOTIVO_REABERTURA_INDISPONIVEL);
    });

    it('mantém o botão desabilitado com motivo de espera enquanto o resumo ainda não chegou', async () => {
        permsState.perms = ['FISCAL_CONSULTAR', 'FISCAL_GERENCIAR'];
        hooksState.resumo = undefined;

        renderPagina();

        const botao = await screen.findByRole('button', { name: 'Reabrir nota' });
        expect(botao).toBeDisabled();
        expect(botao).toHaveAttribute('title', MOTIVO_REABERTURA_AGUARDANDO);
    });

    it('desabilita o botão sem FISCAL_GERENCIAR, mesmo com podeReabrir = true, e informa a permissão exigida', async () => {
        permsState.perms = ['FISCAL_CONSULTAR'];
        hooksState.resumo = resumoComPodeReabrir(true);

        renderPagina();

        const botao = await screen.findByRole('button', { name: 'Reabrir nota' });
        expect(botao).toBeDisabled();
        expect(botao).toHaveAttribute('title', 'Permissão necessária: FISCAL_GERENCIAR.');
    });
});
