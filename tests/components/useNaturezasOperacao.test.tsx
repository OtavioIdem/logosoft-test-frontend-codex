import type { InternalAxiosRequestConfig } from 'axios';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NATUREZAS_OPERACAO_ROOT_QUERY_KEY, naturezasOperacaoOpcoesQueryKey, useNaturezasOperacao, useNaturezasOperacaoMutations, useNaturezasOperacaoOpcoes } from '@/features/fiscal/hooks/useNaturezasOperacao';
import { httpClient } from '@/lib/http/httpClient';

// b72 (D98) — hooks REAIS de natureza sobre o client e o `httpClient` reais; só a rede é trocada.
// AC-2: sem empresa (ou sem a permissão), 0 GET; a troca de empresa refaz a consulta.
// AC-7: toda mutação invalida a RAIZ `['fiscal','naturezas-operacao']`, que cobre a lista da tela e o combo do
// Faturamento/Nota.

const { estado } = vi.hoisted(() => ({ estado: { perms: ['FISCAL_CADASTROS_CONSULTAR', 'FISCAL_CADASTROS_GERENCIAR'] as string[] } }));

vi.mock('@/features/auth/hooks/usePermissions', () => {
    const has = (code?: string) => !code || estado.perms.includes(code);
    return { usePermissions: () => ({ hasPermission: has, hasAnyPermission: (codes?: string[]) => !codes || codes.some(has), hasAllPermissions: (codes?: string[]) => !codes || codes.every(has) }) };
});

const empresaA = '11111111-1111-1111-1111-111111111111';
const empresaB = '99999999-9999-9999-9999-999999999999';
const naturezaId = '44444444-4444-4444-4444-444444444444';

const natureza = { id: naturezaId, empresaId: empresaA, filialId: null, codigo: 'VENDA', descricao: 'Venda', tipoDocumento: 1, tipoOperacao: 1, finalidade: 1, indicadorPresencaComprador: 1, indicadorConsumidorFinal: false, movimentaEstoque: true, geraFinanceiro: true, observacao: null, ativa: true, cfops: [] };

let capturados: { method?: string; url?: string; params: Record<string, unknown> }[];
const adapterOriginal = httpClient.defaults.adapter;

const wrapperFor = (client: QueryClient) => ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const novoClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const listagens = () => capturados.filter((item) => item.method === 'get' && item.url === '/api/fiscal/naturezas-operacao');

beforeEach(() => {
    estado.perms = ['FISCAL_CADASTROS_CONSULTAR', 'FISCAL_CADASTROS_GERENCIAR'];
    capturados = [];
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        capturados.push({ method: config.method, url: config.url, params: (config.params ?? {}) as Record<string, unknown> });
        if (config.method === 'get') return { data: { items: [natureza], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }, status: 200, statusText: 'OK', headers: {}, config };
        if (config.url?.endsWith('/inativar')) return { data: '', status: 204, statusText: 'No Content', headers: {}, config };
        return { data: natureza, status: 200, statusText: 'OK', headers: {}, config };
    });
});

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

describe('AC-2: useNaturezasOperacao e useNaturezasOperacaoOpcoes só consultam com empresa e permissão', () => {
    it('lista sem empresaId: 0 GET', async () => {
        const client = novoClient();
        const { result } = renderHook(() => useNaturezasOperacao('escopo', { empresaId: '', somenteAtivas: true }), { wrapper: wrapperFor(client) });
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(result.current.fetchStatus).toBe('idle');
        expect(listagens()).toHaveLength(0);
    });

    it('combo sem empresa: 0 GET; sem FISCAL_CADASTROS_CONSULTAR: 0 GET mesmo com empresa', async () => {
        const client = novoClient();
        renderHook(() => useNaturezasOperacaoOpcoes(null), { wrapper: wrapperFor(client) });
        estado.perms = ['FISCAL_CADASTROS_GERENCIAR'];
        const semPermissao = renderHook(() => useNaturezasOperacaoOpcoes(empresaA), { wrapper: wrapperFor(novoClient()) });
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(semPermissao.result.current.permitido).toBe(false);
        expect(listagens()).toHaveLength(0);
    });

    it('combo com empresa pede só as ativas, página cheia; trocar de empresa refaz a consulta com a nova', async () => {
        const client = novoClient();
        const { result, rerender } = renderHook(({ empresaId }) => useNaturezasOperacaoOpcoes(empresaId), { wrapper: wrapperFor(client), initialProps: { empresaId: empresaA } });
        await waitFor(() => expect(result.current.options).toEqual([{ label: 'VENDA — Venda', value: naturezaId }]));
        expect(listagens()[0].params).toMatchObject({ empresaId: empresaA, somenteAtivas: true, tamanhoPagina: 200 });

        rerender({ empresaId: empresaB });
        await waitFor(() => expect(listagens().at(-1)?.params).toMatchObject({ empresaId: empresaB, somenteAtivas: true }));
    });

    it('lista: "Todas" (somenteAtivas indefinido) não envia o parâmetro', async () => {
        const client = novoClient();
        renderHook(() => useNaturezasOperacao('escopo', { empresaId: empresaA }), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(listagens()).toHaveLength(1));
        expect(listagens()[0].params).not.toHaveProperty('somenteAtivas');
    });
});

describe('AC-7: mutações invalidam a raiz — lista da tela e combo do Faturamento', () => {
    it.each([
        ['criarMutation', (m: ReturnType<typeof useNaturezasOperacaoMutations>) => m.criarMutation.mutateAsync({ empresaId: empresaA, filialId: null, codigo: 'NOVA', descricao: 'Nova', tipoDocumento: 1, tipoOperacao: 1, finalidade: 1, indicadorPresencaComprador: 1, indicadorConsumidorFinal: false, movimentaEstoque: false, geraFinanceiro: false, observacao: null, cfops: [] })],
        ['atualizarMutation', (m: ReturnType<typeof useNaturezasOperacaoMutations>) => m.atualizarMutation.mutateAsync({ id: naturezaId, values: { descricao: 'Nova', tipoDocumento: 1, tipoOperacao: 1, finalidade: 1, indicadorPresencaComprador: 1, indicadorConsumidorFinal: false, movimentaEstoque: false, geraFinanceiro: false, observacao: null, cfops: [] } })],
        ['inativarMutation', (m: ReturnType<typeof useNaturezasOperacaoMutations>) => m.inativarMutation.mutateAsync({ id: naturezaId, values: { motivo: 'Encerrada' } })]
    ])('%s invalida a raiz e o combo em cache fica inválido', async (_nome, disparar) => {
        const client = novoClient();
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        client.setQueryData(naturezasOperacaoOpcoesQueryKey(empresaA), { items: [natureza], totalItems: 1 });
        const { result } = renderHook(() => useNaturezasOperacaoMutations(), { wrapper: wrapperFor(client) });

        await disparar(result.current);

        await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: [...NATUREZAS_OPERACAO_ROOT_QUERY_KEY] }));
        expect(NATUREZAS_OPERACAO_ROOT_QUERY_KEY).toEqual(['fiscal', 'naturezas-operacao']);
        expect(client.getQueryState(naturezasOperacaoOpcoesQueryKey(empresaA))?.isInvalidated).toBe(true);
    });

    it('invalida também quando a mutação falha', async () => {
        httpClient.defaults.adapter = vi.fn(async () => {
            throw new Error('Falha controlada');
        });
        const client = novoClient();
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useNaturezasOperacaoMutations(), { wrapper: wrapperFor(client) });
        await expect(result.current.inativarMutation.mutateAsync({ id: naturezaId, values: { motivo: 'Encerrada' } })).rejects.toThrow('Falha controlada');
        await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: [...NATUREZAS_OPERACAO_ROOT_QUERY_KEY] }));
    });
});
