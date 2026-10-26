'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pessoasApi } from '@/features/pessoas/api/pessoasApi';
import { PessoaFormValues, PessoaListQuery } from '@/features/pessoas/types/pessoas.types';
import type { OrganizationalContextSnapshot } from '@/lib/http/organizationalContextPolicy';

type SavePayload = { id?: string; values: PessoaFormValues };
type InativarPayload = { id: string; motivo: string };

export const pessoasQueryKey = (query?: PessoaListQuery) => ['pessoas', query] as const;

export const usePessoas = (query: PessoaListQuery = {}, options?: { enabled?: boolean; snapshot?: OrganizationalContextSnapshot }) =>
    useQuery({
        queryKey: pessoasQueryKey(query),
        queryFn: () => pessoasApi.listar(query, options?.snapshot),
        enabled: (options?.enabled ?? true) && Boolean(query.empresaId)
    });

export const usePessoaMutations = (query: PessoaListQuery = {}, snapshot?: OrganizationalContextSnapshot) => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pessoas'] });

    const saveMutation = useMutation({
        mutationFn: ({ id, values }: SavePayload) => (id ? pessoasApi.atualizar(id, values) : pessoasApi.criar(values, snapshot)),
        onSuccess: invalidate
    });

    const inativarMutation = useMutation({
        mutationFn: ({ id, motivo }: InativarPayload) => pessoasApi.inativar(id, motivo),
        onSuccess: invalidate
    });

    return { saveMutation, inativarMutation, queryKey: pessoasQueryKey(query) };
};
