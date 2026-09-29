import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePedidosVenda } from '@/features/vendas/hooks/useVendasResources';
import { vendasApi } from '@/features/vendas/api/vendasApi';

vi.mock('@/features/vendas/api/vendasApi');

describe('vendas — AC-5: usePedidosVenda é enabled por empresaId', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        vi.clearAllMocks();
    });

    it('não dispara listar sem empresaId', async () => {
        const wrapper = ({ children }: { children: React.ReactNode }) =>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

        const { result } = renderHook(() => usePedidosVenda({}), { wrapper });

        await waitFor(() => {
            expect(result.current.data).toBeUndefined();
        }, { timeout: 100 });

        expect(vi.mocked(vendasApi.listar)).not.toHaveBeenCalled();
    });

    it('não dispara listar com empresaId null explícito', async () => {
        const wrapper = ({ children }: { children: React.ReactNode }) =>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

        const { result } = renderHook(() => usePedidosVenda({ empresaId: null }), { wrapper });

        await waitFor(() => {
            expect(result.current.data).toBeUndefined();
        }, { timeout: 100 });

        expect(vi.mocked(vendasApi.listar)).not.toHaveBeenCalled();
    });

    it('dispara listar com empresaId válido', async () => {
        const mockData: never[] = [];
        vi.mocked(vendasApi.listar).mockResolvedValueOnce(mockData);

        const wrapper = ({ children }: { children: React.ReactNode }) =>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

        const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
        const { result } = renderHook(() => usePedidosVenda({ empresaId }), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(vi.mocked(vendasApi.listar)).toHaveBeenCalledWith({ empresaId });
        expect(vi.mocked(vendasApi.listar)).toHaveBeenCalledTimes(1);
    });
});
