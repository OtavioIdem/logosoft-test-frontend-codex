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
import { useColaboradorOptions, usePonto, usePontoMutation } from '@/features/rh/hooks/useRhResources';
import { PontoFormValues, PontoListQuery, PontoResponse } from '@/features/rh/types/rh.types';
import { PontoDialog } from '@/features/rh/components/RhDialogs';
import { origemPontoLabel, tipoPontoLabel } from '@/features/rh/components/rhLabels';

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

export const PontoPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<PontoListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);

    const pontoQuery = usePonto(filters, hasPermission('RH_CONSULTAR'));
    const colaboradorOptions = useColaboradorOptions(filters.empresaId ?? null, filters.filialId ?? null);
    const pontoMutation = usePontoMutation();

    const colaboradorLabel = useMemo(() => {
        const map = new Map(colaboradorOptions.options.map((option) => [option.value, option.label]));
        return (id: string) => map.get(id) ?? id;
    }, [colaboradorOptions.options]);

    const records = useMemo(() => pontoQuery.data ?? [], [pontoQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('RH_CONSULTAR')) {
        return <UnauthorizedState description="O módulo RH exige a permissão RH_CONSULTAR." />;
    }

    const updateFilter = (name: keyof PontoListQuery, value: string | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const registrar = async (values: PontoFormValues) => {
        await runWithToast(async () => { await pontoMutation.mutateAsync(values); setFormVisible(false); }, { success: { summary: 'Ponto registrado' }, error: { summary: 'Erro ao registrar ponto' }, rethrow: true });
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <PermissionGuard permission="RH_PONTO_REGISTRAR" mode="disable">{({ disabled }) => <Button label="Registrar ponto" icon="pi pi-clock" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Ponto" description="Marcações de ponto (entrada, intervalo e saída) por colaborador." actions={headerActions} />
            <Card>
                {pontoQuery.error ? <ApiErrorPanel error={mapApiError(pontoQuery.error)} /> : null}
                <DataTableServer<PontoResponse> value={visibleRecords} totalRecords={records.length} loading={pontoQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma marcação encontrada.">
                    <Column header="Colaborador" body={(row: PontoResponse) => colaboradorLabel(row.colaboradorId)} />
                    <Column header="Data/hora" body={(row: PontoResponse) => formatDateTime(row.data)} />
                    <Column header="Tipo" body={(row: PontoResponse) => <Tag value={tipoPontoLabel(Number(row.tipo))} />} />
                    <Column header="Origem" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: PontoResponse) => origemPontoLabel(Number(row.origem))} />
                    <Column field="observacao" header="Observação" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: PontoResponse) => row.observacao || '—'} />
                </DataTableServer>
                {!pontoQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma marcação" description="Registre um ponto ou ajuste os filtros." /> : null}
            </Card>
            <PontoDialog visible={formVisible} loading={pontoMutation.isPending} colaboradorOptions={colaboradorOptions.options} colaboradorLoading={colaboradorOptions.isFetching} onHide={() => setFormVisible(false)} onSubmit={registrar} />
        </>
    );
};
