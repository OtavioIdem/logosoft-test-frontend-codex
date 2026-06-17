'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tabelasPrecoApi } from '@/features/tabelas-preco/api/tabelasPrecoApi';
import { PrecoVigenteQuery, TabelaPrecoListQuery } from '@/features/tabelas-preco/types/tabelasPreco.types';

export const tabelasPrecoQueryKey = (query?: TabelaPrecoListQuery) => ['tabelas-preco', query ?? {}] as const;
export const tabelaPrecoDetalheQueryKey = (id?: string | null) => ['tabelas-preco', 'detalhe', id] as const;
export const precoVigenteQueryKey = (query: PrecoVigenteQuery) => ['tabelas-preco', 'preco-vigente', query] as const;

const invalidateTabelasPreco = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: ['tabelas-preco'] });
};

export const useTabelasPreco = (query?: TabelaPrecoListQuery) =>
    useQuery({ queryKey: tabelasPrecoQueryKey(query), queryFn: () => tabelasPrecoApi.listar(query), staleTime: 30_000 });

export const useTabelaPrecoDetalhe = (id?: string | null) =>
    useQuery({ queryKey: tabelaPrecoDetalheQueryKey(id), queryFn: () => tabelasPrecoApi.obter(id as string), enabled: Boolean(id), staleTime: 30_000 });

export const usePrecoVigente = (query: PrecoVigenteQuery, enabled: boolean) =>
    useQuery({ queryKey: precoVigenteQueryKey(query), queryFn: () => tabelasPrecoApi.precoVigente(query), enabled, staleTime: 30_000 });

export const useTabelaPrecoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => invalidateTabelasPreco(queryClient);
    const saveMutation = useMutation({ mutationFn: ({ id, values }: { id?: string; values: Parameters<typeof tabelasPrecoApi.criar>[0] }) => (id ? tabelasPrecoApi.atualizar(id, values) : tabelasPrecoApi.criar(values)), onSuccess: invalidate });
    const ativarMutation = useMutation({ mutationFn: (id: string) => tabelasPrecoApi.ativar(id), onSuccess: invalidate });
    const inativarMutation = useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => tabelasPrecoApi.inativar(id, motivo), onSuccess: invalidate });
    const adicionarItemMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: Parameters<typeof tabelasPrecoApi.adicionarItem>[1] }) => tabelasPrecoApi.adicionarItem(id, values), onSuccess: invalidate });
    const atualizarItemMutation = useMutation({ mutationFn: ({ id, itemId, values }: { id: string; itemId: string; values: Parameters<typeof tabelasPrecoApi.atualizarItem>[2] }) => tabelasPrecoApi.atualizarItem(id, itemId, values), onSuccess: invalidate });
    const inativarItemMutation = useMutation({ mutationFn: ({ id, itemId, motivo }: { id: string; itemId: string; motivo: string }) => tabelasPrecoApi.inativarItem(id, itemId, motivo), onSuccess: invalidate });
    return { saveMutation, ativarMutation, inativarMutation, adicionarItemMutation, atualizarItemMutation, inativarItemMutation };
};
