'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { comprasApi } from '@/features/compras/api/comprasApi';
import { ItemPedidoCompraFormValues, PedidoCompraListQuery, ReceberPedidoCompraRequest, SalvarPedidoCompraValues } from '@/features/compras/types/compras.types';

type PedidoSavePayload = { id?: string; values: SalvarPedidoCompraValues };
type ItemSavePayload = { pedidoId: string; itemId?: string; values: ItemPedidoCompraFormValues };
type ReasonPayload = { id: string; motivo: string };
type ItemReasonPayload = { pedidoId: string; itemId: string; motivo: string };
type ApprovePayload = { id: string; values: unknown };
type ReceberPayload = { id: string; values: ReceberPedidoCompraRequest };

export const pedidosCompraQueryKey = (query?: PedidoCompraListQuery) => ['compras', 'pedidos', query] as const;
export const pedidoCompraQueryKey = (id?: string | null) => ['compras', 'pedido', id] as const;

export const usePedidosCompra = (query: PedidoCompraListQuery = {}) =>
    useQuery({
        queryKey: pedidosCompraQueryKey(query),
        queryFn: () => comprasApi.listar(query)
    });

export const usePedidoCompra = (id?: string | null) =>
    useQuery({
        queryKey: pedidoCompraQueryKey(id),
        queryFn: () => comprasApi.buscar(id ?? ''),
        enabled: Boolean(id)
    });

export const usePedidoCompraMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = (id?: string) => {
        queryClient.invalidateQueries({ queryKey: ['compras', 'pedidos'] });
        queryClient.invalidateQueries({ queryKey: ['estoque'] });
        queryClient.invalidateQueries({ queryKey: ['financeiro', 'contas-pagar'] });
        if (id) queryClient.invalidateQueries({ queryKey: pedidoCompraQueryKey(id) });
    };

    const saveMutation = useMutation({
        mutationFn: ({ id, values }: PedidoSavePayload) => (id ? comprasApi.atualizar(id, values) : comprasApi.criar(values)),
        onSuccess: (pedido) => invalidate(pedido.id)
    });

    const itemMutation = useMutation({
        mutationFn: ({ pedidoId, itemId, values }: ItemSavePayload) => (itemId ? comprasApi.atualizarItem(pedidoId, itemId, values) : comprasApi.adicionarItem(pedidoId, values)),
        onSuccess: (pedido) => invalidate(pedido.id)
    });

    const removerItemMutation = useMutation({ mutationFn: ({ pedidoId, itemId, motivo }: ItemReasonPayload) => comprasApi.removerItem(pedidoId, itemId, motivo), onSuccess: (pedido) => invalidate(pedido.id) });
    const enviarMutation = useMutation({ mutationFn: (id: string) => comprasApi.enviarParaAprovacao(id), onSuccess: (pedido) => invalidate(pedido.id) });
    const aprovarMutation = useMutation({ mutationFn: ({ id, values }: ApprovePayload) => comprasApi.aprovar(id, values), onSuccess: (pedido) => invalidate(pedido.id) });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => comprasApi.cancelar(id, motivo), onSuccess: (pedido) => invalidate(pedido.id) });
    const receberMutation = useMutation({ mutationFn: ({ id, values }: ReceberPayload) => comprasApi.receber(id, values), onSuccess: (pedido) => invalidate(pedido.id) });

    return { saveMutation, itemMutation, removerItemMutation, enviarMutation, aprovarMutation, cancelarMutation, receberMutation };
};
