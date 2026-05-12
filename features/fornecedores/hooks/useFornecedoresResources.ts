'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fornecedoresApi } from '@/features/fornecedores/api/fornecedoresApi';
import { FornecedorFormValues, FornecedorListQuery } from '@/features/fornecedores/types/fornecedores.types';

type SavePayload = { id?: string; values: FornecedorFormValues };
type InativarPayload = { id: string; motivo: string };

export const fornecedoresQueryKey = (query?: FornecedorListQuery) => ['fornecedores', query] as const;

export const useFornecedores = (query: FornecedorListQuery = {}) =>
    useQuery({
        queryKey: fornecedoresQueryKey(query),
        queryFn: () => fornecedoresApi.listar(query)
    });

export const useFornecedorMutations = (query: FornecedorListQuery = {}) => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fornecedores'] });

    const saveMutation = useMutation({
        mutationFn: ({ id, values }: SavePayload) => (id ? fornecedoresApi.atualizar(id, values) : fornecedoresApi.criar(values)),
        onSuccess: invalidate
    });

    const inativarMutation = useMutation({
        mutationFn: ({ id, motivo }: InativarPayload) => fornecedoresApi.inativar(id, motivo),
        onSuccess: invalidate
    });

    return { saveMutation, inativarMutation, queryKey: fornecedoresQueryKey(query) };
};
