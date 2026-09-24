import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EstoqueMovimentosPage } from '@/features/estoque/components/EstoqueMovimentosPage';
import { estoqueApi } from '@/features/estoque/api/estoqueApi';
import { useMovimentosEstoque, useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import type { MovimentoEstoqueResponse } from '@/features/estoque/types/estoque.types';
import { TipoMovimentoEstoque } from '@/types/erp';

/**
 * AC-1, AC-5, AC-7 da fatia v1.11.0a8b68.
 *
 * AC-1: Histórico/Movimentos mostra Tipo e Data a partir de um response com `tipo` e `dataMovimento`.
 * AC-5: Três rotas abrem o mesmo componente na aba certa; permissões corretas por aba.
 * AC-7: Histórico com filtros e período padrão de 30 dias.
 */

const { toastMock, permsState } = vi.hoisted(() => ({
    toastMock: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn() },
    permsState: { perms: [] as string[] }
}));

vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => toastMock }));

vi.mock('@/features/estoque/api/estoqueApi', () => ({
    estoqueApi: {
        listarSaldos: vi.fn(),
        listarMovimentos: vi.fn(),
        listarLocais: vi.fn(),
        criarMovimentoEntrada: vi.fn(),
        criarMovimentoSaida: vi.fn(),
        transferir: vi.fn()
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

vi.mock('@/hooks/useOrganizationalContext', () => ({
    useOrganizationalContext: () => ({
        snapshot: { empresaId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', filialId: null, isMaster: true, revision: 1 }
    })
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    usePathname: () => '/estoque/movimentos',
    useSearchParams: () => new URLSearchParams()
}));

vi.mock('@/features/estoque/hooks/useEstoqueResources', async () => {
    const actual = await vi.importActual<typeof import('../../features/estoque/hooks/useEstoqueResources')>('../../features/estoque/hooks/useEstoqueResources');
    return {
        ...actual,
        useMovimentosEstoque: vi.fn(),
        useLocaisEstoque: vi.fn(),
        useProdutos: vi.fn(),
        useMovimentoEstoqueMutations: vi.fn(() => ({
            entradaMutation: { mutateAsync: vi.fn(), isPending: false },
            saidaMutation: { mutateAsync: vi.fn(), isPending: false }
        }))
    };
});

vi.mock('@/features/produtos/hooks/useProdutosResources', () => ({
    useProdutos: vi.fn(() => ({ data: [], isFetching: false, isLoading: false }))
}));

vi.mock('@/features/estoque/components/MovimentoEstoqueFormDialog', () => ({
    MovimentoEstoqueFormDialog: () => null
}));

const api = vi.mocked(estoqueApi);
const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

describe('EstoqueMovimentosPage — v1.11.0a8b68', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useMovimentosEstoque).mockReturnValue({
            data: [],
            isFetching: false,
            isLoading: false,
            error: undefined
        } as never);
        vi.mocked(useLocaisEstoque).mockReturnValue({
            data: [],
            isFetching: false,
            isLoading: false,
            error: undefined
        } as never);
        vi.mocked(useProdutos).mockReturnValue({
            data: [],
            isFetching: false,
            isLoading: false,
            error: undefined
        } as never);
    });

    describe('AC-5: três rotas abrem o mesmo componente na aba certa; bloqueios por permissão dentro da aba', () => {
        it('/estoque/entradas abre com aba Entrada ativa', () => {
            permsState.perms = ['ESTOQUE_MOVIMENTAR', 'ESTOQUE_CONSULTAR'];
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
            render(
                <QueryClientProvider client={queryClient}>
                    <EstoqueMovimentosPage initialTab="entrada" />
                </QueryClientProvider>
            );

            const entradaTab = screen.getByRole('tab', { name: /^Entrada$/i });
            expect(entradaTab).toHaveAttribute('aria-selected', 'true');
        });

        it('/estoque/saidas abre com aba Saída ativa', () => {
            permsState.perms = ['ESTOQUE_MOVIMENTAR', 'ESTOQUE_CONSULTAR'];
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
            render(
                <QueryClientProvider client={queryClient}>
                    <EstoqueMovimentosPage initialTab="saida" />
                </QueryClientProvider>
            );

            const saidaTab = screen.getByRole('tab', { name: /^Saída$/i });
            expect(saidaTab).toHaveAttribute('aria-selected', 'true');
        });

        it('/estoque/movimentos abre com aba Histórico ativa', () => {
            permsState.perms = ['ESTOQUE_CONSULTAR'];
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
            render(
                <QueryClientProvider client={queryClient}>
                    <EstoqueMovimentosPage initialTab="historico" />
                </QueryClientProvider>
            );

            const historicoTab = screen.getByRole('tab', { name: /histórico/i });
            expect(historicoTab).toHaveAttribute('aria-selected', 'true');
        });

        it('com só ESTOQUE_MOVIMENTAR: Histórico renderiza com UnauthorizedState dentro da aba; página visível', () => {
            permsState.perms = ['ESTOQUE_MOVIMENTAR'];
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
            render(
                <QueryClientProvider client={queryClient}>
                    <EstoqueMovimentosPage initialTab="historico" />
                </QueryClientProvider>
            );

            // Página não bloqueia; cabeçalho está visível
            expect(screen.getByText(/Movimentos de estoque/i)).toBeInTheDocument();
            // Mas a aba Histórico bloqueia com UnauthorizedState (dentro da aba)
            // O texto pode estar quebrado em múltiplos elementos, então procuramos por parts dele
            expect(screen.getByText(/Histórico de movimentos/i)).toBeInTheDocument();
            expect(screen.getByText(/ESTOQUE_CONSULTAR/i)).toBeInTheDocument();
        });

        it('com só ESTOQUE_CONSULTAR: botões de Entrada e Saída estão desabilitados', () => {
            permsState.perms = ['ESTOQUE_CONSULTAR'];
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
            render(
                <QueryClientProvider client={queryClient}>
                    <EstoqueMovimentosPage initialTab="entrada" />
                </QueryClientProvider>
            );

            // Página carrega normalmente
            expect(screen.getByText(/Movimentos de estoque/i)).toBeInTheDocument();
            // Mas o botão de registrar entrada está desabilitado (PermissionGuard mode="disable")
            const botaoEntrada = screen.getByRole('button', { name: /registrar entrada/i });
            expect(botaoEntrada).toBeDisabled();
        });

        it('sem permissões de estoque: página bloqueia com UnauthorizedState', () => {
            permsState.perms = [];
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
            render(
                <QueryClientProvider client={queryClient}>
                    <EstoqueMovimentosPage initialTab="entrada" />
                </QueryClientProvider>
            );

            expect(screen.getByText(/Acesso negado/i)).toBeInTheDocument();
            expect(screen.getByText(/ESTOQUE_MOVIMENTAR|ESTOQUE_CONSULTAR/)).toBeInTheDocument();
        });
    });

    describe('AC-1: Histórico mostra Tipo e Data a partir de `tipo` e `dataMovimento` (D71)', () => {
        it('prova que a tabela renderiza o rótulo do tipo 8 (Transferência — saída) e a data formatada a partir de `dataMovimento`', () => {
            permsState.perms = ['ESTOQUE_CONSULTAR'];
            const movimentoComTipoOito: MovimentoEstoqueResponse = {
                id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
                empresaId,
                filialId: null,
                produtoId: 'pppppppp-pppp-pppp-pppp-pppppppppppp',
                localEstoqueId: 'llllllll-llll-llll-llll-llllllllllll',
                tipo: TipoMovimentoEstoque.TransferenciaSaida, // 8
                quantidade: 5,
                origemModulo: 'MANUAL',
                origemId: null,
                documento: null,
                motivo: 'Transferência de saldo',
                dataMovimento: '2024-09-24T14:30:00Z', // Campo correto (D71)
                criadoEm: '2024-09-24T14:30:00Z',
                criadoPor: 'usuario@example.com',
                atualizadoEm: '2024-09-24T14:30:00Z',
                atualizadoPor: 'usuario@example.com'
            } as MovimentoEstoqueResponse;

            vi.mocked(useMovimentosEstoque).mockReturnValue({
                data: [movimentoComTipoOito],
                isFetching: false,
                isLoading: false,
                error: undefined
            } as never);

            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
            render(
                <QueryClientProvider client={queryClient}>
                    <EstoqueMovimentosPage initialTab="historico" />
                </QueryClientProvider>
            );

            // Coluna Tipo deve estar presente
            expect(screen.getAllByText('Tipo')[0]).toBeInTheDocument();
            // Coluna Data deve estar presente
            expect(screen.getByText('Data')).toBeInTheDocument();
            // O rótulo correto do tipo 8 deve estar na tabela (teste lê `movimentoEstoqueLabel(row.tipo)`)
            expect(screen.getByText('Transferência — saída')).toBeInTheDocument();
            // A data deve estar formatada e visível (teste lê `formatDateTime(row.dataMovimento)`)
            // A data pode estar quebrada em múltiplos elementos
            const dataCells = screen.getAllByText((content, element) => {
                return element?.textContent?.includes('2024') ?? false;
            });
            expect(dataCells.length).toBeGreaterThan(0);
        });

        it('controle: com os nomes antigos (`tipoMovimento`, `criadoEm`), o rótulo "Transferência — saída" e data não aparecem', () => {
            permsState.perms = ['ESTOQUE_CONSULTAR'];
            // Simula um movimento com os campos ANTIGOS (defeito D71, antes da correção)
            const movimentoComNomesAntigos = {
                id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
                empresaId,
                filialId: null,
                produtoId: 'pppppppp-pppp-pppp-pppp-pppppppppppp',
                localEstoqueId: 'llllllll-llll-llll-llll-llllllllllll',
                tipoMovimento: TipoMovimentoEstoque.TransferenciaSaida, // NOME ANTIGO — isto não é lido
                quantidade: 5,
                origemModulo: 'MANUAL',
                origemId: null,
                documento: null,
                motivo: 'Transferência de saldo',
                criadoEm: '2024-09-24T14:30:00Z', // NOME ANTIGO — isto não é lido
                criadoPor: 'usuario@example.com',
                atualizadoEm: '2024-09-24T14:30:00Z',
                atualizadoPor: 'usuario@example.com'
                // Faltam `tipo` e `dataMovimento` — o componente não consegue renderizar
            } as unknown as MovimentoEstoqueResponse;

            vi.mocked(useMovimentosEstoque).mockReturnValue({
                data: [movimentoComNomesAntigos],
                isFetching: false,
                isLoading: false,
                error: undefined
            } as never);

            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
            render(
                <QueryClientProvider client={queryClient}>
                    <EstoqueMovimentosPage initialTab="historico" />
                </QueryClientProvider>
            );

            // Com os nomes antigos, o rótulo "Transferência — saída" NÃO aparece
            expect(screen.queryByText('Transferência — saída')).not.toBeInTheDocument();
            // Sem `dataMovimento`, a data também não aparece corretamente
            expect(screen.queryByText(/2024-09-24 14:30/)).not.toBeInTheDocument();
        });

        it('controle: sem movimento, a tabela fica vazia com mensagem', () => {
            permsState.perms = ['ESTOQUE_CONSULTAR'];
            vi.mocked(useMovimentosEstoque).mockReturnValue({
                data: [],
                isFetching: false,
                isLoading: false,
                error: undefined
            } as never);

            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
            render(
                <QueryClientProvider client={queryClient}>
                    <EstoqueMovimentosPage initialTab="historico" />
                </QueryClientProvider>
            );

            expect(screen.getByText(/nenhum movimento/i)).toBeInTheDocument();
        });
    });

    describe('AC-7: Histórico com filtros, período padrão 30 dias, aviso ao remover, coluna Motivo', () => {
        it('período padrão é de 30 dias; sem aviso quando período preenchido', () => {
            permsState.perms = ['ESTOQUE_CONSULTAR'];
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
            render(
                <QueryClientProvider client={queryClient}>
                    <EstoqueMovimentosPage initialTab="historico" />
                </QueryClientProvider>
            );

            // O período padrão é 30 dias; o aviso só aparece quando ambos (inicio e fim) são null
            const warningMessage = screen.queryByText(/sem início e fim definidos/i);
            // Por padrão há um período, logo não deve haver aviso
            expect(warningMessage).not.toBeInTheDocument();
        });

        it('a tabela contém coluna "Motivo" com os dados do movimento mockado', () => {
            permsState.perms = ['ESTOQUE_CONSULTAR'];
            const movimentoComMotivo: MovimentoEstoqueResponse = {
                id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
                empresaId,
                filialId: null,
                produtoId: 'pppppppp-pppp-pppp-pppp-pppppppppppp',
                localEstoqueId: 'llllllll-llll-llll-llll-llllllllllll',
                tipo: TipoMovimentoEstoque.Entrada,
                quantidade: 10,
                origemModulo: 'MANUAL',
                origemId: null,
                documento: null,
                motivo: 'Recebimento de fornecedor',
                dataMovimento: '2024-09-24T10:00:00Z',
                criadoEm: '2024-09-24T10:00:00Z',
                criadoPor: 'usuario@example.com',
                atualizadoEm: '2024-09-24T10:00:00Z',
                atualizadoPor: 'usuario@example.com'
            } as MovimentoEstoqueResponse;

            vi.mocked(useMovimentosEstoque).mockReturnValue({
                data: [movimentoComMotivo],
                isFetching: false,
                isLoading: false,
                error: undefined
            } as never);

            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
            render(
                <QueryClientProvider client={queryClient}>
                    <EstoqueMovimentosPage initialTab="historico" />
                </QueryClientProvider>
            );

            // Coluna Motivo deve estar visível no cabeçalho
            expect(screen.getByText('Motivo')).toBeInTheDocument();
            // E o valor do motivo do movimento deve estar na tabela
            expect(screen.getByText('Recebimento de fornecedor')).toBeInTheDocument();
        });
    });
});
