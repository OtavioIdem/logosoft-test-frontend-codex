'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tributacaoApi } from '@/features/tributacao/api/tributacaoApi';
import { ExcecaoFiscalListQuery, ExcecaoFiscalNcmListQuery, RegraFiscalListQuery } from '@/features/tributacao/types/tributacao.types';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { SelectOption } from '@/types/erp';

export const regrasFiscaisQueryKey = (query?: RegraFiscalListQuery) => ['tributacao', 'regras', query] as const;
export const regraFiscalQueryKey = (id?: string | null) => ['tributacao', 'regra', id] as const;
export const excecoesFiscaisQueryKey = (query?: ExcecaoFiscalListQuery) => ['tributacao', 'excecoes', query] as const;
export const excecaoFiscalQueryKey = (id?: string | null) => ['tributacao', 'excecao', id] as const;
export const excecoesFiscaisNcmQueryKey = (query?: ExcecaoFiscalNcmListQuery) => ['tributacao', 'excecoes-ncm', query] as const;
export const excecaoFiscalNcmQueryKey = (id?: string | null) => ['tributacao', 'excecao-ncm', id] as const;
export const ncmOptionsQueryKey = (termo?: string | null) => ['tributacao', 'cadastros', 'ncm', termo] as const;
export const cfopOptionsQueryKey = (termo?: string | null) => ['tributacao', 'cadastros', 'cfop', termo] as const;

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

/**
 * Busca de NCM por termo para os selects. Depende de `FISCAL_CADASTROS_CONSULTAR`, que é permissão de
 * **outro** módulo: sem ela a query nem sai, e a tela mostra a mensagem de indisponibilidade em vez de
 * empurrar um 403 para o usuário.
 */
export const useNcmOptions = (termo?: string | null) => {
    const { hasPermission } = usePermissions();
    const permitido = hasPermission('FISCAL_CADASTROS_CONSULTAR');

    const query = useQuery({
        queryKey: ncmOptionsQueryKey(termo),
        queryFn: () => tributacaoApi.listarNcm(termo),
        enabled: permitido
    });

    const options = useMemo<SelectOption<string>[]>(() => (query.data?.items ?? []).map((item) => ({ label: `${item.codigo} — ${item.descricao}`, value: item.id })), [query.data]);

    return { ...query, options, permitido, itens: query.data?.items ?? [] };
};

export const useCfopOptions = (termo?: string | null) => {
    const { hasPermission } = usePermissions();
    const permitido = hasPermission('FISCAL_CADASTROS_CONSULTAR');

    const query = useQuery({
        queryKey: cfopOptionsQueryKey(termo),
        queryFn: () => tributacaoApi.listarCfop(termo),
        enabled: permitido
    });

    const options = useMemo<SelectOption<string>[]>(() => (query.data?.items ?? []).map((item) => ({ label: `${item.codigo} — ${item.descricao}`, value: item.id })), [query.data]);

    return { ...query, options, permitido, itens: query.data?.items ?? [] };
};

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
