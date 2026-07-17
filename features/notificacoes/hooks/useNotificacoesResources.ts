'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificacoesApi } from '@/features/notificacoes/api/notificacoesApi';
import { ContagemQuery, NotificacoesListQuery } from '@/features/notificacoes/types/notificacoes.types';

export const contagemNaoLidasQueryKey = (query?: ContagemQuery) => ['notificacoes-contagem', query ?? {}] as const;
export const notificacoesQueryKey = (query?: NotificacoesListQuery) => ['notificacoes', query ?? {}] as const;

// Polling leve da contagem de não-lidas (sino do cabeçalho).
export const useContagemNaoLidas = (query: ContagemQuery = {}, enabled = true) =>
    useQuery({
        queryKey: contagemNaoLidasQueryKey(query),
        queryFn: () => notificacoesApi.contarNaoLidas(query),
        enabled,
        refetchInterval: 60_000,
        refetchOnWindowFocus: true
    });

export const useNotificacoes = (query: NotificacoesListQuery = {}, enabled = true) =>
    useQuery({
        queryKey: notificacoesQueryKey(query),
        queryFn: () => notificacoesApi.listar(query),
        enabled
    });

export const useNotificacoesMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
        queryClient.invalidateQueries({ queryKey: ['notificacoes-contagem'] });
    };

    const marcarLidaMutation = useMutation({ mutationFn: (id: string) => notificacoesApi.marcarLida(id), onSuccess: invalidate });
    const marcarTodasMutation = useMutation({ mutationFn: (query: ContagemQuery) => notificacoesApi.marcarTodasLidas(query), onSuccess: invalidate });
    const arquivarMutation = useMutation({ mutationFn: (id: string) => notificacoesApi.arquivar(id), onSuccess: invalidate });

    return { marcarLidaMutation, marcarTodasMutation, arquivarMutation };
};
