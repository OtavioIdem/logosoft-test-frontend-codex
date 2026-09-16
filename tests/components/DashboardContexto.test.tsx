import type { InternalAxiosRequestConfig } from 'axios';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '@/features/dashboard/components/DashboardPage';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { organizationalScopeKey } from '@/lib/http/organizationalContextPolicy';
import { httpClient, rawHttpClient } from '@/lib/http/httpClient';
import { formatMoney } from '@/lib/formatters/money';

// DEF-3 / D42: `useDashboard` passa a ler `useOrganizationalContext`; a chave da consulta muda com
// o contexto, e a troca de empresa precisa gerar consulta nova (não fica presa ao valor antigo).
vi.mock('@/hooks/useOrganizationalContext', () => ({ useOrganizationalContext: vi.fn() }));
vi.mock('@/features/auth/hooks/usePermissions', () => ({
    usePermissions: () => ({ hasPermission: () => true, hasAnyPermission: () => true, hasAllPermissions: () => true })
}));

const mockedUseOrganizationalContext = vi.mocked(useOrganizationalContext);

const empresaA = '11111111-1111-1111-1111-111111111111';
const empresaB = '99999999-9999-9999-9999-999999999999';
const normalizeSpaces = (value: string) => value.replace(/\s+/g, ' ').trim();
const valorEsperado = (valor: number) => normalizeSpaces(formatMoney(valor));

const contextoPara = (empresaId: string) => {
    const snapshot = Object.freeze({ empresaId, filialId: null, isMaster: true, revision: 1 });
    return {
        empresaId,
        filialId: null,
        isGlobal: false,
        canChangeOrganization: true,
        requiresOrganizationSelection: false,
        snapshot,
        organizationalScopeKey: organizationalScopeKey(snapshot),
        setEmpresaId: vi.fn(),
        setFilialId: vi.fn()
    };
};

type Chamada = { url: string; empresaId?: string };

const instalarAdapters = () => {
    const chamadas: Chamada[] = [];
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        const params = (config.params ?? {}) as Record<string, unknown>;
        chamadas.push({ url: config.url as string, empresaId: params.empresaId as string | undefined });
        if (config.url === '/api/financeiro/contas-receber') {
            const valor = params.empresaId === empresaB ? 8800.9 : 1500.5;
            return { data: [{ valorSaldo: valor, status: 'ABERTO' }], status: 200, statusText: 'OK', headers: {}, config };
        }
        return { data: [], status: 200, statusText: 'OK', headers: {}, config };
    });
    rawHttpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
        data: { status: 'ok' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
    }));
    return chamadas;
};

describe('DashboardPage — contexto organizacional (D42)', () => {
    const originalHttpAdapter = httpClient.defaults.adapter;
    const originalRawAdapter = rawHttpClient.defaults.adapter;

    afterEach(() => {
        httpClient.defaults.adapter = originalHttpAdapter;
        rawHttpClient.defaults.adapter = originalRawAdapter;
        vi.restoreAllMocks();
    });

    it('AC-3: useDashboard usa a chave com organizationalScopeKey(snapshot) e envia o empresaId do contexto', async () => {
        const contexto = contextoPara(empresaA);
        mockedUseOrganizationalContext.mockReturnValue(contexto);
        const chamadas = instalarAdapters();
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

        render(
            <QueryClientProvider client={queryClient}>
                <DashboardPage />
            </QueryClientProvider>
        );

        await waitFor(() => expect(chamadas.some((chamada) => chamada.url === '/api/financeiro/contas-receber')).toBe(true));

        const [query] = queryClient.getQueryCache().findAll();
        expect(query.queryKey).toEqual(['dashboard', 'overview', organizationalScopeKey(contexto.snapshot)]);
        expect(chamadas.find((chamada) => chamada.url === '/api/financeiro/contas-receber')?.empresaId).toBe(empresaA);
    });

    it('AC-4: trocar a empresa do contexto refaz a consulta de contas a receber com o empresaId novo e atualiza o card', async () => {
        mockedUseOrganizationalContext.mockReturnValue(contextoPara(empresaA));
        const chamadas = instalarAdapters();
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

        const view = render(
            <QueryClientProvider client={queryClient}>
                <DashboardPage />
            </QueryClientProvider>
        );

        await screen.findByText((content) => content === valorEsperado(1500.5));

        mockedUseOrganizationalContext.mockReturnValue(contextoPara(empresaB));
        view.rerender(
            <QueryClientProvider client={queryClient}>
                <DashboardPage />
            </QueryClientProvider>
        );

        await waitFor(() => expect(chamadas.some((chamada) => chamada.url === '/api/financeiro/contas-receber' && chamada.empresaId === empresaB)).toBe(true));
        await screen.findByText((content) => content === valorEsperado(8800.9));
        expect(screen.queryByText((content) => content === valorEsperado(1500.5))).not.toBeInTheDocument();
    });
});
