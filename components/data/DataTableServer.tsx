'use client';

import { DataTable, type DataTablePageEvent, type DataTableSortEvent, type DataTableValue } from 'primereact/datatable';
import { ReactNode } from 'react';

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

export function DataTableServer<T extends object>({ value, totalRecords, loading, first, rows, sortField, sortOrder, dataKey = 'id', emptyMessage = 'Nenhum registro encontrado.', onPage, onSort, children }: DataTableServerProps<T>) {
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
