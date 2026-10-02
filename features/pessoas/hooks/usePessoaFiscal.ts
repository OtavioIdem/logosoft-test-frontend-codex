'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pessoaFiscalApi } from '@/features/pessoas/api/pessoaFiscalApi';

/**
 * b75 (D104, PF-4): o PATCH de dados fiscais devolve o `PessoaResponse`, mas o `record` do diálogo é uma foto da linha
 * da lista. A lista de Pessoas (`['pessoas', query]`) é sempre RELIDA, e nunca remendada com a resposta: a aba recarrega
 * do registro novo. `onSettled` também relê no erro (o registro pode ter mudado, ou saído do escopo, por outro usuário), e
 * o retorno da invalidação é aguardado: o `mutateAsync` só resolve depois da lista nova.
 */
export const usePessoaFiscalMutations = (pessoaId?: string | null) => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pessoas'] });

    // `values`: os 8 campos do request, `null` explícito para "não informado" (PF-1). O client valida e recusa campo omitido.
    const salvarMutation = useMutation({
        mutationFn: (values: unknown) => pessoaFiscalApi.atualizar(pessoaId as string, values),
        onSettled: invalidate
    });

    return { salvarMutation };
};
