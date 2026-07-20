'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { alimentarApi } from '@/features/alimentar/api/alimentarApi';
import { LotesListQuery, RecallsListQuery } from '@/features/alimentar/types/alimentar.types';

export const lotesQueryKey = (query?: LotesListQuery, aVencerDias?: number | null) => ['alimentar-lotes', query ?? {}, aVencerDias ?? null] as const;
export const movimentacoesQueryKey = (loteId?: string | null) => ['alimentar-movimentacoes', loteId ?? null] as const;
export const recallsQueryKey = (query?: RecallsListQuery) => ['alimentar-recalls', query ?? {}] as const;
export const recallLotesQueryKey = (id?: string | null) => ['alimentar-recall-lotes', id ?? null] as const;

type IdMotivo = { id: string; motivo: string };

// ---- Lotes ----
export const useLotes = (query: LotesListQuery = {}, aVencerDias: number | null = null, enabled = true) =>
    useQuery({
        queryKey: lotesQueryKey(query, aVencerDias),
        queryFn: () => (aVencerDias != null ? alimentarApi.listarLotesAVencer(aVencerDias, query) : alimentarApi.listarLotes(query)),
        enabled
    });

export const useMovimentacoesLote = (loteId?: string | null) =>
    useQuery({ queryKey: movimentacoesQueryKey(loteId), queryFn: () => alimentarApi.listarMovimentacoes(loteId as string), enabled: Boolean(loteId) });

export const useLoteMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['alimentar-lotes'] });
        queryClient.invalidateQueries({ queryKey: ['alimentar-movimentacoes'] });
    };
    const criarMutation = useMutation({ mutationFn: (values: unknown) => alimentarApi.criarLote(values), onSuccess: invalidate });
    const bloquearMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => alimentarApi.bloquearLote(id, motivo), onSuccess: invalidate });
    const desbloquearMutation = useMutation({ mutationFn: (id: string) => alimentarApi.desbloquearLote(id), onSuccess: invalidate });
    const movimentarMutation = useMutation({ mutationFn: (values: unknown) => alimentarApi.registrarMovimentacao(values), onSuccess: invalidate });
    return { criarMutation, bloquearMutation, desbloquearMutation, movimentarMutation };
};

// ---- Recalls ----
export const useRecalls = (query: RecallsListQuery = {}, enabled = true) =>
    useQuery({ queryKey: recallsQueryKey(query), queryFn: () => alimentarApi.listarRecalls(query), enabled });

export const useLotesRecall = (id?: string | null) =>
    useQuery({ queryKey: recallLotesQueryKey(id), queryFn: () => alimentarApi.listarLotesRecall(id as string), enabled: Boolean(id) });

export const useRecallMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['alimentar-recalls'] });
        queryClient.invalidateQueries({ queryKey: ['alimentar-recall-lotes'] });
        queryClient.invalidateQueries({ queryKey: ['alimentar-lotes'] });
    };
    const abrirMutation = useMutation({ mutationFn: (values: unknown) => alimentarApi.abrirRecall(values), onSuccess: invalidate });
    const adicionarLoteMutation = useMutation({ mutationFn: ({ id, loteId }: { id: string; loteId: string }) => alimentarApi.adicionarLoteRecall(id, loteId), onSuccess: invalidate });
    const encerrarMutation = useMutation({ mutationFn: (id: string) => alimentarApi.encerrarRecall(id), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => alimentarApi.cancelarRecall(id, motivo), onSuccess: invalidate });
    return { abrirMutation, adicionarLoteMutation, encerrarMutation, cancelarMutation };
};
