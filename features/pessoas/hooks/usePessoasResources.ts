'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pessoasApi } from '@/features/pessoas/api/pessoasApi';
import { PessoaFormValues, PessoaListQuery } from '@/features/pessoas/types/pessoas.types';

type SavePayload = { id?: string; values: PessoaFormValues };
type InativarPayload = { id: string; motivo: string };

export const pessoasQueryKey = (query?: PessoaListQuery) => ['pessoas', query] as const;

export const usePessoas = (query: PessoaListQuery = {}) =>
    useQuery({
        queryKey: pessoasQueryKey(query),
        queryFn: () => pessoasApi.listar(query)
    });

export const usePessoaMutations = (query: PessoaListQuery = {}) => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pessoas'] });

    const saveMutation = useMutation({
        mutationFn: ({ id, values }: SavePayload) => (id ? pessoasApi.atualizar(id, values) : pessoasApi.criar(values)),
        onSuccess: invalidate
    });

    const inativarMutation = useMutation({
        mutationFn: ({ id, motivo }: InativarPayload) => pessoasApi.inativar(id, motivo),
        onSuccess: invalidate
    });

    return { saveMutation, inativarMutation, queryKey: pessoasQueryKey(query) };
};
