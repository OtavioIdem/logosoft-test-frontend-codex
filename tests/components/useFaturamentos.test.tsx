import type { ReactNode } from 'react';
import type { InternalAxiosRequestConfig } from 'axios';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFaturamentos } from '@/features/faturamento/hooks/useFaturamentoResources';
import { faturamentoApi } from '@/features/faturamento/api/faturamentoApi';
import { httpClient } from '@/lib/http/httpClient';

// b71 — AC-9 (D97, FT-9): `useFaturamentos` não consulta sem `empresaId`. Hook, client e `httpClient` reais;
// conta as chamadas ao client (espião que repassa ao real) e as que chegam ao adapter (a rede). Uma consulta
// habilitada já está em `fetching` e já chamou o client logo depois da montagem; por isso não há espera fixa.

const empresaId = '11111111-1111-1111-1111-111111111111';

describe('useFaturamentos — AC-9 (D97)', () => {
    const originalAdapter = httpClient.defaults.adapter;
    let chamadas: { url?: string; params?: Record<string, unknown> }[];

    beforeEach(() => {
        chamadas = [];
        httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
            chamadas.push({ url: config.url, params: config.params });
            return { data: { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }, status: 200, statusText: 'OK', headers: {}, config };
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

    it('sem empresaId (null, ausente ou vazio), 0 chamada ao client e à rede, e a query fica parada', async () => {
        const listar = vi.spyOn(faturamentoApi, 'listar');
        const semEmpresa = renderHook(() => useFaturamentos({ empresaId: null, page: 1, pageSize: 20 }), { wrapper: wrapper() });
        const semCampo = renderHook(() => useFaturamentos({ page: 1, pageSize: 20 }), { wrapper: wrapper() });
        const vazio = renderHook(() => useFaturamentos({ empresaId: '', page: 1, pageSize: 20 }), { wrapper: wrapper() });
        const padrao = renderHook(() => useFaturamentos(), { wrapper: wrapper() });

        expect(listar).not.toHaveBeenCalled();
        expect(chamadas).toHaveLength(0);
        for (const hook of [semEmpresa, semCampo, vazio, padrao]) {
            expect(hook.result.current.fetchStatus).toBe('idle');
            expect(hook.result.current.data).toBeUndefined();
        }
    });

    it('com empresaId, 1 chamada a /api/faturamento com a empresa nos parâmetros', async () => {
        const listar = vi.spyOn(faturamentoApi, 'listar');
        const { result } = renderHook(() => useFaturamentos({ empresaId, page: 1, pageSize: 20 }), { wrapper: wrapper() });

        // Logo depois da montagem a consulta já saiu: é o contraste do caso sem empresa.
        expect(result.current.fetchStatus).toBe('fetching');
        expect(listar).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(chamadas).toHaveLength(1);
        expect(chamadas[0].url).toBe('/api/faturamento');
        expect(chamadas[0].params).toMatchObject({ empresaId, page: 1, pageSize: 20 });
    });

    it('com empresaId mas enabled=false (sem permissão), 0 chamada', async () => {
        const listar = vi.spyOn(faturamentoApi, 'listar');
        const { result } = renderHook(() => useFaturamentos({ empresaId }, false), { wrapper: wrapper() });
        expect(result.current.fetchStatus).toBe('idle');
        expect(listar).not.toHaveBeenCalled();
        expect(chamadas).toHaveLength(0);
    });
});
