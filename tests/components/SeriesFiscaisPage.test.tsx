import type { InternalAxiosRequestConfig } from 'axios';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SeriesFiscaisPage } from '@/features/fiscal/components/SeriesFiscaisPage';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useSeriesFiscais, useSeriesFiscaisMutations } from '@/features/fiscal/hooks/useSeriesFiscais';
import { useModelosDocumentoFiscal } from '@/features/fiscal/hooks/useModelosDocumentoFiscal';
import { organizationalScopeKey } from '@/lib/http/organizationalContextPolicy';
import { httpClient, rawHttpClient } from '@/lib/http/httpClient';
import {
    SERIES_FISCAIS_FILTRO_SITUACAO_VALOR,
    SERIES_FISCAIS_FILTRO_SITUACAO_PADRAO,
    SERIES_FISCAIS_PERMISSAO,
    SERIES_FISCAIS_COLUNAS
} from '@/features/fiscal/components/seriesFiscaisLabels';
import type { SerieFiscalResponse } from '@/features/fiscal/types/seriesFiscais.types';

// Mocks
vi.mock('@/hooks/useOrganizationalContext', () => ({ useOrganizationalContext: vi.fn() }));
vi.mock('@/features/auth/hooks/usePermissions', () => ({
    usePermissions: vi.fn()
}));
vi.mock('@/features/administracao/hooks/useEmpresaFilialOptions', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/features/administracao/hooks/useEmpresaFilialOptions')>()),
    useFiliaisOptions: vi.fn(() => ({ options: [] }))
}));
vi.mock('@/features/fiscal/hooks/useSeriesFiscais', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/features/fiscal/hooks/useSeriesFiscais')>()),
    useSeriesFiscais: vi.fn(),
    useSeriesFiscaisMutations: vi.fn()
}));
vi.mock('@/features/fiscal/hooks/useModelosDocumentoFiscal', () => ({
    useModelosDocumentoFiscal: vi.fn()
}));

const mockedUseOrganizationalContext = vi.mocked(useOrganizationalContext) as any;
const mockedUsePermissions = vi.mocked(usePermissions) as any;
const mockedUseSeriesFiscais = vi.mocked(useSeriesFiscais) as any;
const mockedUseSeriesFiscaisMutations = vi.mocked(useSeriesFiscaisMutations) as any;
const mockedUseModelosDocumentoFiscal = vi.mocked(useModelosDocumentoFiscal) as any;

const empresaA = '11111111-1111-1111-1111-111111111111';
const empresaB = '99999999-9999-9999-9999-999999999999';

const contextoPara = (empresaId: string) => {
    const snapshot = Object.freeze({ empresaId, filialId: null, isMaster: false, revision: 1 });
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

const seriesMock: SerieFiscalResponse[] = [
    {
        id: '55555555-5555-5555-5555-555555555555',
        empresaId: empresaA,
        filialId: null,
        modeloDocumentoFiscalId: '33333333-3333-3333-3333-333333333333',
        numero: 7,
        numeroInicial: 1,
        numeroFinal: 999,
        proximoNumero: 50,
        vigenciaInicio: '2026-01-01',
        vigenciaFim: null,
        ativa: true
    }
];

const modelosMock = [
    {
        id: '33333333-3333-3333-3333-333333333333',
        codigo: '55',
        descricao: 'Nota Fiscal de Serviço',
        ativo: true
    }
];

type Chamada = { url: string; method: string; empresaId?: string; somenteAtivas?: unknown; pagina?: number };

const instalarAdapters = () => {
    const chamadas: Chamada[] = [];
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        const params = (config.params ?? {}) as Record<string, unknown>;
        chamadas.push({
            url: config.url as string,
            method: config.method as string,
            empresaId: params.empresaId as string | undefined,
            somenteAtivas: params.somenteAtivas,
            pagina: params.pagina as number | undefined
        });

        if (config.url === '/api/fiscal/series') {
            if (!params.empresaId) {
                return { data: null, status: 400, statusText: 'Bad Request', headers: {}, config };
            }
            return {
                data: { items: seriesMock, totalItems: 1, pageNumber: 1, pageSize: 20 },
                status: 200,
                statusText: 'OK',
                headers: {},
                config
            };
        }
        if (config.url === '/api/fiscal/modelos-documento') {
            return {
                data: { items: modelosMock, totalItems: 1 },
                status: 200,
                statusText: 'OK',
                headers: {},
                config
            };
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

describe('SeriesFiscaisPage — AC-6, AC-7, AC-8', () => {
    const originalHttpAdapter = httpClient.defaults.adapter;
    const originalRawAdapter = rawHttpClient.defaults.adapter;

    afterEach(() => {
        httpClient.defaults.adapter = originalHttpAdapter;
        rawHttpClient.defaults.adapter = originalRawAdapter;
        vi.restoreAllMocks();
    });

    describe('AC-6: Sessão S1 (só FISCAL_SERIES_CONSULTAR)', () => {
        it('S1: lista carrega com 1 GET com empresaId, sem GET de modelos', async () => {
            const contexto = contextoPara(empresaA);
            mockedUseOrganizationalContext.mockReturnValue(contexto);
            mockedUsePermissions.mockReturnValue({
                hasPermission: (code: string) => code === 'FISCAL_SERIES_CONSULTAR',
                hasAnyPermission: () => false,
                hasAllPermissions: () => false
            });
            mockedUseSeriesFiscais.mockReturnValue({
                data: { items: seriesMock, totalItems: 1, pageNumber: 1, pageSize: 20 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseModelosDocumentoFiscal.mockReturnValue({
                data: { items: modelosMock, totalItems: 1 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseSeriesFiscaisMutations.mockReturnValue({
                criarMutation: { mutateAsync: vi.fn(), isPending: false },
                ampliarMutation: { mutateAsync: vi.fn(), isPending: false },
                encerrarVigenciaMutation: { mutateAsync: vi.fn(), isPending: false },
                inativarMutation: { mutateAsync: vi.fn(), isPending: false }
            });

            const chamadas = instalarAdapters();
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            await waitFor(() => expect(screen.getByText(SERIES_FISCAIS_COLUNAS.modelo)).toBeInTheDocument());
            expect(mockedUseSeriesFiscais).toHaveBeenCalledWith(
                contexto.organizationalScopeKey,
                expect.objectContaining({ empresaId: empresaA, somenteAtivas: true, pagina: 1, tamanhoPagina: 20 })
            );

            const modelosCalls = chamadas.filter((c) => c.url === '/api/fiscal/modelos-documento');
            expect(modelosCalls).toHaveLength(0);
        });

        it('S1: coluna Modelo mostra texto de indisponível, nunca GUID', async () => {
            const contexto = contextoPara(empresaA);
            mockedUseOrganizationalContext.mockReturnValue(contexto);
            mockedUsePermissions.mockReturnValue({
                hasPermission: (code: string) => code === 'FISCAL_SERIES_CONSULTAR',
                hasAnyPermission: () => false,
                hasAllPermissions: () => false
            });
            mockedUseSeriesFiscais.mockReturnValue({
                data: { items: seriesMock, totalItems: 1, pageNumber: 1, pageSize: 20 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseModelosDocumentoFiscal.mockReturnValue({
                data: { items: modelosMock, totalItems: 1 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseSeriesFiscaisMutations.mockReturnValue({
                criarMutation: { mutateAsync: vi.fn(), isPending: false },
                ampliarMutation: { mutateAsync: vi.fn(), isPending: false },
                encerrarVigenciaMutation: { mutateAsync: vi.fn(), isPending: false },
                inativarMutation: { mutateAsync: vi.fn(), isPending: false }
            });

            instalarAdapters();
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            await waitFor(() => expect(screen.getByText(SERIES_FISCAIS_PERMISSAO.colunaModeloIndisponivel)).toBeInTheDocument());
            expect(screen.queryByText(/33333333-3333-3333-3333-333333333333/)).not.toBeInTheDocument();
        });

        it('S1: botão "Nova série" desabilitado com title "Permissão necessária: FISCAL_SERIES_GERENCIAR."', async () => {
            const contexto = contextoPara(empresaA);
            mockedUseOrganizationalContext.mockReturnValue(contexto);
            mockedUsePermissions.mockReturnValue({
                hasPermission: (code: string) => code === 'FISCAL_SERIES_CONSULTAR',
                hasAnyPermission: () => false,
                hasAllPermissions: () => false
            });
            mockedUseSeriesFiscais.mockReturnValue({
                data: { items: seriesMock, totalItems: 1, pageNumber: 1, pageSize: 20 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseModelosDocumentoFiscal.mockReturnValue({
                data: { items: modelosMock, totalItems: 1 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseSeriesFiscaisMutations.mockReturnValue({
                criarMutation: { mutateAsync: vi.fn(), isPending: false },
                ampliarMutation: { mutateAsync: vi.fn(), isPending: false },
                encerrarVigenciaMutation: { mutateAsync: vi.fn(), isPending: false },
                inativarMutation: { mutateAsync: vi.fn(), isPending: false }
            });

            instalarAdapters();
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            const novaSerie = (await screen.findByRole('button', { name: /nova série/i })) as HTMLButtonElement;
            expect(novaSerie.disabled).toBe(true);
            expect(novaSerie.title).toBe(SERIES_FISCAIS_PERMISSAO.novaSerieSemGerenciar);
        });

        it('S1: sem Ampliar/Encerrar/Inativar; Buracos presente', async () => {
            const contexto = contextoPara(empresaA);
            mockedUseOrganizationalContext.mockReturnValue(contexto);
            mockedUsePermissions.mockReturnValue({
                hasPermission: (code: string) => code === 'FISCAL_SERIES_CONSULTAR',
                hasAnyPermission: () => false,
                hasAllPermissions: () => false
            });
            mockedUseSeriesFiscais.mockReturnValue({
                data: { items: seriesMock, totalItems: 1, pageNumber: 1, pageSize: 20 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseModelosDocumentoFiscal.mockReturnValue({
                data: { items: modelosMock, totalItems: 1 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseSeriesFiscaisMutations.mockReturnValue({
                criarMutation: { mutateAsync: vi.fn(), isPending: false },
                ampliarMutation: { mutateAsync: vi.fn(), isPending: false },
                encerrarVigenciaMutation: { mutateAsync: vi.fn(), isPending: false },
                inativarMutation: { mutateAsync: vi.fn(), isPending: false }
            });

            instalarAdapters();
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            await waitFor(() => expect(screen.getByRole('columnheader', { name: SERIES_FISCAIS_COLUNAS.acoes })).toBeInTheDocument());
            // Buracos deve estar presente (sempre)
            expect(screen.getByRole('button', { name: /buracos/i })).toBeInTheDocument();
            // Ampliar, Encerrar, Inativar não devem estar presentes (falta permissão GERENCIAR)
            expect(screen.queryByRole('button', { name: /ampliar/i })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /encerrar/i })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /inativar/i })).not.toBeInTheDocument();
        });
    });

    describe('AC-6: Sessão S2 (CONSULTAR + GERENCIAR + MODELOS)', () => {
        it('S2: linha ativa com as 4 ações', async () => {
            const contexto = contextoPara(empresaA);
            mockedUseOrganizationalContext.mockReturnValue(contexto);
            mockedUsePermissions.mockReturnValue({
                hasPermission: () => true,
                hasAnyPermission: () => true,
                hasAllPermissions: () => true
            });
            mockedUseSeriesFiscais.mockReturnValue({
                data: { items: seriesMock, totalItems: 1, pageNumber: 1, pageSize: 20 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseModelosDocumentoFiscal.mockReturnValue({
                data: { items: modelosMock, totalItems: 1 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseSeriesFiscaisMutations.mockReturnValue({
                criarMutation: { mutateAsync: vi.fn(), isPending: false },
                ampliarMutation: { mutateAsync: vi.fn(), isPending: false },
                encerrarVigenciaMutation: { mutateAsync: vi.fn(), isPending: false },
                inativarMutation: { mutateAsync: vi.fn(), isPending: false }
            });

            instalarAdapters();
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            await waitFor(() => expect(screen.getByRole('button', { name: /buracos/i })).toBeInTheDocument());
            expect(screen.getByRole('button', { name: /ampliar/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /encerrar/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /inativar/i })).toBeInTheDocument();
        });

        it('S2: botão "Nova série" habilitado', async () => {
            const contexto = contextoPara(empresaA);
            mockedUseOrganizationalContext.mockReturnValue(contexto);
            mockedUsePermissions.mockReturnValue({
                hasPermission: () => true,
                hasAnyPermission: () => true,
                hasAllPermissions: () => true
            });
            mockedUseSeriesFiscais.mockReturnValue({
                data: { items: seriesMock, totalItems: 1, pageNumber: 1, pageSize: 20 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseModelosDocumentoFiscal.mockReturnValue({
                data: { items: modelosMock, totalItems: 1 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseSeriesFiscaisMutations.mockReturnValue({
                criarMutation: { mutateAsync: vi.fn(), isPending: false },
                ampliarMutation: { mutateAsync: vi.fn(), isPending: false },
                encerrarVigenciaMutation: { mutateAsync: vi.fn(), isPending: false },
                inativarMutation: { mutateAsync: vi.fn(), isPending: false }
            });

            instalarAdapters();
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            const novaSerie = (await screen.findByRole('button', { name: /nova série/i })) as HTMLButtonElement;
            expect(novaSerie.disabled).toBe(false);
        });
    });

    describe('AC-6: Sessão S2b (CONSULTAR + GERENCIAR, sem MODELOS)', () => {
        it('S2b: "Nova série" desabilitada com title "Permissão necessária: FISCAL_MODELOS_CONSULTAR."', async () => {
            const contexto = contextoPara(empresaA);
            mockedUseOrganizationalContext.mockReturnValue(contexto);
            mockedUsePermissions.mockReturnValue({
                hasPermission: (code: string) => code !== 'FISCAL_MODELOS_CONSULTAR',
                hasAnyPermission: (codes?: string[]) => Boolean(codes?.some((c) => c !== 'FISCAL_MODELOS_CONSULTAR')),
                hasAllPermissions: () => false
            });
            mockedUseSeriesFiscais.mockReturnValue({
                data: { items: seriesMock, totalItems: 1, pageNumber: 1, pageSize: 20 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseModelosDocumentoFiscal.mockReturnValue({
                data: { items: modelosMock, totalItems: 1 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseSeriesFiscaisMutations.mockReturnValue({
                criarMutation: { mutateAsync: vi.fn(), isPending: false },
                ampliarMutation: { mutateAsync: vi.fn(), isPending: false },
                encerrarVigenciaMutation: { mutateAsync: vi.fn(), isPending: false },
                inativarMutation: { mutateAsync: vi.fn(), isPending: false }
            });

            instalarAdapters();
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            const novaSerie = (await screen.findByRole('button', { name: /nova série/i })) as HTMLButtonElement;
            expect(novaSerie.disabled).toBe(true);
            expect(novaSerie.title).toBe(SERIES_FISCAIS_PERMISSAO.novaSerieSemModelos);
        });
    });

    describe('AC-6: Sessão S3/S4 (sem FISCAL_SERIES_CONSULTAR)', () => {
        it('S3/S4: UnauthorizedState com "Séries fiscais exigem FISCAL_SERIES_CONSULTAR." e 0 chamada a /api/fiscal/series', async () => {
            const contexto = contextoPara(empresaA);
            mockedUseOrganizationalContext.mockReturnValue(contexto);
            mockedUsePermissions.mockReturnValue({
                hasPermission: () => false,
                hasAnyPermission: () => false,
                hasAllPermissions: () => false
            });
            mockedUseSeriesFiscais.mockReturnValue({
                data: { items: seriesMock, totalItems: 1, pageNumber: 1, pageSize: 20 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseModelosDocumentoFiscal.mockReturnValue({
                data: { items: modelosMock, totalItems: 1 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseSeriesFiscaisMutations.mockReturnValue({
                criarMutation: { mutateAsync: vi.fn(), isPending: false },
                ampliarMutation: { mutateAsync: vi.fn(), isPending: false },
                encerrarVigenciaMutation: { mutateAsync: vi.fn(), isPending: false },
                inativarMutation: { mutateAsync: vi.fn(), isPending: false }
            });

            const chamadas = instalarAdapters();
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            await waitFor(() => expect(screen.getByText(SERIES_FISCAIS_PERMISSAO.unauthorizedDescription)).toBeInTheDocument());
            const seriesCalls = chamadas.filter((c) => c.url === '/api/fiscal/series');
            expect(seriesCalls).toHaveLength(0);
        });
    });

    describe('AC-8: Colunas, situação e filtro padrão', () => {
        it('AC-8: renderiza colunas Modelo, Série, Estabelecimento, Faixa, Próximo, Restantes, Vigência, Situação', async () => {
            const contexto = contextoPara(empresaA);
            mockedUseOrganizationalContext.mockReturnValue(contexto);
            mockedUsePermissions.mockReturnValue({
                hasPermission: () => true,
                hasAnyPermission: () => true,
                hasAllPermissions: () => true
            });
            mockedUseSeriesFiscais.mockReturnValue({
                data: { items: seriesMock, totalItems: 1, pageNumber: 1, pageSize: 20 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseModelosDocumentoFiscal.mockReturnValue({
                data: { items: modelosMock, totalItems: 1 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseSeriesFiscaisMutations.mockReturnValue({
                criarMutation: { mutateAsync: vi.fn(), isPending: false },
                ampliarMutation: { mutateAsync: vi.fn(), isPending: false },
                encerrarVigenciaMutation: { mutateAsync: vi.fn(), isPending: false },
                inativarMutation: { mutateAsync: vi.fn(), isPending: false }
            });

            instalarAdapters();
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            expect(await screen.findByRole('columnheader', { name: SERIES_FISCAIS_COLUNAS.modelo })).toBeInTheDocument();
            expect(screen.getByRole('columnheader', { name: SERIES_FISCAIS_COLUNAS.serie })).toBeInTheDocument();
            expect(screen.getByRole('columnheader', { name: SERIES_FISCAIS_COLUNAS.estabelecimento })).toBeInTheDocument();
            expect(screen.getByRole('columnheader', { name: SERIES_FISCAIS_COLUNAS.faixa })).toBeInTheDocument();
            expect(screen.getByRole('columnheader', { name: SERIES_FISCAIS_COLUNAS.proximo })).toBeInTheDocument();
            expect(screen.getByRole('columnheader', { name: SERIES_FISCAIS_COLUNAS.restantes })).toBeInTheDocument();
            expect(screen.getByRole('columnheader', { name: SERIES_FISCAIS_COLUNAS.vigencia })).toBeInTheDocument();
            expect(screen.getByRole('columnheader', { name: SERIES_FISCAIS_COLUNAS.situacao })).toBeInTheDocument();
            expect(screen.getByRole('columnheader', { name: SERIES_FISCAIS_COLUNAS.acoes })).toBeInTheDocument();
        });

        it('AC-8: filtro Situação tem padrão "Ativas"', async () => {
            const contexto = contextoPara(empresaA);
            mockedUseOrganizationalContext.mockReturnValue(contexto);
            mockedUsePermissions.mockReturnValue({
                hasPermission: () => true,
                hasAnyPermission: () => true,
                hasAllPermissions: () => true
            });

            // Verificar que o primeiro GET envia somenteAtivas: true (padrão)
            mockedUseSeriesFiscais.mockImplementation((scopeKey: unknown, query: unknown) => {
                const q = query as Record<string, unknown>;
                expect(q.somenteAtivas).toBe(true);
                return {
                    data: { items: seriesMock, totalItems: 1, pageNumber: 1, pageSize: 20 },
                    isLoading: false,
                    isFetching: false,
                    error: null,
                    refetch: vi.fn()
                };
            });

            mockedUseModelosDocumentoFiscal.mockReturnValue({
                data: { items: modelosMock, totalItems: 1 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseSeriesFiscaisMutations.mockReturnValue({
                criarMutation: { mutateAsync: vi.fn(), isPending: false },
                ampliarMutation: { mutateAsync: vi.fn(), isPending: false },
                encerrarVigenciaMutation: { mutateAsync: vi.fn(), isPending: false },
                inativarMutation: { mutateAsync: vi.fn(), isPending: false }
            });

            instalarAdapters();
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            await waitFor(() => expect(screen.getByText(SERIES_FISCAIS_COLUNAS.modelo)).toBeInTheDocument());
        });
    });

    describe('AC-7: Contexto organizacional (SB4, SB5)', () => {
        it('AC-7: sem empresa (isGlobal: true): 0 GET de séries', async () => {
            const contextoGlobal = {
                empresaId: null,
                filialId: null,
                isGlobal: true,
                canChangeOrganization: true,
                requiresOrganizationSelection: true,
                snapshot: Object.freeze({ empresaId: null, filialId: null, isMaster: false, revision: 1 }),
                organizationalScopeKey: organizationalScopeKey(Object.freeze({ empresaId: null, filialId: null, isMaster: false, revision: 1 })),
                setEmpresaId: vi.fn(),
                setFilialId: vi.fn()
            };

            mockedUseOrganizationalContext.mockReturnValue(contextoGlobal);
            mockedUsePermissions.mockReturnValue({
                hasPermission: () => true,
                hasAnyPermission: () => true,
                hasAllPermissions: () => true
            });
            mockedUseSeriesFiscais.mockReturnValue({
                data: null,
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseModelosDocumentoFiscal.mockReturnValue({
                data: { items: modelosMock, totalItems: 1 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseSeriesFiscaisMutations.mockReturnValue({
                criarMutation: { mutateAsync: vi.fn(), isPending: false },
                ampliarMutation: { mutateAsync: vi.fn(), isPending: false },
                encerrarVigenciaMutation: { mutateAsync: vi.fn(), isPending: false },
                inativarMutation: { mutateAsync: vi.fn(), isPending: false }
            });

            const chamadas = instalarAdapters();
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            await waitFor(() => expect(screen.getByText('Séries fiscais')).toBeInTheDocument());
            const seriesCalls = chamadas.filter((c) => c.url === '/api/fiscal/series');
            expect(seriesCalls).toHaveLength(0);
        });

        it('AC-7 + SB4: trocar empresa A→B dispara nova GET com empresaId=B', async () => {
            mockedUseOrganizationalContext.mockReturnValue(contextoPara(empresaA));
            mockedUsePermissions.mockReturnValue({
                hasPermission: () => true,
                hasAnyPermission: () => true,
                hasAllPermissions: () => true
            });

            let callCount = 0;
            mockedUseSeriesFiscais.mockImplementation((scopeKey: unknown, query: unknown) => {
                callCount++;
                return {
                    data: { items: seriesMock, totalItems: 1, pageNumber: 1, pageSize: 20 },
                    isLoading: false,
                    isFetching: false,
                    error: null,
                    refetch: vi.fn()
                };
            });

            mockedUseModelosDocumentoFiscal.mockReturnValue({
                data: { items: modelosMock, totalItems: 1 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseSeriesFiscaisMutations.mockReturnValue({
                criarMutation: { mutateAsync: vi.fn(), isPending: false },
                ampliarMutation: { mutateAsync: vi.fn(), isPending: false },
                encerrarVigenciaMutation: { mutateAsync: vi.fn(), isPending: false },
                inativarMutation: { mutateAsync: vi.fn(), isPending: false }
            });

            const chamadas = instalarAdapters();
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

            const view = render(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            await screen.findByText(SERIES_FISCAIS_COLUNAS.modelo);
            expect(mockedUseSeriesFiscais).toHaveBeenLastCalledWith(contextoPara(empresaA).organizationalScopeKey, expect.objectContaining({ empresaId: empresaA }));

            mockedUseOrganizationalContext.mockReturnValue(contextoPara(empresaB));
            view.rerender(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            await waitFor(() => {
                expect(mockedUseSeriesFiscais).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ empresaId: empresaB }));
            });
        });
    });

    describe('AC-8 + SB14: Filtro "Todas" omite somenteAtivas (sabotagem SB14: envia false)', () => {
        it('SB14: filtro "Todas" deve omitir somenteAtivas (não enviar false)', async () => {
            const contexto = contextoPara(empresaA);
            mockedUseOrganizationalContext.mockReturnValue(contexto);
            mockedUsePermissions.mockReturnValue({
                hasPermission: () => true,
                hasAnyPermission: () => true,
                hasAllPermissions: () => true
            });

            let queryCapturada: Record<string, unknown> | null = null;
            mockedUseSeriesFiscais.mockImplementation((scopeKey: unknown, query: unknown) => {
                queryCapturada = query as Record<string, unknown>;
                return {
                    data: { items: seriesMock, totalItems: 1, pageNumber: 1, pageSize: 20 },
                    isLoading: false,
                    isFetching: false,
                    error: null,
                    refetch: vi.fn()
                };
            });

            mockedUseModelosDocumentoFiscal.mockReturnValue({
                data: { items: modelosMock, totalItems: 1 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseSeriesFiscaisMutations.mockReturnValue({
                criarMutation: { mutateAsync: vi.fn(), isPending: false },
                ampliarMutation: { mutateAsync: vi.fn(), isPending: false },
                encerrarVigenciaMutation: { mutateAsync: vi.fn(), isPending: false },
                inativarMutation: { mutateAsync: vi.fn(), isPending: false }
            });

            instalarAdapters();
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

            const view = render(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            await waitFor(() => expect(screen.getByText(SERIES_FISCAIS_COLUNAS.modelo)).toBeInTheDocument());

            // Clicar no filtro e selecionar "Todas"
            const dropdown = screen.getAllByText('Ativas').find((element) => element.tagName === 'SPAN');
            expect(dropdown).toBeDefined();
            await userEvent.click(dropdown!);
            const todasOption = screen.getByText('Todas');
            await userEvent.click(todasOption);

            // Verificar que a query NÃO tem somenteAtivas (deve ser undefined, não false)
            await waitFor(() => {
                expect(queryCapturada?.somenteAtivas).toBeUndefined();
            });
        });
    });

    describe('AC-8: Estado vazio', () => {
        it('AC-8: renderiza EmptyState quando lista vazia', async () => {
            const contexto = contextoPara(empresaA);
            mockedUseOrganizationalContext.mockReturnValue(contexto);
            mockedUsePermissions.mockReturnValue({
                hasPermission: () => true,
                hasAnyPermission: () => true,
                hasAllPermissions: () => true
            });
            mockedUseSeriesFiscais.mockReturnValue({
                data: { items: [], totalItems: 0, pageNumber: 1, pageSize: 20 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseModelosDocumentoFiscal.mockReturnValue({
                data: { items: modelosMock, totalItems: 1 },
                isLoading: false,
                isFetching: false,
                error: null,
                refetch: vi.fn()
            });
            mockedUseSeriesFiscaisMutations.mockReturnValue({
                criarMutation: { mutateAsync: vi.fn(), isPending: false },
                ampliarMutation: { mutateAsync: vi.fn(), isPending: false },
                encerrarVigenciaMutation: { mutateAsync: vi.fn(), isPending: false },
                inativarMutation: { mutateAsync: vi.fn(), isPending: false }
            });

            instalarAdapters();
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <SeriesFiscaisPage />
                </QueryClientProvider>
            );

            expect((await screen.findAllByText('Nenhuma série fiscal cadastrada')).length).toBeGreaterThan(0);
            expect(screen.getByText('Cadastre a primeira série fiscal para esta empresa e filial.')).toBeInTheDocument();
        });
    });
});
