'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeiroAvancadoApi } from '@/features/financeiro-avancado/api/financeiroAvancadoApi';
import { ContasListQuery, FluxoCaixaQuery, TipoConta } from '@/features/financeiro-avancado/types/financeiroAvancado.types';

export const contasAvancadoQueryKey = (tipo: TipoConta, query?: ContasListQuery) => ['financeiro-avancado-contas', tipo, query ?? {}] as const;
export const contaAvancadoDetalheQueryKey = (id?: string | null) => ['financeiro-avancado-conta', id ?? null] as const;
export const fluxoCaixaQueryKey = (query?: FluxoCaixaQuery) => ['financeiro-avancado-fluxo', query ?? {}] as const;

export const useContasAvancado = (tipo: TipoConta, query: ContasListQuery = {}, enabled = true) =>
    useQuery({ queryKey: contasAvancadoQueryKey(tipo, query), queryFn: () => financeiroAvancadoApi.listar(tipo, query), enabled });

export const useContaAvancado = (id?: string | null) =>
    useQuery({ queryKey: contaAvancadoDetalheQueryKey(id), queryFn: () => financeiroAvancadoApi.obter(id as string), enabled: Boolean(id) });

export const useFluxoCaixaAvancado = (query: FluxoCaixaQuery = {}, enabled = true) =>
    useQuery({ queryKey: fluxoCaixaQueryKey(query), queryFn: () => financeiroAvancadoApi.fluxoCaixa(query), enabled });

type TipoIdValues = { tipo: TipoConta; id: string; values: unknown };

export const useContasAvancadoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['financeiro-avancado-contas'] });
        queryClient.invalidateQueries({ queryKey: ['financeiro-avancado-conta'] });
        queryClient.invalidateQueries({ queryKey: ['financeiro-avancado-fluxo'] });
    };
    const criarMutation = useMutation({ mutationFn: ({ tipo, values }: { tipo: TipoConta; values: unknown }) => financeiroAvancadoApi.criar(tipo, values), onSuccess: invalidate });
    const baixarMutation = useMutation({ mutationFn: ({ tipo, id, values }: TipoIdValues) => financeiroAvancadoApi.baixar(tipo, id, values), onSuccess: invalidate });
    const estornarMutation = useMutation({ mutationFn: ({ tipo, id, values }: TipoIdValues) => financeiroAvancadoApi.estornar(tipo, id, values), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ tipo, id, motivo }: { tipo: TipoConta; id: string; motivo: string }) => financeiroAvancadoApi.cancelar(tipo, id, motivo), onSuccess: invalidate });
    return { criarMutation, baixarMutation, estornarMutation, cancelarMutation };
};
