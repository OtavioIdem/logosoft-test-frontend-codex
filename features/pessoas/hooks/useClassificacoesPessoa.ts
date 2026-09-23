'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { classificacoesPessoaApi } from '@/features/pessoas/api/pessoasApi';
import { ClassificacaoPessoaFormValues } from '@/features/pessoas/types/pessoas.types';

type SavePayload = { id?: string; values: ClassificacaoPessoaFormValues };
type InativarPayload = { id: string; empresaId: string; motivo: string };

export const classificacoesPessoaQueryKey = (empresaId?: string | null) => ['pessoas', 'classificacoes', empresaId ?? null] as const;

// O `GET` exige `empresaId` (inventário §1) — sem empresa a query nem dispara. `enabled` (padrão
// `true`) permite condicionar a busca à permissão PESSOAS_CONSULTAR quando o catálogo é usado como
// seletor guardado por campo (D66/D70), sem duplicar o client de API.
export const useClassificacoesPessoa = (empresaId?: string | null, enabled = true) =>
    useQuery({
        queryKey: classificacoesPessoaQueryKey(empresaId),
        queryFn: () => classificacoesPessoaApi.listar({ empresaId }),
        enabled: Boolean(empresaId) && enabled
    });

export const useClassificacaoPessoaMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pessoas', 'classificacoes'] });

    const saveMutation = useMutation({
        mutationFn: ({ id, values }: SavePayload) => (id ? classificacoesPessoaApi.atualizar(id, values) : classificacoesPessoaApi.criar(values)),
        onSuccess: invalidate
    });

    const inativarMutation = useMutation({
        mutationFn: ({ id, empresaId, motivo }: InativarPayload) => classificacoesPessoaApi.inativar(id, empresaId, motivo),
        onSuccess: invalidate
    });

    return { saveMutation, inativarMutation };
};
