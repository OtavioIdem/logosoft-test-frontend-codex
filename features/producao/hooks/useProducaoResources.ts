'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { producaoApi } from '@/features/producao/api/producaoApi';
import { FichasTecnicasListQuery, OrdensProducaoListQuery } from '@/features/producao/types/producao.types';

export const fichasQueryKey = (query?: FichasTecnicasListQuery) => ['producao-fichas', query ?? {}] as const;
export const fichaDetalheQueryKey = (id?: string | null) => ['producao-ficha', id ?? null] as const;
export const ordensQueryKey = (query?: OrdensProducaoListQuery) => ['producao-ordens', query ?? {}] as const;
export const ordemDetalheQueryKey = (id?: string | null) => ['producao-ordem', id ?? null] as const;
export const necessidadeQueryKey = (id?: string | null) => ['producao-necessidade', id ?? null] as const;

type IdValues = { id: string; values: unknown };

// ---- Fichas técnicas ----
export const useFichasTecnicas = (query: FichasTecnicasListQuery = {}, enabled = true) =>
    useQuery({ queryKey: fichasQueryKey(query), queryFn: () => producaoApi.listarFichas(query), enabled });

export const useFichaTecnica = (id?: string | null) =>
    useQuery({ queryKey: fichaDetalheQueryKey(id), queryFn: () => producaoApi.obterFicha(id as string), enabled: Boolean(id) });

export const useFichaTecnicaMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['producao-fichas'] });
        queryClient.invalidateQueries({ queryKey: ['producao-ficha'] });
    };
    const criarMutation = useMutation({ mutationFn: (values: unknown) => producaoApi.criarFicha(values), onSuccess: invalidate });
    const componenteMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => producaoApi.adicionarComponente(id, values), onSuccess: invalidate });
    const ativarMutation = useMutation({ mutationFn: (id: string) => producaoApi.ativarFicha(id), onSuccess: invalidate });
    const inativarMutation = useMutation({ mutationFn: (id: string) => producaoApi.inativarFicha(id), onSuccess: invalidate });
    return { criarMutation, componenteMutation, ativarMutation, inativarMutation };
};

// ---- Ordens de produção ----
export const useOrdensProducao = (query: OrdensProducaoListQuery = {}, enabled = true) =>
    useQuery({ queryKey: ordensQueryKey(query), queryFn: () => producaoApi.listarOrdens(query), enabled });

export const useOrdemProducao = (id?: string | null) =>
    useQuery({ queryKey: ordemDetalheQueryKey(id), queryFn: () => producaoApi.obterOrdem(id as string), enabled: Boolean(id) });

export const useNecessidadeOrdem = (id?: string | null, enabled = true) =>
    useQuery({ queryKey: necessidadeQueryKey(id), queryFn: () => producaoApi.necessidade(id as string), enabled: Boolean(id) && enabled });

export const useOrdemProducaoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['producao-ordens'] });
        queryClient.invalidateQueries({ queryKey: ['producao-ordem'] });
        queryClient.invalidateQueries({ queryKey: ['producao-necessidade'] });
    };
    const criarMutation = useMutation({ mutationFn: (values: unknown) => producaoApi.criarOrdem(values), onSuccess: invalidate });
    const liberarMutation = useMutation({ mutationFn: (id: string) => producaoApi.liberarOrdem(id), onSuccess: invalidate });
    const apontamentoMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => producaoApi.registrarApontamento(id, values), onSuccess: invalidate });
    const encerrarMutation = useMutation({ mutationFn: ({ id, observacao }: { id: string; observacao?: string | null }) => producaoApi.encerrarOrdem(id, observacao), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => producaoApi.cancelarOrdem(id, motivo), onSuccess: invalidate });
    return { criarMutation, liberarMutation, apontamentoMutation, encerrarMutation, cancelarMutation };
};
