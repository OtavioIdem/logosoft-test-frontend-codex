import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PedidosCompraPage } from '@/features/compras/components/PedidosCompraPage';
import { SolicitacoesCompraPage } from '@/features/compras-avancado/components/SolicitacoesCompraPage';
import { CotacoesCompraPage } from '@/features/compras-avancado/components/CotacoesCompraPage';
import { RecebimentosCompraPage } from '@/features/compras-avancado/components/RecebimentosCompraPage';
import { usePedidosCompra } from '@/features/compras/hooks/useComprasResources';
import { useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { useSolicitacoesCompra, useCotacoesCompra, useDivergenciasRecebimento, useRecebimentoCompra, useSolicitacoesCompraMutations, useCotacoesCompraMutations, useRecebimentosCompraMutations } from '@/features/compras-avancado/hooks/useComprasAvancadoResources';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';

vi.mock('@/features/compras/hooks/useComprasResources');
vi.mock('@/features/compras-avancado/hooks/useComprasAvancadoResources');
vi.mock('@/features/fornecedores/hooks/useFornecedoresResources');
vi.mock('@/features/pessoas/hooks/usePessoasResources');
vi.mock('@/features/financeiro/hooks/useFinanceiroResources');
vi.mock('@/features/auth/hooks/usePermissions');
vi.mock('next/navigation');
vi.mock('@/hooks/useOrganizationalContext');

describe('Compras/Financeiro — AC-8 — Aviso de teto nas listagens', () => {
    let queryClient: QueryClient;
    const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

    beforeEach(() => {
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        vi.clearAllMocks();

        vi.mocked(usePermissions).mockReturnValue({
            hasPermission: () => true,
            hasAnyPermission: () => true,
            hasAllPermissions: () => true
        } as never);

        vi.mocked(useRouter).mockReturnValue({
            push: vi.fn(),
            replace: vi.fn(),
            back: vi.fn(),
            forward: vi.fn(),
            refresh: vi.fn(),
            prefetch: vi.fn()
        } as never);

        vi.mocked(usePathname).mockReturnValue('/');
        vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as any);

        vi.mocked(useOrganizationalContext).mockReturnValue({
            snapshot: { empresaId, filialId: null, isMaster: true, revision: 1 }
        } as never);

        vi.mocked(useFornecedores).mockReturnValue({
            data: [],
            isLoading: false,
            isFetching: false,
            error: undefined
        } as never);

        vi.mocked(usePessoas).mockReturnValue({
            data: [],
            isLoading: false,
            isFetching: false,
            error: undefined
        } as never);

        vi.mocked(useRecebimentoCompra).mockReturnValue({
            data: null,
            isLoading: false,
            isFetching: false,
            error: undefined
        } as never);

        // Mock mutations hooks for Compras
        vi.mocked(useSolicitacoesCompraMutations).mockReturnValue({
            criarMutation: { mutate: vi.fn(), isPending: false } as never,
            itemMutation: { mutate: vi.fn(), isPending: false } as never,
            aprovarMutation: { mutate: vi.fn(), isPending: false } as never,
            cancelarMutation: { mutate: vi.fn(), isPending: false } as never
        } as never);

        vi.mocked(useCotacoesCompraMutations).mockReturnValue({
            criarMutation: { mutate: vi.fn(), isPending: false } as never,
            itemMutation: { mutate: vi.fn(), isPending: false } as never,
            aprovarMutation: { mutate: vi.fn(), isPending: false } as never,
            compararMutation: { mutate: vi.fn(), isPending: false } as never,
            rejeitarMutation: { mutate: vi.fn(), isPending: false } as never
        } as never);

        vi.mocked(useRecebimentosCompraMutations).mockReturnValue({
            conferenciaMutation: { mutate: vi.fn(), isPending: false } as never,
            criarMutation: { mutate: vi.fn(), isPending: false } as never
        } as never);

    });

    describe('PedidosCompraPage (TETO = 200)', () => {
        it('mostra aviso com exatamente 200 pedidos', () => {
            const pedidos = Array.from({ length: 200 }, (_, i) => ({
                id: `p-${i}`,
                empresaId,
                numero: `PC-${i}`,
                fornecedorId: 'f1',
                dataEmissao: '2026-09-25T00:00:00Z',
                tipo: 1,
                statusPedido: 1,
                valorProdutos: 100,
                valorDesconto: 0,
                valorTotal: 100,
                itens: []
            }));

            vi.mocked(usePedidosCompra).mockReturnValue({
                data: pedidos,
                isLoading: false,
                isFetching: false,
                error: undefined
            } as never);

            render(
                <QueryClientProvider client={queryClient}>
                    <PedidosCompraPage />
                </QueryClientProvider>
            );

            expect(screen.getByText(/A listagem devolve no máximo 200 pedidos/)).toBeInTheDocument();
        });

        it('não mostra aviso com 199 pedidos', () => {
            const pedidos = Array.from({ length: 199 }, (_, i) => ({
                id: `p-${i}`,
                empresaId,
                numero: `PC-${i}`,
                fornecedorId: 'f1',
                dataEmissao: '2026-09-25T00:00:00Z',
                tipo: 1,
                statusPedido: 1,
                valorProdutos: 100,
                valorDesconto: 0,
                valorTotal: 100,
                itens: []
            }));

            vi.mocked(usePedidosCompra).mockReturnValue({
                data: pedidos,
                isLoading: false,
                isFetching: false,
                error: undefined
            } as never);

            render(
                <QueryClientProvider client={queryClient}>
                    <PedidosCompraPage />
                </QueryClientProvider>
            );

            expect(screen.queryByText(/A listagem devolve no máximo 200 pedidos/)).not.toBeInTheDocument();
        });
    });

    describe('SolicitacoesCompraPage (TETO = 200)', () => {
        it('mostra aviso com exatamente 200 solicitações', () => {
            const solicita = Array.from({ length: 200 }, (_, i) => ({
                id: `s-${i}`,
                numero: `SOL-${i}`,
                solicitante: 'User',
                dataEmissao: '2026-09-25T00:00:00Z',
                statusSolicitacao: 1,
                itens: []
            }));

            vi.mocked(useSolicitacoesCompra).mockReturnValue({
                data: solicita,
                isLoading: false,
                isFetching: false,
                error: undefined
            } as never);

            render(
                <QueryClientProvider client={queryClient}>
                    <SolicitacoesCompraPage />
                </QueryClientProvider>
            );

            expect(screen.getByText(/A listagem devolve no máximo 200 solicitações/)).toBeInTheDocument();
        });

        it('não mostra aviso com 199 solicitações', () => {
            const solicita = Array.from({ length: 199 }, (_, i) => ({
                id: `s-${i}`,
                numero: `SOL-${i}`,
                solicitante: 'User',
                dataEmissao: '2026-09-25T00:00:00Z',
                statusSolicitacao: 1,
                itens: []
            }));

            vi.mocked(useSolicitacoesCompra).mockReturnValue({
                data: solicita,
                isLoading: false,
                isFetching: false,
                error: undefined
            } as never);

            render(
                <QueryClientProvider client={queryClient}>
                    <SolicitacoesCompraPage />
                </QueryClientProvider>
            );

            expect(screen.queryByText(/A listagem devolve no máximo 200 solicitações/)).not.toBeInTheDocument();
        });
    });

    describe('CotacoesCompraPage (TETO = 200)', () => {
        it('mostra aviso com exatamente 200 cotações', () => {
            const cotacoes = Array.from({ length: 200 }, (_, i) => ({
                id: `c-${i}`,
                numero: `COT-${i}`,
                solicitacaoId: 's1',
                dataCotacao: '2026-09-25T00:00:00Z',
                statusCotacao: 1,
                itens: []
            }));

            vi.mocked(useCotacoesCompra).mockReturnValue({
                data: cotacoes,
                isLoading: false,
                isFetching: false,
                error: undefined
            } as never);

            render(
                <QueryClientProvider client={queryClient}>
                    <CotacoesCompraPage />
                </QueryClientProvider>
            );

            expect(screen.getByText(/A listagem devolve no máximo 200 cotações/)).toBeInTheDocument();
        });

        it('não mostra aviso com 199 cotações', () => {
            const cotacoes = Array.from({ length: 199 }, (_, i) => ({
                id: `c-${i}`,
                numero: `COT-${i}`,
                solicitacaoId: 's1',
                dataCotacao: '2026-09-25T00:00:00Z',
                statusCotacao: 1,
                itens: []
            }));

            vi.mocked(useCotacoesCompra).mockReturnValue({
                data: cotacoes,
                isLoading: false,
                isFetching: false,
                error: undefined
            } as never);

            render(
                <QueryClientProvider client={queryClient}>
                    <CotacoesCompraPage />
                </QueryClientProvider>
            );

            expect(screen.queryByText(/A listagem devolve no máximo 200 cotações/)).not.toBeInTheDocument();
        });
    });

    describe('RecebimentosCompraPage divergências (TETO = 200)', () => {
        it('mostra aviso com exatamente 200 divergências', () => {
            const divergencias = Array.from({ length: 200 }, (_, i) => ({
                id: `d-${i}`,
                recebimentoId: 'r1',
                tipo: 1,
                quantidade: 1
            }));

            vi.mocked(useDivergenciasRecebimento).mockReturnValue({
                data: divergencias,
                isLoading: false,
                isFetching: false,
                error: undefined
            } as never);

            render(
                <QueryClientProvider client={queryClient}>
                    <RecebimentosCompraPage />
                </QueryClientProvider>
            );

            expect(screen.getByText(/A listagem devolve no máximo 200 divergências/)).toBeInTheDocument();
        });

        it('não mostra aviso com 199 divergências', () => {
            const divergencias = Array.from({ length: 199 }, (_, i) => ({
                id: `d-${i}`,
                recebimentoId: 'r1',
                tipo: 1,
                quantidade: 1
            }));

            vi.mocked(useDivergenciasRecebimento).mockReturnValue({
                data: divergencias,
                isLoading: false,
                isFetching: false,
                error: undefined
            } as never);

            render(
                <QueryClientProvider client={queryClient}>
                    <RecebimentosCompraPage />
                </QueryClientProvider>
            );

            expect(screen.queryByText(/A listagem devolve no máximo 200 divergências/)).not.toBeInTheDocument();
        });
    });

});
