'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { atividadesApi } from '@/features/atividades/api/atividadesApi';
import { AtividadesListQuery } from '@/features/atividades/types/atividades.types';

type SavePayload = { id?: string; values: unknown };
type ActionPayload = { id: string; values: unknown };
type ReasonPayload = { id: string; motivo: string };

export const atividadesQueryKeys = {
    list: (query?: AtividadesListQuery) => ['atividades', 'list', query ?? {}] as const,
    detalhe: (id?: string | null) => ['atividades', 'detalhe', id ?? null] as const
};

export const useAtividades = (query: AtividadesListQuery = {}) =>
    useQuery({
        queryKey: atividadesQueryKeys.list(query),
        queryFn: () => atividadesApi.listar(query)
    });

export const useAtividadeDetalhe = (id?: string | null) =>
    useQuery({
        queryKey: atividadesQueryKeys.detalhe(id),
        queryFn: () => atividadesApi.obter(id as string),
        enabled: Boolean(id)
    });

export const useAtividadesMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['atividades'] });
    };

    const saveMutation = useMutation({ mutationFn: ({ id, values }: SavePayload) => (id ? atividadesApi.atualizar(id, values) : atividadesApi.criar(values)), onSuccess: invalidate });
    const atribuirMutation = useMutation({ mutationFn: ({ id, values }: ActionPayload) => atividadesApi.atribuir(id, values), onSuccess: invalidate });
    const statusMutation = useMutation({ mutationFn: ({ id, values }: ActionPayload) => atividadesApi.alterarStatus(id, values), onSuccess: invalidate });
    const comentarioMutation = useMutation({ mutationFn: ({ id, values }: ActionPayload) => atividadesApi.comentar(id, values), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => atividadesApi.cancelar(id, motivo), onSuccess: invalidate });

    return { saveMutation, atribuirMutation, statusMutation, comentarioMutation, cancelarMutation };
};
