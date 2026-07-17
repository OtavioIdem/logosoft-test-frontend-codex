'use client';

import { LoadingState } from '@/components/feedback/LoadingState';
import { DataTable, type DataTablePageEvent, type DataTableSortEvent, type DataTableValue } from 'primereact/datatable';
import { Children, ReactNode } from 'react';

type DataTableServerProps<T extends object> = {
    value: T[];
    totalRecords: number;
    loading?: boolean;
    first: number;
    rows: number;
    sortField?: string;
    sortOrder?: 1 | -1 | 0 | null;
    dataKey?: string;
    emptyMessage?: string;
    onPage: (event: DataTablePageEvent) => void;
    onSort?: (event: DataTableSortEvent) => void;
    children: ReactNode;
};

/**
 * DataTable em modo `lazy` (PrimeReact): **o chamador é dono da paginação** — este componente só renderiza
 * a página atual (`value`) e o total (`totalRecords`), disparando `onPage`/`onSort` quando o usuário navega.
 *
 * Dois modos de uso suportados:
 * - **Server-side real** (preferido para listas grandes): `value = pagedResult.items`, `totalRecords = pagedResult.totalItems`,
 *   e `onPage` recoloca `page`/`pageSize` na query do react-query para refetch. Ex.: Atividades, Tabelas de preço.
 * - **Client-side** (cadastros pequenos / endpoints que ainda não paginam): o chamador fatia o array localmente
 *   (`array.slice(first, first + rows)`) e passa `totalRecords = array.length`. Limitado ao teto do backend (~500).
 *
 * Ver `docs/PLANO-MESTRE-FRONTEND.md` (Onda 0.5, item 3) para o mapa de quais endpoints paginam no backend.
 */
export function DataTableServer<T extends object>({ value, totalRecords, loading, first, rows, sortField, sortOrder, dataKey = 'id', emptyMessage = 'Nenhum registro encontrado.', onPage, onSort, children }: DataTableServerProps<T>) {
    if (loading && value.length === 0) {
        return <LoadingState variant="table" rows={rows} columns={Children.count(children)} />;
    }

    return (
        <DataTable
            value={value as DataTableValue[]}
            dataKey={dataKey}
            lazy
            paginator
            first={first}
            rows={rows}
            totalRecords={totalRecords}
            loading={loading}
            sortField={sortField}
            sortOrder={sortOrder}
            onPage={onPage}
            onSort={onSort}
            emptyMessage={emptyMessage}
            responsiveLayout="scroll"
            stripedRows
        >
            {children}
        </DataTable>
    );
}
