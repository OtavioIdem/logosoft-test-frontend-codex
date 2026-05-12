'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vendasApi } from '@/features/vendas/api/vendasApi';
import { ItemPedidoVendaFormValues, PedidoVendaListQuery, SalvarPedidoVendaValues } from '@/features/vendas/types/vendas.types';

type PedidoSavePayload = { id?: string; values: SalvarPedidoVendaValues };
type ItemSavePayload = { pedidoId: string; itemId?: string; values: ItemPedidoVendaFormValues };
type ReasonPayload = { id: string; motivo: string };
type ItemReasonPayload = { pedidoId: string; itemId: string; motivo: string };
type ApprovePayload = { id: string; values: unknown };
type FaturarPayload = { id: string; values: unknown };

export const pedidosVendaQueryKey = (query?: PedidoVendaListQuery) => ['vendas', 'pedidos', query] as const;
export const pedidoVendaQueryKey = (id?: string | null) => ['vendas', 'pedido', id] as const;

export const usePedidosVenda = (query: PedidoVendaListQuery = {}) =>
    useQuery({
        queryKey: pedidosVendaQueryKey(query),
        queryFn: () => vendasApi.listar(query)
    });

export const usePedidoVenda = (id?: string | null) =>
    useQuery({
        queryKey: pedidoVendaQueryKey(id),
        queryFn: () => vendasApi.buscar(id ?? ''),
        enabled: Boolean(id)
    });

export const usePedidoVendaMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = (id?: string) => {
        queryClient.invalidateQueries({ queryKey: ['vendas', 'pedidos'] });
        if (id) queryClient.invalidateQueries({ queryKey: pedidoVendaQueryKey(id) });
    };

    const saveMutation = useMutation({
        mutationFn: ({ id, values }: PedidoSavePayload) => (id ? vendasApi.atualizar(id, values) : vendasApi.criar(values)),
        onSuccess: (pedido) => invalidate(pedido.id)
    });

    const itemMutation = useMutation({
        mutationFn: ({ pedidoId, itemId, values }: ItemSavePayload) => (itemId ? vendasApi.atualizarItem(pedidoId, itemId, values) : vendasApi.adicionarItem(pedidoId, values)),
        onSuccess: (pedido) => invalidate(pedido.id)
    });

    const removerItemMutation = useMutation({ mutationFn: ({ pedidoId, itemId, motivo }: ItemReasonPayload) => vendasApi.removerItem(pedidoId, itemId, motivo), onSuccess: (pedido) => invalidate(pedido.id) });
    const enviarMutation = useMutation({ mutationFn: (id: string) => vendasApi.enviarParaAprovacao(id), onSuccess: (pedido) => invalidate(pedido.id) });
    const aprovarMutation = useMutation({ mutationFn: ({ id, values }: ApprovePayload) => vendasApi.aprovar(id, values), onSuccess: (pedido) => invalidate(pedido.id) });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => vendasApi.cancelar(id, motivo), onSuccess: (pedido) => invalidate(pedido.id) });
    const faturarMutation = useMutation({ mutationFn: ({ id, values }: FaturarPayload) => vendasApi.faturar(id, values), onSuccess: (pedido) => invalidate(pedido.id) });

    return { saveMutation, itemMutation, removerItemMutation, enviarMutation, aprovarMutation, cancelarMutation, faturarMutation };
};
