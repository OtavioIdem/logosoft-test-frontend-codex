import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { useCondicoesPagamento } from '@/features/financeiro/hooks/useFinanceiroResources';
import { produtosApi } from '@/features/produtos/api/produtosApi';
import { clientesApi } from '@/features/clientes/api/clientesApi';
import { fornecedoresApi } from '@/features/fornecedores/api/fornecedoresApi';
import { pessoasApi } from '@/features/pessoas/api/pessoasApi';
import { financeiroApi } from '@/features/financeiro/api/financeiroApi';

vi.mock('@/features/produtos/api/produtosApi');
vi.mock('@/features/clientes/api/clientesApi');
vi.mock('@/features/fornecedores/api/fornecedoresApi');
vi.mock('@/features/pessoas/api/pessoasApi');
vi.mock('@/features/financeiro/api/financeiroApi');

// v1.11.0a8b76.c2 — F1. EmpresaFilialFilter hidrata filters.empresaId num useEffect; na primeira renderização
// o filtro ainda é {} e a listagem saía sem empresaId, com HTTP 400 `*.EmpresaObrigatoria` do backend.
// Cada hook abaixo só pode consultar quando a empresa existe.
const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

type Caso = {
    hook: string;
    // `useComEmpresa` executa o hook com o empresaId informado; `api` devolve o spy da listagem que ele dispara.
    useComEmpresa: (empresa: string | null | undefined) => unknown;
    api: () => ReturnType<typeof vi.fn>;
    argumentoEsperado: Record<string, unknown>;
};

const casos: Caso[] = [
    {
        hook: 'useProdutos',
        useComEmpresa: (empresa) => useProdutos(empresa === undefined ? {} : { empresaId: empresa }),
        api: () => vi.mocked(produtosApi.listar) as unknown as ReturnType<typeof vi.fn>,
        argumentoEsperado: { empresaId }
    },
    {
        hook: 'useClientes',
        useComEmpresa: (empresa) => useClientes(empresa === undefined ? {} : { empresaId: empresa }),
        api: () => vi.mocked(clientesApi.listar) as unknown as ReturnType<typeof vi.fn>,
        argumentoEsperado: { empresaId }
    },
    {
        hook: 'useFornecedores',
        useComEmpresa: (empresa) => useFornecedores(empresa === undefined ? {} : { empresaId: empresa }),
        api: () => vi.mocked(fornecedoresApi.listar) as unknown as ReturnType<typeof vi.fn>,
        argumentoEsperado: { empresaId }
    },
    {
        hook: 'usePessoas',
        useComEmpresa: (empresa) => usePessoas(empresa === undefined ? {} : { empresaId: empresa }),
        api: () => vi.mocked(pessoasApi.listar) as unknown as ReturnType<typeof vi.fn>,
        argumentoEsperado: { empresaId }
    },
    {
        hook: 'useCondicoesPagamento',
        useComEmpresa: (empresa) => useCondicoesPagamento(empresa),
        api: () => vi.mocked(financeiroApi.listarCondicoesPagamento) as unknown as ReturnType<typeof vi.fn>,
        argumentoEsperado: { empresaId }
    }
];

describe('Listagens escopadas por empresa — guarda enabled (F1, v1.11.0a8b76.c2)', () => {
    let queryClient: QueryClient;
    const wrapper = ({ children }: { children: React.ReactNode }) =>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

    beforeEach(() => {
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        vi.clearAllMocks();
    });

    describe.each(casos)('$hook', ({ hook, useComEmpresa, api, argumentoEsperado }) => {
        it(`${hook}: não dispara API sem empresaId`, async () => {
            const { result } = renderHook(() => useComEmpresa(undefined) as { fetchStatus: string; data: unknown }, { wrapper });

            await waitFor(() => {
                expect(result.current.fetchStatus).toBe('idle');
            });

            expect(result.current.data).toBeUndefined();
            expect(api()).not.toHaveBeenCalled();
        });

        it(`${hook}: não dispara API com empresaId null explícito`, async () => {
            const { result } = renderHook(() => useComEmpresa(null) as { fetchStatus: string; data: unknown }, { wrapper });

            await waitFor(() => {
                expect(result.current.fetchStatus).toBe('idle');
            });

            expect(result.current.data).toBeUndefined();
            expect(api()).not.toHaveBeenCalled();
        });

        it(`${hook}: dispara API com empresaId válido e envia o parâmetro`, async () => {
            api().mockResolvedValueOnce([]);

            const { result } = renderHook(() => useComEmpresa(empresaId) as { isSuccess: boolean }, { wrapper });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(api()).toHaveBeenCalledTimes(1);
            expect(api().mock.calls[0][0]).toEqual(argumentoEsperado);
        });
    });

    // Passagem de `enabled: false` explícito continua mandando: a guarda de empresa soma, não substitui.
    it('useProdutos: enabled=false explícito continua bloqueando mesmo com empresaId', async () => {
        const { result } = renderHook(() => useProdutos({ empresaId }, false), { wrapper });

        await waitFor(() => {
            expect(result.current.fetchStatus).toBe('idle');
        });

        expect(vi.mocked(produtosApi.listar)).not.toHaveBeenCalled();
    });

    it('usePessoas: options.enabled=false explícito continua bloqueando mesmo com empresaId', async () => {
        const { result } = renderHook(() => usePessoas({ empresaId }, { enabled: false }), { wrapper });

        await waitFor(() => {
            expect(result.current.fetchStatus).toBe('idle');
        });

        expect(vi.mocked(pessoasApi.listar)).not.toHaveBeenCalled();
    });

    it('useCondicoesPagamento: enabled=false explícito continua bloqueando mesmo com empresaId', async () => {
        const { result } = renderHook(() => useCondicoesPagamento(empresaId, false), { wrapper });

        await waitFor(() => {
            expect(result.current.fetchStatus).toBe('idle');
        });

        expect(vi.mocked(financeiroApi.listarCondicoesPagamento)).not.toHaveBeenCalled();
    });
});
