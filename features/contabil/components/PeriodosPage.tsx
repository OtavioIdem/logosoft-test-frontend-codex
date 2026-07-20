'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
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
import { usePeriodos, usePeriodoMutations } from '@/features/contabil/hooks/useContabilResources';
import { AbrirPeriodoFormValues, PeriodoContabilResponse, PeriodosListQuery } from '@/features/contabil/types/contabil.types';
import { AbrirPeriodoDialog } from '@/features/contabil/components/ContabilDialogs';
import { competenciaLabel, periodoPodeFechar, periodoPodeReabrir, statusPeriodoFilterOptions, statusPeriodoLabel, statusPeriodoSeverity } from '@/features/contabil/components/contabilLabels';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

export const PeriodosPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<PeriodosListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [abrirVisible, setAbrirVisible] = useState(false);
    const [fecharAlvo, setFecharAlvo] = useState<string | null>(null);

    const periodosQuery = usePeriodos(filters, hasPermission('CONTABIL_CONSULTAR'));
    const { abrirMutation, fecharMutation, reabrirMutation } = usePeriodoMutations();

    const records = useMemo(() => periodosQuery.data ?? [], [periodosQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('CONTABIL_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Contábil exige a permissão CONTABIL_CONSULTAR." />;
    }

    const updateFilter = (name: keyof PeriodosListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const abrir = async (values: AbrirPeriodoFormValues) => {
        await runWithToast(async () => { await abrirMutation.mutateAsync(values); setAbrirVisible(false); }, { success: { summary: 'Período aberto' }, error: { summary: 'Erro ao abrir período' }, rethrow: true });
    };
    const fechar = async (observacao: string) => {
        if (!fecharAlvo) return;
        await runWithToast(async () => { await fecharMutation.mutateAsync({ id: fecharAlvo, observacao: observacao.trim() || null }); setFecharAlvo(null); }, { success: { summary: 'Período fechado', detail: 'Balancete validado.' }, error: { summary: 'Erro ao fechar período' }, rethrow: true });
    };
    const reabrir = (id: string) => runWithToast(() => reabrirMutation.mutateAsync({ id }), { success: { summary: 'Período reaberto' }, error: { summary: 'Erro ao reabrir período' } });

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusPeriodoFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <PermissionGuard permission="CONTABIL_PERIODOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Abrir período" icon="pi pi-plus" disabled={disabled} onClick={() => setAbrirVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Períodos contábeis" description="Abertura e fechamento de competências (o fechamento valida o balancete)." actions={headerActions} />
            <Card>
                {periodosQuery.error ? <ApiErrorPanel error={mapApiError(periodosQuery.error)} /> : null}
                <DataTableServer<PeriodoContabilResponse> value={visibleRecords} totalRecords={records.length} loading={periodosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum período encontrado.">
                    <Column header="Competência" body={(row: PeriodoContabilResponse) => competenciaLabel(row.ano, row.mes)} />
                    <Column header="Status" body={(row: PeriodoContabilResponse) => <Tag value={statusPeriodoLabel(Number(row.status))} severity={statusPeriodoSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Fechado em" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: PeriodoContabilResponse) => formatDate(row.fechadoEm)} />
                    <Column header="Ações" alignHeader="right" body={(row: PeriodoContabilResponse) => {
                        const acoes = [] as { key: string; label: string; icon: string; severity?: 'danger'; permission: 'CONTABIL_PERIODOS_GERENCIAR'; onClick: () => void }[];
                        if (periodoPodeFechar(Number(row.status))) acoes.push({ key: 'fechar', label: 'Fechar', icon: 'pi pi-lock', permission: 'CONTABIL_PERIODOS_GERENCIAR', onClick: () => setFecharAlvo(row.id) });
                        if (periodoPodeReabrir(Number(row.status))) acoes.push({ key: 'reabrir', label: 'Reabrir', icon: 'pi pi-lock-open', permission: 'CONTABIL_PERIODOS_GERENCIAR', onClick: () => reabrir(row.id) });
                        return acoes.length ? <DataTableActions actions={acoes} /> : <span className="text-color-secondary">—</span>;
                    }} />
                </DataTableServer>
                {!periodosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum período" description="Abra um período contábil ou ajuste os filtros." /> : null}
            </Card>
            <AbrirPeriodoDialog visible={abrirVisible} loading={abrirMutation.isPending} onHide={() => setAbrirVisible(false)} onSubmit={abrir} />
            <ReasonDialog visible={Boolean(fecharAlvo)} title="Fechar período" confirmLabel="Fechar período" loading={fecharMutation.isPending} onHide={() => setFecharAlvo(null)} onConfirm={fechar} />
        </>
    );
};
