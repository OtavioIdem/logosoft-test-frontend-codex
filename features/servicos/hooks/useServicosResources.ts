'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { servicosApi } from '@/features/servicos/api/servicosApi';
import { OrdensServicoListQuery } from '@/features/servicos/types/servicos.types';

export const ordensServicoQueryKey = (query?: OrdensServicoListQuery) => ['servicos-ordens', query ?? {}] as const;
export const ordemServicoDetalheQueryKey = (id?: string | null) => ['servicos-ordem', id ?? null] as const;

export const useOrdensServico = (query: OrdensServicoListQuery = {}, enabled = true) =>
    useQuery({
        queryKey: ordensServicoQueryKey(query),
        queryFn: () => servicosApi.listar(query),
        enabled
    });

export const useOrdemServico = (id?: string | null) =>
    useQuery({
        queryKey: ordemServicoDetalheQueryKey(id),
        queryFn: () => servicosApi.obter(id as string),
        enabled: Boolean(id)
    });

type IdValues = { id: string; values: unknown };

export const useOrdensServicoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['servicos-ordens'] });
        queryClient.invalidateQueries({ queryKey: ['servicos-ordem'] });
    };

    const criarMutation = useMutation({ mutationFn: (values: unknown) => servicosApi.criar(values), onSuccess: invalidate });
    const triarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => servicosApi.triar(id, values), onSuccess: invalidate });
    const planejarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => servicosApi.planejar(id, values), onSuccess: invalidate });
    const iniciarMutation = useMutation({ mutationFn: (id: string) => servicosApi.iniciarExecucao(id), onSuccess: invalidate });
    const itemMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => servicosApi.adicionarItem(id, values), onSuccess: invalidate });
    const encerrarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => servicosApi.encerrar(id, values), onSuccess: invalidate });
    const faturarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => servicosApi.faturar(id, values), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => servicosApi.cancelar(id, motivo), onSuccess: invalidate });

    return { criarMutation, triarMutation, planejarMutation, iniciarMutation, itemMutation, encerrarMutation, faturarMutation, cancelarMutation };
};
