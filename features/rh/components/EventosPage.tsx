'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
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
import { useColaboradorOptions, useEventoMutation, useEventos } from '@/features/rh/hooks/useRhResources';
import { EventoRhFormValues, EventoRhResponse, EventosListQuery } from '@/features/rh/types/rh.types';
import { EventoDialog } from '@/features/rh/components/RhDialogs';
import { origemEventoLabel, tipoEventoLabel, tipoEventoSeverity } from '@/features/rh/components/rhLabels';

const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatCompetencia = (value: string) => (value && value.length === 6 ? `${value.slice(4)}/${value.slice(0, 4)}` : value);

export const EventosPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<EventosListQuery>({});
    const [competenciaInput, setCompetenciaInput] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);

    const eventosQuery = useEventos(filters, hasPermission('RH_CONSULTAR'));
    const colaboradorOptions = useColaboradorOptions(filters.empresaId ?? null, filters.filialId ?? null);
    const eventoMutation = useEventoMutation();

    const colaboradorLabel = useMemo(() => {
        const map = new Map(colaboradorOptions.options.map((option) => [option.value, option.label]));
        return (id: string) => map.get(id) ?? id;
    }, [colaboradorOptions.options]);

    const records = useMemo(() => eventosQuery.data ?? [], [eventosQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('RH_CONSULTAR')) {
        return <UnauthorizedState description="O módulo RH exige a permissão RH_CONSULTAR." />;
    }

    const updateFilter = (name: keyof EventosListQuery, value: string | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const registrar = async (values: EventoRhFormValues) => {
        await runWithToast(async () => { await eventoMutation.mutateAsync(values); setFormVisible(false); }, { success: { summary: 'Evento registrado' }, error: { summary: 'Erro ao registrar evento' }, rethrow: true });
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <span className="p-input-icon-left">
                <i className="pi pi-calendar" />
                <InputText value={competenciaInput} keyfilter="int" maxLength={6} placeholder="Competência AAAAMM" aria-label="Filtrar por competência" onChange={(event) => { const value = event.target.value; setCompetenciaInput(value); updateFilter('competencia', value.length === 6 ? value : null); }} />
            </span>
            <PermissionGuard permission="RH_EVENTOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Registrar evento" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Eventos de folha" description="Proventos, descontos e informativos por competência (sem cálculo legal)." actions={headerActions} />
            <Card>
                {eventosQuery.error ? <ApiErrorPanel error={mapApiError(eventosQuery.error)} /> : null}
                <DataTableServer<EventoRhResponse> value={visibleRecords} totalRecords={records.length} loading={eventosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum evento encontrado.">
                    <Column header="Colaborador" body={(row: EventoRhResponse) => colaboradorLabel(row.colaboradorId)} />
                    <Column header="Competência" body={(row: EventoRhResponse) => formatCompetencia(row.competencia)} />
                    <Column field="codigo" header="Código" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" />
                    <Column field="descricao" header="Descrição" />
                    <Column header="Tipo" body={(row: EventoRhResponse) => <Tag value={tipoEventoLabel(Number(row.tipo))} severity={tipoEventoSeverity(Number(row.tipo)) ?? undefined} />} />
                    <Column header="Valor" body={(row: EventoRhResponse) => formatMoney(row.valor)} />
                    <Column header="Origem" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: EventoRhResponse) => origemEventoLabel(Number(row.origem))} />
                </DataTableServer>
                {!eventosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum evento" description="Registre um evento ou ajuste os filtros." /> : null}
            </Card>
            <EventoDialog visible={formVisible} loading={eventoMutation.isPending} colaboradorOptions={colaboradorOptions.options} colaboradorLoading={colaboradorOptions.isFetching} onHide={() => setFormVisible(false)} onSubmit={registrar} />
        </>
    );
};
