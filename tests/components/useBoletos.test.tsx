import type { ReactNode } from 'react';
import type { InternalAxiosRequestConfig } from 'axios';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBoletos } from '@/features/bancos/hooks/useBancosResources';
import { bancosApi } from '@/features/bancos/api/bancosApi';
import { httpClient } from '@/lib/http/httpClient';

const empresaId = '11111111-1111-1111-1111-111111111111';

describe('useBoletos — b78 consulta por empresa', () => {
    const originalAdapter = httpClient.defaults.adapter;
    let chamadas: { url?: string; params?: Record<string, unknown> }[];

    beforeEach(() => {
        chamadas = [];
        httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
            chamadas.push({ url: config.url, params: config.params });
            return { data: [], status: 200, statusText: 'OK', headers: {}, config };
        });
    });

    afterEach(() => {
        httpClient.defaults.adapter = originalAdapter;
        vi.restoreAllMocks();
    });

    const wrapper = () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };

    it('AC-3: sem empresa, não chama client nem rede e mantém a consulta parada', () => {
        const listar = vi.spyOn(bancosApi, 'listarBoletos');
        const semEmpresa = renderHook(() => useBoletos(null), { wrapper: wrapper() });
        const empresaVazia = renderHook(() => useBoletos({ empresaId: '' } as never), { wrapper: wrapper() });

        expect(listar).not.toHaveBeenCalled();
        expect(chamadas).toHaveLength(0);
        expect(semEmpresa.result.current.fetchStatus).toBe('idle');
        expect(empresaVazia.result.current.fetchStatus).toBe('idle');
    });

    it('AC-3: com empresa, chama somente GET /api/bancos/boletos com empresaId', async () => {
        const { result } = renderHook(() => useBoletos({ empresaId }), { wrapper: wrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(chamadas).toHaveLength(1);
        expect(chamadas[0]).toEqual({ url: '/api/bancos/boletos', params: { empresaId } });
    });
});
