'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { StatusTag } from '@/components/data/StatusTag';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { usePedidosCompra } from '@/features/compras/hooks/useComprasResources';
import { useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { PedidoCompraListQuery, PedidoCompraResponse } from '@/features/compras/types/compras.types';
import { formatDate, formatMoney, fornecedorOptions, statusPedidoCompraOptions, statusPedidoCompraTagValue } from '@/features/compras/components/comprasUiUtils';
import { StatusPedidoCompra } from '@/types/erp';
import { mapApiError } from '@/lib/http/apiError';

const filterLocal = (items: PedidoCompraResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((pedido) => [pedido.numero, pedido.observacao, pedido.fornecedorId].some((value) => String(value ?? '').toLowerCase().includes(normalized)));
};

export const PedidosCompraPage = () => {
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const [filters, setFilters] = useState<PedidoCompraListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const pedidosQuery = usePedidosCompra(filters);
    const fornecedoresQuery = useFornecedores({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null });
    const pessoasQuery = usePessoas({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null });
    const pessoaLabelMap = useMemo(() => new Map((pessoasQuery.data ?? []).map((pessoa) => [pessoa.id, pessoa.nomeFantasia ? `${pessoa.nomeRazaoSocial} • ${pessoa.nomeFantasia}` : pessoa.nomeRazaoSocial])), [pessoasQuery.data]);
    const fornecedorLabelMap = useMemo(() => new Map((fornecedoresQuery.data ?? []).map((fornecedor) => [fornecedor.id, `${fornecedor.codigo} • ${pessoaLabelMap.get(fornecedor.pessoaId) ?? 'Pessoa não carregada'}`])), [fornecedoresQuery.data, pessoaLabelMap]);
    const records = useMemo(() => filterLocal(pedidosQuery.data ?? [], localSearch), [pedidosQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);
    const summary = useMemo(() => {
        const total = records.reduce<number>((acc, pedido) => acc + Number(pedido.valorTotal ?? 0), 0);
        return {
            totalPedidos: records.length,
            aguardandoAprovacao: records.filter((pedido) => Number(pedido.statusPedido) === StatusPedidoCompra.AguardandoAprovacao).length,
            aprovados: records.filter((pedido) => Number(pedido.statusPedido) === StatusPedidoCompra.Aprovado).length,
            recebiveis: records.filter((pedido) => [StatusPedidoCompra.Aprovado, StatusPedidoCompra.ParcialmenteRecebido].includes(Number(pedido.statusPedido))).length,
            valorTotal: total
        };
    }, [records]);

    if (!hasPermission('COMPRAS_CONSULTAR')) return <UnauthorizedState description="Pedidos de compra exigem COMPRAS_CONSULTAR." />;

    const updateFilter = (name: keyof PedidoCompraListQuery, value: string | number | null) => { setFirst(0); setFilters((current) => ({ ...current, [name]: value || null })); };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <EntitySelect entityName="fornecedor" value={filters.fornecedorId ?? null} options={fornecedorOptions(fornecedoresQuery.data ?? [], pessoaLabelMap)} disabled={fornecedoresQuery.isLoading || !filters.empresaId} onChange={(value) => updateFilter('fornecedorId', value)} />
            <Dropdown className="min-w-14rem" value={filters.status ?? null} options={statusPedidoCompraOptions} optionLabel="label" optionValue="value" showClear placeholder="Status" onChange={(event) => updateFilter('status', event.value ?? null)} />
            <span className="p-input-icon-left"><i className="pi pi-search" /><InputText placeholder="Buscar pedido" value={localSearch} onChange={(event) => { setFirst(0); setLocalSearch(event.target.value); }} /></span>
            <PermissionGuard permission="COMPRAS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo pedido" icon="pi pi-plus" disabled={disabled} onClick={() => router.push('/compras/pedidos/novo')} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Pedidos de compra" description="Fluxo de rascunho, aprovação, cancelamento e recebimento com impacto em estoque e financeiro." actions={headerActions} />
            <Message className="w-full mb-3" severity="info" text="Pedidos recebidos ou cancelados não devem ser alterados diretamente. Recebimento pode gerar entrada de estoque e conta a pagar conforme payload." />
            <div className="grid mb-3">
                <div className="col-12 md:col-3"><Card className="h-full"><span className="block text-color-secondary mb-2">Pedidos listados</span><strong className="text-2xl">{summary.totalPedidos}</strong></Card></div>
                <div className="col-12 md:col-3"><Card className="h-full"><span className="block text-color-secondary mb-2">Aguardando aprovação</span><strong className="text-2xl">{summary.aguardandoAprovacao}</strong></Card></div>
                <div className="col-12 md:col-3"><Card className="h-full"><span className="block text-color-secondary mb-2">Liberados para receber</span><strong className="text-2xl">{summary.recebiveis}</strong></Card></div>
                <div className="col-12 md:col-3"><Card className="h-full"><span className="block text-color-secondary mb-2">Valor total</span><strong className="text-2xl">{formatMoney(summary.valorTotal)}</strong></Card></div>
            </div>
            <Card>
                {pedidosQuery.isLoading ? <LoadingState /> : null}
                {pedidosQuery.error ? <ApiErrorPanel error={mapApiError(pedidosQuery.error)} /> : null}
                <DataTableServer<PedidoCompraResponse> value={visibleRecords} totalRecords={records.length} loading={pedidosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum pedido encontrado.">
                    <Column field="numero" header="Número" />
                    <Column header="Fornecedor" body={(row: PedidoCompraResponse) => fornecedorLabelMap.get(row.fornecedorId) ?? 'Fornecedor não carregado'} />
                    <Column header="Emissão" body={(row: PedidoCompraResponse) => formatDate(row.dataEmissao)} />
                    <Column header="Previsão" body={(row: PedidoCompraResponse) => formatDate(row.dataPrevisaoEntrega)} />
                    <Column header="Status" body={(row: PedidoCompraResponse) => <StatusTag status={statusPedidoCompraTagValue(row.statusPedido)} />} />
                    <Column header="Total" body={(row: PedidoCompraResponse) => formatMoney(row.valorTotal)} />
                    <Column header="Ações" alignHeader="right" body={(row: PedidoCompraResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-folder-open', permission: 'COMPRAS_CONSULTAR', onClick: () => router.push(`/compras/pedidos/${row.id}`) }]} />} />
                </DataTableServer>
                {!pedidosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum pedido" description="Crie um pedido ou ajuste os filtros." /> : null}
            </Card>
        </>
    );
};
