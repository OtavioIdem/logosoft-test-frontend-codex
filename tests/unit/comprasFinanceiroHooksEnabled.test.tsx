import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePedidosCompra } from '@/features/compras/hooks/useComprasResources';
import { useContasPagar, useContasReceber } from '@/features/financeiro/hooks/useFinanceiroResources';
import { comprasApi } from '@/features/compras/api/comprasApi';
import { financeiroApi } from '@/features/financeiro/api/financeiroApi';

vi.mock('@/features/compras/api/comprasApi');
vi.mock('@/features/financeiro/api/financeiroApi');

describe('Compras/Financeiro — AC-7 — enabled por empresaId', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        vi.clearAllMocks();
    });

    describe('usePedidosCompra (D88)', () => {
        it('não dispara API sem empresaId', async () => {
            const wrapper = ({ children }: { children: React.ReactNode }) =>
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

            const { result } = renderHook(() => usePedidosCompra({}), { wrapper });

            await waitFor(() => {
                expect(result.current.data).toBeUndefined();
            }, { timeout: 100 });

            expect(vi.mocked(comprasApi.listar)).not.toHaveBeenCalled();
        });

        it('não dispara API com empresaId null explícito', async () => {
            const wrapper = ({ children }: { children: React.ReactNode }) =>
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

            const { result } = renderHook(() => usePedidosCompra({ empresaId: null }), { wrapper });

            await waitFor(() => {
                expect(result.current.data).toBeUndefined();
            }, { timeout: 100 });

            expect(vi.mocked(comprasApi.listar)).not.toHaveBeenCalled();
        });

        it('dispara API com empresaId válido', async () => {
            const mockData: never[] = [];
            vi.mocked(comprasApi.listar).mockResolvedValueOnce(mockData);

            const wrapper = ({ children }: { children: React.ReactNode }) =>
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

            const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
            const { result } = renderHook(() => usePedidosCompra({ empresaId }), { wrapper });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(vi.mocked(comprasApi.listar)).toHaveBeenCalledWith({ empresaId });
            expect(vi.mocked(comprasApi.listar)).toHaveBeenCalledTimes(1);
        });
    });

    describe('useContasPagar (D88)', () => {
        it('não dispara API sem empresaId', async () => {
            const wrapper = ({ children }: { children: React.ReactNode }) =>
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

            const { result } = renderHook(() => useContasPagar({}), { wrapper });

            await waitFor(() => {
                expect(result.current.data).toBeUndefined();
            }, { timeout: 100 });

            expect(vi.mocked(financeiroApi.listarContasPagar)).not.toHaveBeenCalled();
        });

        it('não dispara API com empresaId null explícito', async () => {
            const wrapper = ({ children }: { children: React.ReactNode }) =>
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

            const { result } = renderHook(() => useContasPagar({ empresaId: null }), { wrapper });

            await waitFor(() => {
                expect(result.current.data).toBeUndefined();
            }, { timeout: 100 });

            expect(vi.mocked(financeiroApi.listarContasPagar)).not.toHaveBeenCalled();
        });

        it('dispara API com empresaId válido', async () => {
            const mockData: never[] = [];
            vi.mocked(financeiroApi.listarContasPagar).mockResolvedValueOnce(mockData);

            const wrapper = ({ children }: { children: React.ReactNode }) =>
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

            const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
            const { result } = renderHook(() => useContasPagar({ empresaId }), { wrapper });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(vi.mocked(financeiroApi.listarContasPagar)).toHaveBeenCalledWith({ empresaId });
            expect(vi.mocked(financeiroApi.listarContasPagar)).toHaveBeenCalledTimes(1);
        });
    });

    describe('useContasReceber (D88)', () => {
        it('não dispara API sem empresaId', async () => {
            const wrapper = ({ children }: { children: React.ReactNode }) =>
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

            const { result } = renderHook(() => useContasReceber({}), { wrapper });

            await waitFor(() => {
                expect(result.current.data).toBeUndefined();
            }, { timeout: 100 });

            expect(vi.mocked(financeiroApi.listarContasReceber)).not.toHaveBeenCalled();
        });

        it('não dispara API com empresaId null explícito', async () => {
            const wrapper = ({ children }: { children: React.ReactNode }) =>
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

            const { result } = renderHook(() => useContasReceber({ empresaId: null }), { wrapper });

            await waitFor(() => {
                expect(result.current.data).toBeUndefined();
            }, { timeout: 100 });

            expect(vi.mocked(financeiroApi.listarContasReceber)).not.toHaveBeenCalled();
        });

        it('dispara API com empresaId válido', async () => {
            const mockData: never[] = [];
            vi.mocked(financeiroApi.listarContasReceber).mockResolvedValueOnce(mockData);

            const wrapper = ({ children }: { children: React.ReactNode }) =>
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

            const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
            const { result } = renderHook(() => useContasReceber({ empresaId }), { wrapper });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(vi.mocked(financeiroApi.listarContasReceber)).toHaveBeenCalledWith({ empresaId });
            expect(vi.mocked(financeiroApi.listarContasReceber)).toHaveBeenCalledTimes(1);
        });
    });
});
