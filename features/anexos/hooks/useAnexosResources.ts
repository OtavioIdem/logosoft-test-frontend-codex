'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { anexosApi } from '@/features/anexos/api/anexosApi';
import { AnexosListQuery, UploadAnexoInput } from '@/features/anexos/types/anexos.types';

export const anexosQueryKey = (query?: AnexosListQuery) => ['anexos', query ?? {}] as const;

export const useAnexos = (query: AnexosListQuery = {}, enabled = true) =>
    useQuery({
        queryKey: anexosQueryKey(query),
        queryFn: () => anexosApi.listar(query),
        enabled
    });

export const useAnexosMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['anexos'] });

    const uploadMutation = useMutation({ mutationFn: (input: UploadAnexoInput) => anexosApi.upload(input), onSuccess: invalidate });
    const inativarMutation = useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => anexosApi.inativar(id, motivo), onSuccess: invalidate });
    const baixarMutation = useMutation({ mutationFn: ({ id, nomeArquivo }: { id: string; nomeArquivo: string }) => anexosApi.baixar(id, nomeArquivo) });

    return { uploadMutation, inativarMutation, baixarMutation };
};
