'use client';

import { useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { EstoqueFilterBar } from '@/features/estoque/components/EstoqueFilterBar';
import { filterLocalRecords, formatQuantity } from '@/features/estoque/components/estoqueUiUtils';
import { calcularResumoSaldos } from '@/features/estoque/components/estoqueUxUtils';
import { useLocaisEstoque, useSaldosEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { EstoqueListQuery, EstoqueSaldoResponse } from '@/features/estoque/types/estoque.types';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { mapApiError } from '@/lib/http/apiError';

export const SaldosEstoquePage = () => {
    const { hasPermission } = usePermissions();
    const [filters, setFilters] = useState<EstoqueListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const saldosQuery = useSaldosEstoque(filters);
    const produtosQuery = useProdutos({ empresaId: filters.empresaId, filialId: filters.filialId });
    const locaisQuery = useLocaisEstoque({ empresaId: filters.empresaId, filialId: filters.filialId });
    const records = useMemo(() => filterLocalRecords(saldosQuery.data ?? [], localSearch), [saldosQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);
    const produtoLabelMap = useMemo(() => new Map((produtosQuery.data ?? []).map((produto) => [produto.id, `${produto.codigo} • ${produto.descricao}`])), [produtosQuery.data]);
    const localLabelMap = useMemo(() => new Map((locaisQuery.data ?? []).map((local) => [local.id, `${local.codigo} • ${local.nome}`])), [locaisQuery.data]);
    const resumo = useMemo(() => calcularResumoSaldos(records), [records]);

    if (!hasPermission('ESTOQUE_CONSULTAR')) return <UnauthorizedState description="Saldos exigem ESTOQUE_CONSULTAR." />;
    const updateFilter = (name: keyof EstoqueListQuery, value: string | null) => { setFirst(0); setFilters((current) => ({ ...current, [name]: value || null })); };

    return (
        <>
            <PageHeader title="Saldos de estoque" description="Consulta de saldo atual, reservado e disponível por produto e local." actions={<EstoqueFilterBar filters={filters} produtos={produtosQuery.data ?? []} locais={locaisQuery.data ?? []} showProduto showLocal search={localSearch} onSearchChange={(value) => { setFirst(0); setLocalSearch(value); }} onFilterChange={updateFilter} />} />
            {saldosQuery.isLoading ? (
                <LoadingState variant="metrics" cards={4} className="mb-3" />
            ) : (
            <div className="grid mb-3">
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Produtos com saldo</span><strong className="text-2xl">{resumo.produtosComSaldo}</strong></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Saldo atual</span><strong className="text-2xl">{formatQuantity(resumo.quantidadeAtual)}</strong></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Reservado</span><strong className="text-2xl">{formatQuantity(resumo.quantidadeReservada)}</strong></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Disponível</span><strong className="text-2xl">{formatQuantity(resumo.quantidadeDisponivel)}</strong><small className="block text-color-secondary mt-2">{resumo.saldosIndisponiveis} saldo(s) sem disponibilidade</small></Card></div>
            </div>
            )}
            <Card>
                {saldosQuery.error ? <ApiErrorPanel error={mapApiError(saldosQuery.error)} /> : null}
                <DataTableServer<EstoqueSaldoResponse> value={visibleRecords} totalRecords={records.length} loading={saldosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }}>
                    <Column header="Produto" body={(row) => produtoLabelMap.get(row.produtoId) ?? 'Produto não carregado'} />
                    <Column header="Local" body={(row) => localLabelMap.get(row.localEstoqueId) ?? 'Local não carregado'} />
                    <Column header="Atual" body={(row: EstoqueSaldoResponse) => formatQuantity(row.quantidadeAtual)} />
                    <Column header="Reservado" body={(row: EstoqueSaldoResponse) => formatQuantity(row.quantidadeReservada)} />
                    <Column header="Disponível" body={(row: EstoqueSaldoResponse) => formatQuantity(row.quantidadeDisponivel)} />
                </DataTableServer>
                {!saldosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum saldo" description="Ajuste os filtros ou registre uma entrada de estoque." /> : null}
            </Card>
        </>
    );
};
