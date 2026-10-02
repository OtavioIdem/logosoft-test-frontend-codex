'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pessoaEnderecosApi } from '@/features/pessoas/api/pessoaEnderecosApi';
import { EnderecoPessoaFormValues } from '@/features/pessoas/types/pessoaEnderecos.types';

type SalvarEnderecoPayload = { enderecoId?: string | null; values: EnderecoPessoaFormValues };

// Uma chave por pessoa, sob o prefixo `['pessoas', ...]` (como as classificações). A invalidação das mutações de
// Pessoa (`['pessoas']`) também a alcança, o que é inofensivo: só relê a lista de endereços.
export const pessoaEnderecosQueryKey = (pessoaId?: string | null) => ['pessoas', 'enderecos', pessoaId ?? null] as const;

export const usePessoaEnderecos = (pessoaId?: string | null, options?: { enabled?: boolean }) =>
    useQuery({
        queryKey: pessoaEnderecosQueryKey(pessoaId),
        queryFn: () => pessoaEnderecosApi.listar(pessoaId as string),
        enabled: Boolean(pessoaId) && (options?.enabled ?? true)
    });

/**
 * D102 (EP-5/EP-6): a resposta de toda mutação traz só o endereço tocado, e o principal muda em outro registro.
 * Por isso a lista é sempre relida, e nunca remendada com a resposta. `onSettled` também relê no erro: endereço
 * inexistente ou já excluído sai 400 (EP-8) e a lista na tela está velha. O retorno da invalidação é aguardado,
 * então o `mutateAsync` só resolve depois da lista nova.
 */
export const usePessoaEnderecoMutations = (pessoaId?: string | null) => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: pessoaEnderecosQueryKey(pessoaId) });

    const salvarMutation = useMutation({
        mutationFn: ({ enderecoId, values }: SalvarEnderecoPayload) => (enderecoId ? pessoaEnderecosApi.atualizar(pessoaId as string, enderecoId, values) : pessoaEnderecosApi.criar(pessoaId as string, values)),
        onSettled: invalidate
    });

    const principalMutation = useMutation({
        mutationFn: (enderecoId: string) => pessoaEnderecosApi.definirPrincipal(pessoaId as string, enderecoId),
        onSettled: invalidate
    });

    const excluirMutation = useMutation({
        mutationFn: (enderecoId: string) => pessoaEnderecosApi.excluir(pessoaId as string, enderecoId),
        onSettled: invalidate
    });

    return { salvarMutation, principalMutation, excluirMutation, queryKey: pessoaEnderecosQueryKey(pessoaId) };
};
