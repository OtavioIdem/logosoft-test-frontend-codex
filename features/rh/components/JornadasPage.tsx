'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useJornadaMutations, useJornadas } from '@/features/rh/hooks/useRhResources';
import { JornadaFormValues, JornadaResponse, JornadasListQuery } from '@/features/rh/types/rh.types';
import { JornadaFormDialog } from '@/features/rh/components/RhDialogs';

export const JornadasPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<JornadasListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);

    const jornadasQuery = useJornadas(filters, hasPermission('RH_CONSULTAR'));
    const { criarMutation } = useJornadaMutations();

    const records = useMemo(() => jornadasQuery.data ?? [], [jornadasQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('RH_CONSULTAR')) {
        return <UnauthorizedState description="O módulo RH exige a permissão RH_CONSULTAR." />;
    }

    const updateFilter = (name: keyof JornadasListQuery, value: string | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const criar = async (values: JornadaFormValues) => {
        await runWithToast(async () => { await criarMutation.mutateAsync(values); setFormVisible(false); }, { success: { summary: 'Jornada criada' }, error: { summary: 'Erro ao criar jornada' }, rethrow: true });
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <PermissionGuard permission="RH_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Nova jornada" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Jornadas" description="Cadastro de jornadas de trabalho (carga horária e tolerância)." actions={headerActions} />
            <Card>
                {jornadasQuery.error ? <ApiErrorPanel error={mapApiError(jornadasQuery.error)} /> : null}
                <DataTableServer<JornadaResponse> value={visibleRecords} totalRecords={records.length} loading={jornadasQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma jornada encontrada.">
                    <Column field="nome" header="Nome" />
                    <Column header="Carga semanal" body={(row: JornadaResponse) => `${row.cargaHorariaSemanal}h`} />
                    <Column header="Tolerância" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: JornadaResponse) => (row.toleranciaMinutos != null ? `${row.toleranciaMinutos} min` : '—')} />
                    <Column field="descricao" header="Descrição" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: JornadaResponse) => row.descricao || '—'} />
                    <Column header="Situação" body={(row: JornadaResponse) => <Tag value={row.ativo ? 'Ativa' : 'Inativa'} severity={row.ativo ? 'success' : undefined} />} />
                </DataTableServer>
                {!jornadasQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma jornada" description="Crie uma jornada ou ajuste os filtros." /> : null}
            </Card>
            <JornadaFormDialog visible={formVisible} loading={criarMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={criar} />
        </>
    );
};
