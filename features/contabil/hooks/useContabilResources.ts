'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contabilApi } from '@/features/contabil/api/contabilApi';
import { LancamentosListQuery, PeriodosListQuery, PlanoContasListQuery, RegrasListQuery } from '@/features/contabil/types/contabil.types';

export const planoContasQueryKey = (query?: PlanoContasListQuery) => ['contabil-plano-contas', query ?? {}] as const;
export const periodosQueryKey = (query?: PeriodosListQuery) => ['contabil-periodos', query ?? {}] as const;
export const lancamentosQueryKey = (query?: LancamentosListQuery) => ['contabil-lancamentos', query ?? {}] as const;
export const lancamentoDetalheQueryKey = (id?: string | null) => ['contabil-lancamento', id ?? null] as const;
export const regrasQueryKey = (query?: RegrasListQuery) => ['contabil-regras', query ?? {}] as const;

// ---- Plano de contas ----
export const usePlanoContas = (query: PlanoContasListQuery = {}, enabled = true) =>
    useQuery({ queryKey: planoContasQueryKey(query), queryFn: () => contabilApi.listarContas(query), enabled });

export const usePlanoContasMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contabil-plano-contas'] });
    const criarMutation = useMutation({ mutationFn: (values: unknown) => contabilApi.criarConta(values), onSuccess: invalidate });
    const inativarMutation = useMutation({ mutationFn: (id: string) => contabilApi.inativarConta(id), onSuccess: invalidate });
    return { criarMutation, inativarMutation };
};

// ---- Períodos ----
export const usePeriodos = (query: PeriodosListQuery = {}, enabled = true) =>
    useQuery({ queryKey: periodosQueryKey(query), queryFn: () => contabilApi.listarPeriodos(query), enabled });

export const usePeriodoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contabil-periodos'] });
    const abrirMutation = useMutation({ mutationFn: (values: unknown) => contabilApi.abrirPeriodo(values), onSuccess: invalidate });
    const fecharMutation = useMutation({ mutationFn: ({ id, observacao }: { id: string; observacao?: string | null }) => contabilApi.fecharPeriodo(id, observacao), onSuccess: invalidate });
    const reabrirMutation = useMutation({ mutationFn: ({ id, observacao }: { id: string; observacao?: string | null }) => contabilApi.reabrirPeriodo(id, observacao), onSuccess: invalidate });
    return { abrirMutation, fecharMutation, reabrirMutation };
};

// ---- Lançamentos ----
export const useLancamentos = (query: LancamentosListQuery = {}, enabled = true) =>
    useQuery({ queryKey: lancamentosQueryKey(query), queryFn: () => contabilApi.listarLancamentos(query), enabled });

export const useLancamento = (id?: string | null) =>
    useQuery({ queryKey: lancamentoDetalheQueryKey(id), queryFn: () => contabilApi.obterLancamento(id as string), enabled: Boolean(id) });

export const useLancamentoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['contabil-lancamentos'] });
        queryClient.invalidateQueries({ queryKey: ['contabil-lancamento'] });
    };
    const criarMutation = useMutation({ mutationFn: (values: unknown) => contabilApi.criarLancamento(values), onSuccess: invalidate });
    const estornarMutation = useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => contabilApi.estornarLancamento(id, motivo), onSuccess: invalidate });
    return { criarMutation, estornarMutation };
};

// ---- Regras ----
export const useRegras = (query: RegrasListQuery = {}, enabled = true) =>
    useQuery({ queryKey: regrasQueryKey(query), queryFn: () => contabilApi.listarRegras(query), enabled });

export const useRegraMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contabil-regras'] });
    const criarMutation = useMutation({ mutationFn: (values: unknown) => contabilApi.criarRegra(values), onSuccess: invalidate });
    const inativarMutation = useMutation({ mutationFn: (id: string) => contabilApi.inativarRegra(id), onSuccess: invalidate });
    return { criarMutation, inativarMutation };
};
