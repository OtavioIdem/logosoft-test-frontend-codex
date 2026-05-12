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
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { usePedidosVenda } from '@/features/vendas/hooks/useVendasResources';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { PedidoVendaListQuery, PedidoVendaResponse } from '@/features/vendas/types/vendas.types';
import { formatDate, formatMoney, statusPedidoVendaOptions, statusPedidoVendaTagValue, tipoPedidoVendaLabel } from '@/features/vendas/components/vendasUiUtils';
import { StatusPedidoVenda } from '@/types/erp';
import { mapApiError } from '@/lib/http/apiError';

const filterLocal = (items: PedidoVendaResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((pedido) => [pedido.numero, pedido.observacao, pedido.clienteId].some((value) => String(value ?? '').toLowerCase().includes(normalized)));
};

export const PedidosVendaPage = () => {
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const [filters, setFilters] = useState<PedidoVendaListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const pedidosQuery = usePedidosVenda(filters);
    const clientesQuery = useClientes({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null });
    const pessoasQuery = usePessoas({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null });
    const pessoaLabelMap = useMemo(() => new Map((pessoasQuery.data ?? []).map((pessoa) => [pessoa.id, pessoa.nomeFantasia ? `${pessoa.nomeRazaoSocial} • ${pessoa.nomeFantasia}` : pessoa.nomeRazaoSocial])), [pessoasQuery.data]);
    const clienteLabelMap = useMemo(() => new Map((clientesQuery.data ?? []).map((cliente) => [cliente.id, `${cliente.codigo} • ${pessoaLabelMap.get(cliente.pessoaId) ?? 'Pessoa não carregada'}`])), [clientesQuery.data, pessoaLabelMap]);
    const records = useMemo(() => filterLocal(pedidosQuery.data ?? [], localSearch), [pedidosQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);
    const summary = useMemo(() => ({
        totalPedidos: records.length,
        aguardandoAprovacao: records.filter((pedido) => Number(pedido.statusPedido) === StatusPedidoVenda.AguardandoAprovacao).length,
        aprovados: records.filter((pedido) => Number(pedido.statusPedido) === StatusPedidoVenda.Aprovado).length,
        valorTotal: records.reduce<number>((total, pedido) => total + Number(pedido.valorTotal ?? 0), 0)
    }), [records]);

    if (!hasPermission('VENDAS_CONSULTAR')) return <UnauthorizedState description="Pedidos de venda exigem VENDAS_CONSULTAR." />;

    const updateFilter = (name: keyof PedidoVendaListQuery, value: string | number | null) => { setFirst(0); setFilters((current) => ({ ...current, [name]: value || null })); };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown className="min-w-14rem" value={filters.status ?? null} options={statusPedidoVendaOptions} optionLabel="label" optionValue="value" showClear placeholder="Status" onChange={(event) => updateFilter('status', event.value ?? null)} />
            <span className="p-input-icon-left"><i className="pi pi-search" /><InputText placeholder="Buscar pedido" value={localSearch} onChange={(event) => { setFirst(0); setLocalSearch(event.target.value); }} /></span>
            <PermissionGuard permission="VENDAS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo pedido" icon="pi pi-plus" disabled={disabled} onClick={() => router.push('/vendas/pedidos/novo')} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Pedidos de venda" description="Fluxo de rascunho, aprovação, cancelamento e faturamento com impacto em estoque e financeiro." actions={headerActions} />
            <Message className="w-full mb-3" severity="info" text="Pedidos faturados ou cancelados não devem ser alterados diretamente. Aprovação pode reservar estoque e faturamento pode baixar estoque conforme payload." />
            <div className="grid mb-3">
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-1">Pedidos listados</span><strong className="text-xl">{summary.totalPedidos}</strong></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-1">Aguardando aprovação</span><strong className="text-xl">{summary.aguardandoAprovacao}</strong></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-1">Aprovados</span><strong className="text-xl">{summary.aprovados}</strong></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-1">Valor total</span><strong className="text-xl">{formatMoney(summary.valorTotal)}</strong></Card></div>
            </div>
            <Card>
                {pedidosQuery.error ? <ApiErrorPanel error={mapApiError(pedidosQuery.error)} /> : null}
                <DataTableServer<PedidoVendaResponse> value={visibleRecords} totalRecords={records.length} loading={pedidosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum pedido encontrado.">
                    <Column field="numero" header="Número" />
                    <Column header="Cliente" body={(row: PedidoVendaResponse) => clienteLabelMap.get(row.clienteId) ?? 'Cliente não carregado'} />
                    <Column header="Emissão" body={(row: PedidoVendaResponse) => formatDate(row.dataEmissao)} />
                    <Column header="Tipo" body={(row: PedidoVendaResponse) => tipoPedidoVendaLabel(row.tipo)} />
                    <Column header="Status" body={(row: PedidoVendaResponse) => <StatusTag status={statusPedidoVendaTagValue(row.statusPedido)} />} />
                    <Column header="Total" body={(row: PedidoVendaResponse) => formatMoney(row.valorTotal)} />
                    <Column header="Ações" alignHeader="right" body={(row: PedidoVendaResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-folder-open', permission: 'VENDAS_CONSULTAR', onClick: () => router.push(`/vendas/pedidos/${row.id}`) }]} />} />
                </DataTableServer>
                {!pedidosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum pedido" description="Crie um pedido ou ajuste os filtros." /> : null}
            </Card>
        </>
    );
};
