'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cotacoesCompraApi, recebimentosCompraApi, solicitacoesCompraApi } from '@/features/compras-avancado/api/comprasAvancadoApi';
import { CotacoesListQuery, DivergenciasListQuery, SolicitacoesListQuery } from '@/features/compras-avancado/types/comprasAvancado.types';

type IdValues = { id: string; values: unknown };
type IdMotivo = { id: string; motivo?: string | null };

// ---- Solicitações ----
export const solicitacoesQueryKey = (query?: SolicitacoesListQuery) => ['compras-solicitacoes', query ?? {}] as const;
export const solicitacaoDetalheQueryKey = (id?: string | null) => ['compras-solicitacao', id ?? null] as const;

export const useSolicitacoesCompra = (query: SolicitacoesListQuery = {}, enabled = true) =>
    useQuery({ queryKey: solicitacoesQueryKey(query), queryFn: () => solicitacoesCompraApi.listar(query), enabled });
export const useSolicitacaoCompra = (id?: string | null) =>
    useQuery({ queryKey: solicitacaoDetalheQueryKey(id), queryFn: () => solicitacoesCompraApi.obter(id as string), enabled: Boolean(id) });

export const useSolicitacoesCompraMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['compras-solicitacoes'] });
        queryClient.invalidateQueries({ queryKey: ['compras-solicitacao'] });
    };
    const criarMutation = useMutation({ mutationFn: (values: unknown) => solicitacoesCompraApi.criar(values), onSuccess: invalidate });
    const itemMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => solicitacoesCompraApi.adicionarItem(id, values), onSuccess: invalidate });
    const aprovarMutation = useMutation({ mutationFn: (id: string) => solicitacoesCompraApi.aprovar(id), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => solicitacoesCompraApi.cancelar(id, motivo), onSuccess: invalidate });
    return { criarMutation, itemMutation, aprovarMutation, cancelarMutation };
};

// ---- Cotações ----
export const cotacoesQueryKey = (query?: CotacoesListQuery) => ['compras-cotacoes', query ?? {}] as const;
export const cotacaoDetalheQueryKey = (id?: string | null) => ['compras-cotacao', id ?? null] as const;

export const useCotacoesCompra = (query: CotacoesListQuery = {}, enabled = true) =>
    useQuery({ queryKey: cotacoesQueryKey(query), queryFn: () => cotacoesCompraApi.listar(query), enabled });
export const useCotacaoCompra = (id?: string | null) =>
    useQuery({ queryKey: cotacaoDetalheQueryKey(id), queryFn: () => cotacoesCompraApi.obter(id as string), enabled: Boolean(id) });

export const useCotacoesCompraMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['compras-cotacoes'] });
        queryClient.invalidateQueries({ queryKey: ['compras-cotacao'] });
    };
    const criarMutation = useMutation({ mutationFn: (values: unknown) => cotacoesCompraApi.criar(values), onSuccess: invalidate });
    const itemMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => cotacoesCompraApi.adicionarItem(id, values), onSuccess: invalidate });
    const aprovarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => cotacoesCompraApi.aprovar(id, values), onSuccess: invalidate });
    const recusarMutation = useMutation({ mutationFn: (id: string) => cotacoesCompraApi.recusar(id), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => cotacoesCompraApi.cancelar(id, motivo), onSuccess: invalidate });
    return { criarMutation, itemMutation, aprovarMutation, recusarMutation, cancelarMutation };
};

// ---- Recebimentos ----
export const divergenciasQueryKey = (query?: DivergenciasListQuery) => ['compras-divergencias', query ?? {}] as const;
export const recebimentoDetalheQueryKey = (id?: string | null) => ['compras-recebimento', id ?? null] as const;

export const useDivergenciasRecebimento = (query: DivergenciasListQuery = {}, enabled = true) =>
    useQuery({ queryKey: divergenciasQueryKey(query), queryFn: () => recebimentosCompraApi.listarDivergencias(query), enabled });
export const useRecebimentoCompra = (id?: string | null) =>
    useQuery({ queryKey: recebimentoDetalheQueryKey(id), queryFn: () => recebimentosCompraApi.obter(id as string), enabled: Boolean(id) });

export const useRecebimentosCompraMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['compras-divergencias'] });
        queryClient.invalidateQueries({ queryKey: ['compras-recebimento'] });
    };
    const conferenciaMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => recebimentosCompraApi.registrarConferenciaFiscal(id, values), onSuccess: invalidate });
    return { conferenciaMutation };
};
