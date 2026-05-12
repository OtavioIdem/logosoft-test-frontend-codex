'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '@/features/clientes/api/clientesApi';
import { ClienteFormValues, ClienteListQuery } from '@/features/clientes/types/clientes.types';

type SavePayload = { id?: string; values: ClienteFormValues };
type ReasonPayload = { id: string; motivo: string };

export const clientesQueryKey = (query?: ClienteListQuery) => ['clientes', query] as const;

export const useClientes = (query: ClienteListQuery = {}) =>
    useQuery({
        queryKey: clientesQueryKey(query),
        queryFn: () => clientesApi.listar(query)
    });

export const useClienteMutations = (query: ClienteListQuery = {}) => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['clientes'] });

    const saveMutation = useMutation({
        mutationFn: ({ id, values }: SavePayload) => (id ? clientesApi.atualizar(id, values) : clientesApi.criar(values)),
        onSuccess: invalidate
    });

    const bloquearMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => clientesApi.bloquearCredito(id, motivo), onSuccess: invalidate });
    const desbloquearMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => clientesApi.desbloquearCredito(id, motivo), onSuccess: invalidate });
    const inativarMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => clientesApi.inativar(id, motivo), onSuccess: invalidate });

    return { saveMutation, bloquearMutation, desbloquearMutation, inativarMutation, queryKey: clientesQueryKey(query) };
};
