'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePedidosVenda } from '@/features/vendas/hooks/useVendasResources';
import { cleanQueryParams } from '@/lib/http/requestUtils';
import { httpClient } from '@/lib/http/httpClient';
import { OrigemFinanceira, SelectOption } from '@/types/erp';

type OriginQuery = {
    empresaId?: string | null;
    filialId?: string | null;
};

type PedidoCompraReference = {
    id: string;
    numero?: string | null;
    fornecedorId?: string | null;
    valorTotal?: number | null;
};

const formatMoney = (value?: number | null) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

export const useFinanceiroOriginOptions = (origem: number, query: OriginQuery) => {
    const pedidosVendaQuery = usePedidosVenda(
        origem === OrigemFinanceira.PedidoVenda
            ? { empresaId: query.empresaId ?? null, filialId: query.filialId ?? null }
            : {}
    );

    const pedidosCompraQuery = useQuery({
        queryKey: ['financeiro', 'origens', 'compras', query],
        enabled: origem === OrigemFinanceira.Compra && Boolean(query.empresaId),
        queryFn: async () => {
            const response = await httpClient.get<PedidoCompraReference[]>('/api/compras/pedidos', {
                params: cleanQueryParams({ empresaId: query.empresaId, filialId: query.filialId })
            });
            return response.data;
        }
    });

    const options = useMemo<SelectOption<string>[]>(() => {
        if (origem === OrigemFinanceira.PedidoVenda) {
            return (pedidosVendaQuery.data ?? []).map((pedido) => ({
                value: pedido.id,
                label: `${pedido.numero ?? 'Pedido sem número'} • ${formatMoney(pedido.valorTotal)}`
            }));
        }

        if (origem === OrigemFinanceira.Compra) {
            return (pedidosCompraQuery.data ?? []).map((pedido) => ({
                value: pedido.id,
                label: `${pedido.numero ?? 'Pedido de compra sem número'} • ${formatMoney(pedido.valorTotal)}`
            }));
        }

        return [];
    }, [origem, pedidosCompraQuery.data, pedidosVendaQuery.data]);

    return {
        options,
        isLoading: origem === OrigemFinanceira.PedidoVenda ? pedidosVendaQuery.isLoading : pedidosCompraQuery.isLoading,
        isFetching: origem === OrigemFinanceira.PedidoVenda ? pedidosVendaQuery.isFetching : pedidosCompraQuery.isFetching,
        isSupported: origem === OrigemFinanceira.PedidoVenda || origem === OrigemFinanceira.Compra
    };
};
