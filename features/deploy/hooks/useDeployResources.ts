'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deployApi } from '@/features/deploy/api/deployApi';
import { DeploysListQuery } from '@/features/deploy/types/deploy.types';

export const ambienteQueryKey = ['deploy-ambiente'] as const;
export const migracoesQueryKey = ['deploy-migracoes'] as const;
export const deploysQueryKey = (query?: DeploysListQuery) => ['deploys', query ?? {}] as const;
export const deployDetalheQueryKey = (id?: string | null) => ['deploy', id ?? null] as const;

export const useAmbiente = (enabled = true) => useQuery({ queryKey: ambienteQueryKey, queryFn: () => deployApi.ambiente(), enabled });
export const useMigracoes = (enabled = true) => useQuery({ queryKey: migracoesQueryKey, queryFn: () => deployApi.migracoes(), enabled });

export const useDeploys = (query: DeploysListQuery = {}, enabled = true) =>
    useQuery({ queryKey: deploysQueryKey(query), queryFn: () => deployApi.listar(query), enabled });

export const useDeploy = (id?: string | null) =>
    useQuery({ queryKey: deployDetalheQueryKey(id), queryFn: () => deployApi.obter(id as string), enabled: Boolean(id) });

export const useDeployMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['deploys'] });
        queryClient.invalidateQueries({ queryKey: ['deploy'] });
        queryClient.invalidateQueries({ queryKey: ['deploy-ambiente'] });
    };
    const criarMutation = useMutation({ mutationFn: (values: unknown) => deployApi.criar(values), onSuccess: invalidate });
    const concluirMutation = useMutation({ mutationFn: (id: string) => deployApi.concluir(id), onSuccess: invalidate });
    const falharMutation = useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => deployApi.falhar(id, motivo), onSuccess: invalidate });
    const reverterMutation = useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => deployApi.reverter(id, motivo), onSuccess: invalidate });
    const itemMutation = useMutation({ mutationFn: (values: unknown) => deployApi.adicionarItemChecklist(values), onSuccess: invalidate });
    const resultadoMutation = useMutation({ mutationFn: ({ itemId, values }: { itemId: string; values: unknown }) => deployApi.registrarResultadoChecklist(itemId, values), onSuccess: invalidate });
    return { criarMutation, concluirMutation, falharMutation, reverterMutation, itemMutation, resultadoMutation };
};
