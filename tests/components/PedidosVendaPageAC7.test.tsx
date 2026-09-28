import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PedidosVendaPage } from '@/features/vendas/components/PedidosVendaPage';
import { usePedidosVenda } from '@/features/vendas/hooks/useVendasResources';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';

vi.mock('@/features/vendas/hooks/useVendasResources');
vi.mock('@/features/clientes/hooks/useClientesResources');
vi.mock('@/features/pessoas/hooks/usePessoasResources');
vi.mock('@/features/auth/hooks/usePermissions');
vi.mock('next/navigation');
vi.mock('@/hooks/useOrganizationalContext');

describe('PedidosVendaPage — AC-7: aviso de teto em 200 registros', () => {
    let queryClient: QueryClient;

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

        vi.mocked(usePathname).mockReturnValue('/vendas/pedidos');

        vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as any);

        vi.mocked(useOrganizationalContext).mockReturnValue({
            snapshot: { empresaId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', filialId: null, isMaster: true, revision: 1 }
        } as never);

        vi.mocked(useClientes).mockReturnValue({
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
    });

    it('mostra aviso quando há 200 pedidos na resposta', () => {
        const pedidos = Array.from({ length: 200 }, (_, i) => ({
            id: `pedido-${i}`,
            empresaId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
            numero: `PV-${String(i + 1).padStart(3, '0')}`,
            clienteId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
            dataEmissao: '2026-09-25T10:00:00Z',
            tipo: 1,
            statusPedido: 1,
            valorProdutos: 1000,
            valorDesconto: 0,
            valorTotal: 1000,
            itens: []
        }));

        vi.mocked(usePedidosVenda).mockReturnValue({
            data: pedidos,
            isLoading: false,
            isFetching: false,
            error: undefined
        } as never);

        render(
            <QueryClientProvider client={queryClient}>
                <PedidosVendaPage />
            </QueryClientProvider>
        );

        const aviso = screen.getByText(/A listagem devolve no máximo 200 pedidos/i);
        expect(aviso).toBeInTheDocument();
    });

    it('não mostra aviso quando há 199 pedidos na resposta', () => {
        const pedidos = Array.from({ length: 199 }, (_, i) => ({
            id: `pedido-${i}`,
            empresaId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
            numero: `PV-${String(i + 1).padStart(3, '0')}`,
            clienteId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
            dataEmissao: '2026-09-25T10:00:00Z',
            tipo: 1,
            statusPedido: 1,
            valorProdutos: 1000,
            valorDesconto: 0,
            valorTotal: 1000,
            itens: []
        }));

        vi.mocked(usePedidosVenda).mockReturnValue({
            data: pedidos,
            isLoading: false,
            isFetching: false,
            error: undefined
        } as never);

        render(
            <QueryClientProvider client={queryClient}>
                <PedidosVendaPage />
            </QueryClientProvider>
        );

        const aviso = screen.queryByText(/A listagem devolve no máximo 200 pedidos/i);
        expect(aviso).not.toBeInTheDocument();
    });

    it('não mostra aviso com 0 pedidos', () => {
        vi.mocked(usePedidosVenda).mockReturnValue({
            data: [],
            isLoading: false,
            isFetching: false,
            error: undefined
        } as never);

        render(
            <QueryClientProvider client={queryClient}>
                <PedidosVendaPage />
            </QueryClientProvider>
        );

        const aviso = screen.queryByText(/A listagem devolve no máximo 200 pedidos/i);
        expect(aviso).not.toBeInTheDocument();
    });

    it('não mostra aviso com 1 pedido', () => {
        vi.mocked(usePedidosVenda).mockReturnValue({
            data: [
                {
                    id: 'pedido-1',
                    empresaId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                    numero: 'PV-001',
                    clienteId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
                    dataEmissao: '2026-09-25T10:00:00Z',
                    tipo: 1,
                    statusPedido: 1,
                    valorProdutos: 1000,
                    valorDesconto: 0,
                    valorTotal: 1000,
                    itens: []
                }
            ],
            isLoading: false,
            isFetching: false,
            error: undefined
        } as never);

        render(
            <QueryClientProvider client={queryClient}>
                <PedidosVendaPage />
            </QueryClientProvider>
        );

        const aviso = screen.queryByText(/A listagem devolve no máximo 200 pedidos/i);
        expect(aviso).not.toBeInTheDocument();
    });
});
