'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { usePlanoContas, useRegras, useRegraMutations } from '@/features/contabil/hooks/useContabilResources';
import { RegraContabilizacaoFormValues, RegraContabilizacaoResponse, RegrasListQuery } from '@/features/contabil/types/contabil.types';
import { RegraFormDialog } from '@/features/contabil/components/ContabilDialogs';
import { tipoEventoLabel } from '@/features/contabil/components/contabilLabels';

export const RegrasPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<RegrasListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);

    const regrasQuery = useRegras(filters, hasPermission('CONTABIL_CONSULTAR'));
    const contasQuery = usePlanoContas({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null }, hasPermission('CONTABIL_CONSULTAR'));
    const { criarMutation, inativarMutation } = useRegraMutations();

    const contaLabel = useMemo(() => {
        const map = new Map((contasQuery.data ?? []).map((conta) => [conta.id, `${conta.codigo} - ${conta.nome}`]));
        return (id: string) => map.get(id) ?? id;
    }, [contasQuery.data]);

    const records = useMemo(() => regrasQuery.data ?? [], [regrasQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('CONTABIL_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Contábil exige a permissão CONTABIL_CONSULTAR." />;
    }

    const updateFilter = (name: keyof RegrasListQuery, value: string | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const criar = async (values: RegraContabilizacaoFormValues) => {
        await runWithToast(async () => { await criarMutation.mutateAsync(values); setFormVisible(false); }, { success: { summary: 'Regra criada' }, error: { summary: 'Erro ao criar regra' }, rethrow: true });
    };
    const inativar = (id: string) => runWithToast(() => inativarMutation.mutateAsync(id), { success: { summary: 'Regra inativada' }, error: { summary: 'Erro ao inativar regra' } });

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <PermissionGuard permission="CONTABIL_REGRAS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Nova regra" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Regras de contabilização" description="Automatizam a contabilização de baixas financeiras (débito × crédito por evento)." actions={headerActions} />
            <Card>
                {regrasQuery.error ? <ApiErrorPanel error={mapApiError(regrasQuery.error)} /> : null}
                <DataTableServer<RegraContabilizacaoResponse> value={visibleRecords} totalRecords={records.length} loading={regrasQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma regra encontrada.">
                    <Column field="descricao" header="Descrição" />
                    <Column header="Evento" body={(row: RegraContabilizacaoResponse) => tipoEventoLabel(Number(row.tipoEvento))} />
                    <Column header="Débito" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: RegraContabilizacaoResponse) => contaLabel(row.contaDebitoId)} />
                    <Column header="Crédito" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: RegraContabilizacaoResponse) => contaLabel(row.contaCreditoId)} />
                    <Column header="Situação" body={(row: RegraContabilizacaoResponse) => <Tag value={row.ativa ? 'Ativa' : 'Inativa'} severity={row.ativa ? 'success' : 'danger'} />} />
                    <Column header="Ações" alignHeader="right" body={(row: RegraContabilizacaoResponse) => (
                        row.ativa ? <DataTableActions actions={[{ key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', severity: 'danger', permission: 'CONTABIL_REGRAS_GERENCIAR', onClick: () => inativar(row.id) }]} /> : <span className="text-color-secondary">—</span>
                    )} />
                </DataTableServer>
                {!regrasQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma regra" description="Cadastre regras de contabilização ou ajuste os filtros." /> : null}
            </Card>
            <RegraFormDialog visible={formVisible} loading={criarMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={criar} />
        </>
    );
};
