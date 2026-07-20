'use client';

import { useMemo, useState } from 'react';
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
import { usePlanoContas, usePlanoContasMutations } from '@/features/contabil/hooks/useContabilResources';
import { ContaContabilFormValues, ContaContabilResponse, PlanoContasListQuery } from '@/features/contabil/types/contabil.types';
import { ContaContabilFormDialog } from '@/features/contabil/components/ContabilDialogs';
import { naturezaLabel, tipoContaFilterOptions, tipoContaLabel } from '@/features/contabil/components/contabilLabels';

const filterLocal = (records: ContaContabilResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.codigo} ${record.nome}`.toLowerCase().includes(normalized));
};

export const PlanoContasPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<PlanoContasListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);

    const contasQuery = usePlanoContas(filters, hasPermission('CONTABIL_CONSULTAR'));
    const { criarMutation, inativarMutation } = usePlanoContasMutations();

    const records = useMemo(() => filterLocal(contasQuery.data ?? [], localSearch), [contasQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('CONTABIL_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Contábil exige a permissão CONTABIL_CONSULTAR." />;
    }

    const updateFilter = (name: keyof PlanoContasListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const criar = async (values: ContaContabilFormValues) => {
        await runWithToast(async () => { await criarMutation.mutateAsync(values); setFormVisible(false); }, { success: { summary: 'Conta criada' }, error: { summary: 'Erro ao criar conta' }, rethrow: true });
    };
    const inativar = (id: string) => runWithToast(() => inativarMutation.mutateAsync(id), { success: { summary: 'Conta inativada' }, error: { summary: 'Erro ao inativar conta' } });

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.tipo ?? null} options={tipoContaFilterOptions} onChange={(event) => updateFilter('tipo', event.value)} aria-label="Filtrar por tipo" />
            <SearchInput ariaLabel="Buscar conta" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="CONTABIL_PLANO_CONTAS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Nova conta" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Plano de contas" description="Contas contábeis analíticas e sintéticas, por natureza." actions={headerActions} />
            <Card>
                {contasQuery.error ? <ApiErrorPanel error={mapApiError(contasQuery.error)} /> : null}
                <DataTableServer<ContaContabilResponse> value={visibleRecords} totalRecords={records.length} loading={contasQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma conta encontrada.">
                    <Column field="codigo" header="Código" />
                    <Column field="nome" header="Nome" />
                    <Column header="Tipo" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: ContaContabilResponse) => tipoContaLabel(Number(row.tipo))} />
                    <Column header="Natureza" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: ContaContabilResponse) => naturezaLabel(Number(row.natureza))} />
                    <Column header="Classe" body={(row: ContaContabilResponse) => <Tag value={row.analitica ? 'Analítica' : 'Sintética'} severity={row.analitica ? 'info' : undefined} />} />
                    <Column header="Situação" body={(row: ContaContabilResponse) => <Tag value={row.ativa ? 'Ativa' : 'Inativa'} severity={row.ativa ? 'success' : 'danger'} />} />
                    <Column header="Ações" alignHeader="right" body={(row: ContaContabilResponse) => (
                        row.ativa ? <DataTableActions actions={[{ key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', severity: 'danger', permission: 'CONTABIL_PLANO_CONTAS_GERENCIAR', onClick: () => inativar(row.id) }]} /> : <span className="text-color-secondary">—</span>
                    )} />
                </DataTableServer>
                {!contasQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma conta" description="Cadastre contas contábeis ou ajuste os filtros." /> : null}
            </Card>
            <ContaContabilFormDialog visible={formVisible} loading={criarMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={criar} />
        </>
    );
};
