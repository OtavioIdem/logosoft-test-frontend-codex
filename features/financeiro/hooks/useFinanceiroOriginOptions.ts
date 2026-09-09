'use client';

import { useMemo } from 'react';
import { usePedidosVenda } from '@/features/vendas/hooks/useVendasResources';
import { OrigemFinanceira, SelectOption } from '@/types/erp';

type OriginQuery = {
    empresaId?: string | null;
    filialId?: string | null;
};

const formatMoney = (value?: number | null) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

export const useFinanceiroOriginOptions = (origem: number, query: OriginQuery) => {
    const pedidosVendaQuery = usePedidosVenda(
        origem === OrigemFinanceira.PedidoVenda
            ? { empresaId: query.empresaId ?? null, filialId: query.filialId ?? null }
            : {}
    );

    const options = useMemo<SelectOption<string>[]>(() => {
        if (origem === OrigemFinanceira.PedidoVenda) {
            return (pedidosVendaQuery.data ?? []).map((pedido) => ({
                value: pedido.id,
                label: `${pedido.numero ?? 'Pedido sem número'} • ${formatMoney(pedido.valorTotal)}`
            }));
        }

        return [];
    }, [origem, pedidosVendaQuery.data]);

    return {
        options,
        isLoading: pedidosVendaQuery.isLoading,
        isFetching: pedidosVendaQuery.isFetching,
        isSupported: origem === OrigemFinanceira.PedidoVenda
    };
};
