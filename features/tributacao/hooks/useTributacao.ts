'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tributacaoApi } from '@/features/tributacao/api/tributacaoApi';
import { ExcecaoFiscalListQuery, ExcecaoFiscalNcmListQuery, RegraFiscalListQuery } from '@/features/tributacao/types/tributacao.types';

export const regrasFiscaisQueryKey = (query?: RegraFiscalListQuery) => ['tributacao', 'regras', query] as const;
export const regraFiscalQueryKey = (id?: string | null) => ['tributacao', 'regra', id] as const;
export const excecoesFiscaisQueryKey = (query?: ExcecaoFiscalListQuery) => ['tributacao', 'excecoes', query] as const;
export const excecaoFiscalQueryKey = (id?: string | null) => ['tributacao', 'excecao', id] as const;
export const excecoesFiscaisNcmQueryKey = (query?: ExcecaoFiscalNcmListQuery) => ['tributacao', 'excecoes-ncm', query] as const;
export const excecaoFiscalNcmQueryKey = (id?: string | null) => ['tributacao', 'excecao-ncm', id] as const;

/**
 * Simulação é **mutation**, não query: o corpo é grande, o backend não cacheia e a tela dispara sob demanda.
 * Read-only no backend — chamar de novo não gera efeito colateral.
 */
export const useSimularTributacao = () => useMutation({ mutationFn: (values: unknown) => tributacaoApi.simular(values) });

export const useRegrasFiscais = (query: RegraFiscalListQuery = {}) =>
    useQuery({
        queryKey: regrasFiscaisQueryKey(query),
        queryFn: () => tributacaoApi.listarRegras(query),
        enabled: Boolean(query.empresaId)
    });

export const useRegraFiscal = (id?: string | null) =>
    useQuery({
        queryKey: regraFiscalQueryKey(id),
        queryFn: () => tributacaoApi.buscarRegra(id ?? ''),
        enabled: Boolean(id)
    });

export const useExcecoesFiscais = (query: ExcecaoFiscalListQuery = {}) =>
    useQuery({
        queryKey: excecoesFiscaisQueryKey(query),
        queryFn: () => tributacaoApi.listarExcecoes(query),
        enabled: Boolean(query.empresaId)
    });

export const useExcecaoFiscal = (id?: string | null) =>
    useQuery({
        queryKey: excecaoFiscalQueryKey(id),
        queryFn: () => tributacaoApi.buscarExcecao(id ?? ''),
        enabled: Boolean(id)
    });

export const useExcecoesFiscaisNcm = (query: ExcecaoFiscalNcmListQuery = {}) =>
    useQuery({
        queryKey: excecoesFiscaisNcmQueryKey(query),
        queryFn: () => tributacaoApi.listarExcecoesNcm(query),
        enabled: Boolean(query.empresaId)
    });

export const useExcecaoFiscalNcm = (id?: string | null) =>
    useQuery({
        queryKey: excecaoFiscalNcmQueryKey(id),
        queryFn: () => tributacaoApi.buscarExcecaoNcm(id ?? ''),
        enabled: Boolean(id)
    });

export const useRegrasFiscaisMutations = () => {
    const queryClient = useQueryClient();
    const invalidarRegras = (id?: string | null) => {
        queryClient.invalidateQueries({ queryKey: ['tributacao', 'regras'] });
        if (id) queryClient.invalidateQueries({ queryKey: regraFiscalQueryKey(id) });
    };

    const criarMutation = useMutation({ mutationFn: (values: unknown) => tributacaoApi.criarRegra(values), onSuccess: (regra) => invalidarRegras(regra.id) });
    const atualizarMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => tributacaoApi.atualizarRegra(id, values), onSuccess: (regra) => invalidarRegras(regra.id) });
    const inativarMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => tributacaoApi.inativarRegra(id, values), onSuccess: (id) => invalidarRegras(id) });

    return { criarMutation, atualizarMutation, inativarMutation };
};

export const useExcecoesFiscaisMutations = () => {
    const queryClient = useQueryClient();
    const invalidarExcecoes = (id?: string | null) => {
        queryClient.invalidateQueries({ queryKey: ['tributacao', 'excecoes'] });
        if (id) queryClient.invalidateQueries({ queryKey: excecaoFiscalQueryKey(id) });
    };

    const criarMutation = useMutation({ mutationFn: (values: unknown) => tributacaoApi.criarExcecao(values), onSuccess: (excecao) => invalidarExcecoes(excecao.id) });
    const atualizarMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => tributacaoApi.atualizarExcecao(id, values), onSuccess: (excecao) => invalidarExcecoes(excecao.id) });
    const inativarMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => tributacaoApi.inativarExcecao(id, values), onSuccess: (id) => invalidarExcecoes(id) });

    return { criarMutation, atualizarMutation, inativarMutation };
};

export const useExcecoesFiscaisNcmMutations = () => {
    const queryClient = useQueryClient();
    const invalidarExcecoesNcm = (id?: string | null) => {
        queryClient.invalidateQueries({ queryKey: ['tributacao', 'excecoes-ncm'] });
        if (id) queryClient.invalidateQueries({ queryKey: excecaoFiscalNcmQueryKey(id) });
    };

    const criarMutation = useMutation({ mutationFn: (values: unknown) => tributacaoApi.criarExcecaoNcm(values), onSuccess: (excecao) => invalidarExcecoesNcm(excecao.id) });
    const atualizarMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => tributacaoApi.atualizarExcecaoNcm(id, values), onSuccess: (excecao) => invalidarExcecoesNcm(excecao.id) });
    const inativarMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => tributacaoApi.inativarExcecaoNcm(id, values), onSuccess: (id) => invalidarExcecoesNcm(id) });

    return { criarMutation, atualizarMutation, inativarMutation };
};
