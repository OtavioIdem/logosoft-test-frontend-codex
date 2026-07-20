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
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useLeadMutations, useLeads } from '@/features/crm/hooks/useCrmResources';
import { LeadFormValues, LeadResponse, LeadsListQuery, QualificarLeadFormValues } from '@/features/crm/types/crm.types';
import { LeadFormDialog, QualificarLeadDialog } from '@/features/crm/components/CrmDialogs';
import { leadPodeDescartar, leadPodeQualificar, origemLeadLabel, statusLeadFilterOptions, statusLeadLabel, statusLeadSeverity } from '@/features/crm/components/crmLabels';

const filterLocal = (records: LeadResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.nome} ${record.empresa ?? ''} ${record.email ?? ''}`.toLowerCase().includes(normalized));
};

export const LeadsPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<LeadsListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [qualificarAlvo, setQualificarAlvo] = useState<LeadResponse | null>(null);
    const [descartarAlvo, setDescartarAlvo] = useState<string | null>(null);

    const leadsQuery = useLeads(filters, hasPermission('CRM_CONSULTAR'));
    const { criarMutation, qualificarMutation, descartarMutation } = useLeadMutations();

    const records = useMemo(() => filterLocal(leadsQuery.data ?? [], localSearch), [leadsQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('CRM_CONSULTAR')) {
        return <UnauthorizedState description="O módulo CRM exige a permissão CRM_CONSULTAR." />;
    }

    const updateFilter = (name: keyof LeadsListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const criar = async (values: LeadFormValues) => {
        await runWithToast(async () => { await criarMutation.mutateAsync(values); setFormVisible(false); }, { success: { summary: 'Lead criado' }, error: { summary: 'Erro ao criar lead' }, rethrow: true });
    };
    const qualificar = async (values: QualificarLeadFormValues) => {
        if (!qualificarAlvo) return;
        await runWithToast(async () => { await qualificarMutation.mutateAsync({ id: qualificarAlvo.id, values }); setQualificarAlvo(null); }, { success: { summary: 'Lead qualificado', detail: 'Oportunidade criada.' }, error: { summary: 'Erro ao qualificar lead' }, rethrow: true });
    };
    const descartar = async (motivo: string) => {
        if (!descartarAlvo) return;
        await runWithToast(async () => { await descartarMutation.mutateAsync({ id: descartarAlvo, motivo }); setDescartarAlvo(null); }, { success: { summary: 'Lead descartado' }, error: { summary: 'Erro ao descartar lead' }, rethrow: true });
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusLeadFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <SearchInput ariaLabel="Buscar lead" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="CRM_LEADS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo lead" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Leads" description="Captação e qualificação de leads (qualificar gera oportunidade)." actions={headerActions} />
            <Card>
                {leadsQuery.error ? <ApiErrorPanel error={mapApiError(leadsQuery.error)} /> : null}
                <DataTableServer<LeadResponse> value={visibleRecords} totalRecords={records.length} loading={leadsQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum lead encontrado.">
                    <Column field="nome" header="Nome" />
                    <Column field="empresa" header="Empresa" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: LeadResponse) => row.empresa || '—'} />
                    <Column header="Origem" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: LeadResponse) => origemLeadLabel(Number(row.origem))} />
                    <Column header="Status" body={(row: LeadResponse) => <Tag value={statusLeadLabel(Number(row.status))} severity={statusLeadSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: LeadResponse) => {
                        const acoes = [] as { key: string; label: string; icon: string; severity?: 'danger'; permission: 'CRM_LEADS_GERENCIAR'; onClick: () => void }[];
                        if (leadPodeQualificar(Number(row.status))) acoes.push({ key: 'qualificar', label: 'Qualificar', icon: 'pi pi-star', permission: 'CRM_LEADS_GERENCIAR', onClick: () => setQualificarAlvo(row) });
                        if (leadPodeDescartar(Number(row.status))) acoes.push({ key: 'descartar', label: 'Descartar', icon: 'pi pi-ban', severity: 'danger', permission: 'CRM_LEADS_GERENCIAR', onClick: () => setDescartarAlvo(row.id) });
                        return acoes.length ? <DataTableActions actions={acoes} /> : <span className="text-color-secondary">—</span>;
                    }} />
                </DataTableServer>
                {!leadsQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum lead" description="Crie um lead ou ajuste os filtros." /> : null}
            </Card>

            <LeadFormDialog visible={formVisible} loading={criarMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={criar} />
            <QualificarLeadDialog visible={Boolean(qualificarAlvo)} loading={qualificarMutation.isPending} empresaId={qualificarAlvo?.empresaId ?? null} filialId={qualificarAlvo?.filialId ?? null} onHide={() => setQualificarAlvo(null)} onSubmit={qualificar} />
            <ReasonDialog visible={Boolean(descartarAlvo)} title="Descartar lead" confirmLabel="Descartar" loading={descartarMutation.isPending} onHide={() => setDescartarAlvo(null)} onConfirm={descartar} />
        </>
    );
};
