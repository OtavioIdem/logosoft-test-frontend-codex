import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FaturamentoDetalhePage } from '@/features/faturamento/components/FaturamentoDetalhePage';
import { faturamentoApi } from '@/features/faturamento/api/faturamentoApi';
import { FaturamentoResponse } from '@/features/faturamento/types/faturamento.types';

const { toastMock, permsState } = vi.hoisted(() => ({
    toastMock: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn() },
    permsState: { perms: [] as string[] }
}));

vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => toastMock }));

vi.mock('@/features/faturamento/api/faturamentoApi', () => ({
    faturamentoApi: {
        obter: vi.fn(),
        historico: vi.fn(),
        ocorrencias: vi.fn(),
        retomarReversao: vi.fn(),
        confirmar: vi.fn(),
        cancelar: vi.fn(),
        preparar: vi.fn(),
        listar: vi.fn()
    }
}));

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

// Dependências de outros módulos puxadas pelos diálogos e pelo painel de anexos; fora do recorte.
vi.mock('@/features/financeiro/hooks/useFinanceiroResources', () => ({
    useCondicoesPagamentoOptions: () => ({ options: [], data: [], isFetching: false, isLoading: false })
}));
vi.mock('@/features/vendas/hooks/useVendasResources', () => ({
    usePedidosVenda: () => ({ data: undefined, isFetching: false, isLoading: false })
}));
vi.mock('@/features/anexos/components/AnexosPanel', () => ({ AnexosPanel: () => null }));

const api = vi.mocked(faturamentoApi);
const faturamentoId = '99999999-9999-9999-9999-999999999999';

const baseFaturamento = (overrides: Partial<FaturamentoResponse> = {}): FaturamentoResponse => ({
    id: faturamentoId,
    empresaId: '11111111-1111-1111-1111-111111111111',
    filialId: '22222222-2222-2222-2222-222222222222',
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
    legs: [
        { id: 'l1', leg: 1, estado: 1, ocorreuEm: '2026-09-14T09:00:00Z' },
        { id: 'l2', leg: 2, estado: 2, ocorreuEm: '2026-09-14T09:10:00Z', motivo: 'falha x' },
        { id: 'l3', leg: 3, estado: 3, ocorreuEm: '2026-09-14T09:20:00Z' },
        { id: 'l5', leg: 5, estado: 4, ocorreuEm: '2026-09-14T09:30:00Z' },
        { id: 'l6', leg: 6, estado: 99, ocorreuEm: '2026-09-14T09:40:00Z' }
    ],
    possuiLegComFalha: true,
    possuiLegRevertido: true,
    etapaDivergeDosLegs: false,
    possuiLegEmReversao: true,
    ...overrides
});

const comLeg5Revertido = () => {
    const base = baseFaturamento();
    return { ...base, possuiLegEmReversao: false, legs: (base.legs ?? []).map((leg) => (leg.leg === 5 ? { ...leg, estado: 3 } : leg)) };
};

const renderPage = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <FaturamentoDetalhePage faturamentoId={faturamentoId} />
        </QueryClientProvider>
    );
};

// Abre o Dropdown do PrimeReact pelo inputId e clica na opção com texto exato; lança erro se não achar.
const escolherOpcao = async (container: HTMLElement, inputId: string, texto: string) => {
    const input = container.querySelector(`[id="${inputId}"]`) ?? document.body.querySelector(`[id="${inputId}"]`);
    const dropdown = input?.closest('.p-dropdown');
    if (!dropdown) throw new Error(`Dropdown com inputId "${inputId}" não encontrado.`);
    await userEvent.click(dropdown as HTMLElement);

    const procurar = () => {
        const noContainer = Array.from(container.querySelectorAll('.p-dropdown-item'));
        const noBody = Array.from(document.body.querySelectorAll('.p-dropdown-item'));
        return noContainer.concat(noBody).find((item) => (item.textContent ?? '').trim() === texto) ?? null;
    };
    const opcao = await waitFor(() => {
        const encontrada = procurar();
        if (!encontrada) throw new Error(`Opção "${texto}" não encontrada no dropdown "${inputId}".`);
        return encontrada;
    });
    await userEvent.click(opcao as HTMLElement);
};

// Linhas de dados da tabela dentro do Card "Legs de integração".
const linhasDaTabelaDeLegs = async () => {
    const titulo = await screen.findByText('Legs de integração');
    const card = titulo.closest('.p-card');
    if (!card) throw new Error('Card "Legs de integração" não encontrado.');
    const tabela = within(card as HTMLElement).getByRole('table');
    const linhas = within(tabela).getAllByRole('row');
    return linhas.slice(1);
};

const rotuloDaLinha = (linha: HTMLElement) => (within(linha).getAllByRole('cell')[0].textContent ?? '').trim();

const linhaDoLeg = async (rotulo: string) => {
    const linhas = await linhasDaTabelaDeLegs();
    const linha = linhas.find((item) => rotuloDaLinha(item) === rotulo);
    if (!linha) throw new Error(`Linha "${rotulo}" não encontrada.`);
    return linha;
};

const retomarNaLinhaBaixarEstoque = async (acao: string, motivo: string) => {
    const linha = await linhaDoLeg('Baixar estoque');
    await userEvent.click(within(linha).getByRole('button', { name: 'Retomar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Retomar reversão' });
    await escolherOpcao(document.body, 'retomarAcao', acao);
    await userEvent.type(within(dialog).getByLabelText('Motivo *'), motivo);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Retomar' }));
};

beforeEach(() => {
    vi.clearAllMocks();
    permsState.perms = ['FATURAMENTO_CONSULTAR', 'FATURAMENTO_RETOMAR_REVERSAO'];
    api.historico.mockResolvedValue([]);
    api.ocorrencias.mockResolvedValue([]);
});

describe('FaturamentoDetalhePage — legs de integração', () => {
    it('AC-2: mostra 6 linhas na ordem do catálogo e Sem registro para o leg 4', async () => {
        api.obter.mockResolvedValue(baseFaturamento());
        renderPage();

        const linhas = await linhasDaTabelaDeLegs();
        expect(linhas.map(rotuloDaLinha)).toEqual(['Gerar nota fiscal', 'Gerar XML de envio', 'Assinar XML', 'Transmitir e autorizar na SEFAZ', 'Baixar estoque', 'Gerar conta a receber']);
        expect(within(linhas[3]).getByText('Sem registro')).toBeInTheDocument();
        expect(within(linhas[0]).queryByText('Sem registro')).not.toBeInTheDocument();
        expect(within(linhas[4]).queryByText('Sem registro')).not.toBeInTheDocument();
    });

    it('AC-3: estado desconhecido aparece cru e Revertido só uma vez', async () => {
        api.obter.mockResolvedValue(baseFaturamento());
        renderPage();

        const linhaConta = await linhaDoLeg('Gerar conta a receber');
        expect(within(linhaConta).getByText('Estado desconhecido (99)')).toBeInTheDocument();
        expect(screen.getAllByText('Revertido')).toHaveLength(1);
        expect(within(await linhaDoLeg('Assinar XML')).getByText('Revertido')).toBeInTheDocument();
        expect(within(await linhaDoLeg('Baixar estoque')).getByText('Em reversão')).toBeInTheDocument();
    });

    it('AC-4: alerta de divergência aparece só com etapaDivergeDosLegs', async () => {
        api.obter.mockResolvedValue(baseFaturamento({ etapaDivergeDosLegs: true }));
        const primeiro = renderPage();
        await linhasDaTabelaDeLegs();
        expect(screen.getByText(/^A etapa do faturamento não reflete o estado dos legs/)).toBeInTheDocument();
        primeiro.unmount();

        api.obter.mockResolvedValue(baseFaturamento({ etapaDivergeDosLegs: false }));
        renderPage();
        await linhasDaTabelaDeLegs();
        expect(screen.queryByText(/^A etapa do faturamento não reflete o estado dos legs/)).not.toBeInTheDocument();
    });

    it('AC-5: aviso de leg em reversão aparece só com possuiLegEmReversao', async () => {
        api.obter.mockResolvedValue(baseFaturamento({ possuiLegEmReversao: true }));
        const primeiro = renderPage();
        await linhasDaTabelaDeLegs();
        expect(screen.getByText(/Há um leg em reversão/)).toBeInTheDocument();
        primeiro.unmount();

        api.obter.mockResolvedValue(baseFaturamento({ possuiLegEmReversao: false }));
        renderPage();
        await linhasDaTabelaDeLegs();
        expect(screen.queryByText(/Há um leg em reversão/)).not.toBeInTheDocument();
    });

    it('AC-6: botão Retomar existe só na linha em reversão', async () => {
        api.obter.mockResolvedValue(baseFaturamento());
        renderPage();

        const linhaBaixar = await linhaDoLeg('Baixar estoque');
        const botoes = screen.getAllByRole('button', { name: 'Retomar' });
        expect(botoes).toHaveLength(1);
        expect(linhaBaixar.contains(botoes[0])).toBe(true);
    });

    it('AC-7: Retomar desabilitado sem FATURAMENTO_RETOMAR_REVERSAO e habilitado com ela', async () => {
        api.obter.mockResolvedValue(baseFaturamento());
        permsState.perms = ['FATURAMENTO_CONSULTAR'];
        const primeiro = renderPage();
        expect(within(await linhaDoLeg('Baixar estoque')).getByRole('button', { name: 'Retomar' })).toBeDisabled();
        primeiro.unmount();

        permsState.perms = ['FATURAMENTO_CONSULTAR', 'FATURAMENTO_RETOMAR_REVERSAO'];
        renderPage();
        expect(within(await linhaDoLeg('Baixar estoque')).getByRole('button', { name: 'Retomar' })).toBeEnabled();
    });

    it('AC-12: Confirmar desabilitado com leg em reversão e habilitado sem', async () => {
        permsState.perms = ['FATURAMENTO_CONSULTAR', 'FATURAMENTO_CONFIRMAR'];

        api.obter.mockResolvedValue(baseFaturamento({ possuiLegEmReversao: true }));
        const primeiro = renderPage();
        await linhasDaTabelaDeLegs();
        expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
        primeiro.unmount();

        api.obter.mockResolvedValue(baseFaturamento({ possuiLegEmReversao: false }));
        renderPage();
        await linhasDaTabelaDeLegs();
        expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled();
    });

    it('AC-10: após retomada rejeitada reconsulta o detalhe e o diálogo fecha quando o leg deixa de estar em reversão', async () => {
        api.obter.mockResolvedValueOnce(baseFaturamento()).mockResolvedValue(comLeg5Revertido());
        const falha = new Error('falhou');
        api.retomarReversao.mockRejectedValue(falha);

        // runWithToast relança (rethrow: true) e RetomarReversaoDialog.confirmar não captura: o clique gera uma
        // rejeição não tratada. Ela é capturada aqui, nominalmente, para que qualquer OUTRA rejeição derrube o teste.
        const rejeicoes: unknown[] = [];
        const capturar = (motivo: unknown) => rejeicoes.push(motivo);
        process.on('unhandledRejection', capturar);
        try {
            renderPage();

            await retomarNaLinhaBaixarEstoque('Reaplicar a inversa', 'tentar de novo');

            await waitFor(() => {
                expect(api.retomarReversao).toHaveBeenCalledTimes(1);
                expect(api.obter.mock.calls.length).toBeGreaterThanOrEqual(2);
                expect(api.historico.mock.calls.length).toBeGreaterThanOrEqual(2);
                expect(api.ocorrencias.mock.calls.length).toBeGreaterThanOrEqual(2);
                expect(toastMock.error).toHaveBeenCalled();
                expect(screen.queryByRole('dialog', { name: 'Retomar reversão' })).not.toBeInTheDocument();
            });
            await waitFor(async () => {
                expect(within(await linhaDoLeg('Baixar estoque')).getByText('Revertido')).toBeInTheDocument();
            });
            expect(toastMock.error.mock.calls[0][0]).toBe('Erro ao retomar a reversão');
            expect(toastMock.success).not.toHaveBeenCalled();
            await waitFor(() => expect(rejeicoes).toHaveLength(1));
        } finally {
            process.off('unhandledRejection', capturar);
        }
        expect(rejeicoes).toEqual([falha]);
    });

    it('AC-3: POST falho com GET ainda em 4 mantém Em reversão e não mostra Revertido', async () => {
        api.obter.mockResolvedValue(baseFaturamento());
        const falha = new Error('falhou');
        api.retomarReversao.mockRejectedValue(falha);

        // Mesma captura nominal de AC-10: qualquer rejeição não tratada que não seja esta derruba o teste.
        const rejeicoes: unknown[] = [];
        const capturar = (motivo: unknown) => rejeicoes.push(motivo);
        process.on('unhandledRejection', capturar);
        try {
            renderPage();

            await retomarNaLinhaBaixarEstoque('Reaplicar a inversa', 'tentar de novo');

            await waitFor(() => {
                expect(api.obter.mock.calls.length).toBeGreaterThanOrEqual(2);
                expect(toastMock.error).toHaveBeenCalled();
            });

            expect(within(await linhaDoLeg('Baixar estoque')).getByText('Em reversão')).toBeInTheDocument();
            expect(screen.getAllByText('Revertido')).toHaveLength(1);
            expect(within(await linhaDoLeg('Assinar XML')).getByText('Revertido')).toBeInTheDocument();
            expect(screen.getByRole('dialog', { name: 'Retomar reversão' })).toBeInTheDocument();
        } finally {
            process.off('unhandledRejection', capturar);
        }
        expect(rejeicoes).toEqual([falha]);
    });

    it('AC-11: toast de sucesso diferencia Reaplicar de Declarar', async () => {
        api.obter.mockResolvedValue(baseFaturamento());
        api.retomarReversao.mockResolvedValue(baseFaturamento());

        const primeiro = renderPage();
        await retomarNaLinhaBaixarEstoque('Reaplicar a inversa', 'reaplicar');
        await waitFor(() => expect(toastMock.success).toHaveBeenCalledTimes(1));
        expect(toastMock.success.mock.calls[0][0]).toBe('Reversão confirmada pelo sistema');
        expect(api.retomarReversao).toHaveBeenCalledWith(faturamentoId, { leg: 5, acao: 1, motivo: 'reaplicar' });
        primeiro.unmount();

        toastMock.success.mockClear();
        renderPage();
        await retomarNaLinhaBaixarEstoque('Declarar efeito desfeito', 'declarar');
        await waitFor(() => expect(toastMock.success).toHaveBeenCalledTimes(1));
        expect(toastMock.success.mock.calls[0][0]).toBe('Declaração registrada');
        expect(toastMock.success.mock.calls[0][1]).toMatch(/afirmação humana/);
        expect(api.retomarReversao).toHaveBeenLastCalledWith(faturamentoId, { leg: 5, acao: 2, motivo: 'declarar' });
    });
});
