'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { SearchInput } from '@/components/forms/SearchInput';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useCotacoesCompra, useCotacoesCompraMutations } from '@/features/compras-avancado/hooks/useComprasAvancadoResources';
import { CotacaoCompraResponse, CotacoesListQuery, CriarCotacaoFormValues } from '@/features/compras-avancado/types/comprasAvancado.types';
import { CriarCotacaoDialog } from '@/features/compras-avancado/components/CotacaoDialogs';
import { statusCotacaoLabel, statusCotacaoOptions, statusCotacaoSeverity } from '@/features/compras-avancado/components/comprasAvancadoLabels';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');
const filterLocal = (records: CotacaoCompraResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => record.numero.toLowerCase().includes(normalized));
};

export const CotacoesCompraPage = () => {
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<CotacoesListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);

    const cotacoesQuery = useCotacoesCompra(filters, hasPermission('COMPRAS_COTACOES_CONSULTAR'));
    const { criarMutation } = useCotacoesCompraMutations();

    const records = useMemo(() => filterLocal(cotacoesQuery.data ?? [], localSearch), [cotacoesQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('COMPRAS_COTACOES_CONSULTAR')) {
        return <UnauthorizedState description="Cotações de compra exigem COMPRAS_COTACOES_CONSULTAR." />;
    }

    const updateFilter = (name: keyof CotacoesListQuery, value: string | number | null) => { setFirst(0); setFilters((c) => ({ ...c, [name]: value === '' ? null : value })); };

    const criar = async (values: CriarCotacaoFormValues) => {
        await runWithToast(
            async () => {
                const criada = await criarMutation.mutateAsync(values);
                setFormVisible(false);
                router.push(`/compras/cotacoes/${criada.id}`);
            },
            { success: { summary: 'Cotação criada', detail: `Cotação ${values.numero} aberta.` }, error: { summary: 'Erro ao criar cotação', detail: 'Não foi possível criar a cotação.' }, rethrow: true }
        );
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusCotacaoOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <SearchInput ariaLabel="Buscar cotação" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="COMPRAS_COTACOES_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Nova cotação" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Cotações de compra" description="Cotação vinculada a solicitação; aprovar gera o pedido de compra." actions={headerActions} />
            <Card>
                {cotacoesQuery.error ? <ApiErrorPanel error={mapApiError(cotacoesQuery.error)} /> : null}
                <DataTableServer<CotacaoCompraResponse> value={visibleRecords} totalRecords={records.length} loading={cotacoesQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma cotação encontrada.">
                    <Column field="numero" header="Número" />
                    <Column header="Data" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: CotacaoCompraResponse) => formatDate(row.dataCotacao)} />
                    <Column header="Itens" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: CotacaoCompraResponse) => row.itens.length} />
                    <Column header="Status" body={(row: CotacaoCompraResponse) => <Tag value={statusCotacaoLabel(Number(row.statusCotacao))} severity={statusCotacaoSeverity(Number(row.statusCotacao)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: CotacaoCompraResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'COMPRAS_COTACOES_CONSULTAR', onClick: () => router.push(`/compras/cotacoes/${row.id}`) }]} />} />
                </DataTableServer>
                {!cotacoesQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma cotação" description="Crie uma cotação ou ajuste os filtros." /> : null}
            </Card>
            <CriarCotacaoDialog visible={formVisible} loading={criarMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={criar} />
        </>
    );
};
