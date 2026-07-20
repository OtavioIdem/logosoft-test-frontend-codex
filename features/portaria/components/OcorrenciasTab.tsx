'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useOcorrencias, useOcorrenciaMutations, useRegistrosAcesso } from '@/features/portaria/hooks/usePortariaResources';
import { OcorrenciaAcessoResponse, OcorrenciaFormValues, OcorrenciasListQuery } from '@/features/portaria/types/portaria.types';
import { OcorrenciaDialog } from '@/features/portaria/components/PortariaDialogs';
import { gravidadeFilterOptions, gravidadeLabel, gravidadeSeverity, ocorrenciaPodeResolver, statusOcorrenciaFilterOptions, statusOcorrenciaLabel, statusOcorrenciaSeverity, tipoOcorrenciaLabel } from '@/features/portaria/components/portariaLabels';

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

export const OcorrenciasTab = () => {
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<OcorrenciasListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [resolverAlvo, setResolverAlvo] = useState<string | null>(null);

    const listQuery = useOcorrencias(filters);
    const registrosQuery = useRegistrosAcesso({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null });
    const { registrarMutation, resolverMutation } = useOcorrenciaMutations();

    const registroOptions = useMemo(() => (registrosQuery.data ?? []).map((registro) => ({ label: `${registro.nomeVisitante} — ${registro.destino}`, value: registro.id })), [registrosQuery.data]);

    const records = useMemo(() => listQuery.data ?? [], [listQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    const updateFilter = (name: keyof OcorrenciasListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const registrar = async (values: OcorrenciaFormValues) => {
        await runWithToast(async () => { await registrarMutation.mutateAsync(values); setFormVisible(false); }, { success: { summary: 'Ocorrência registrada', detail: 'Ocorrências críticas geram notificação.' }, error: { summary: 'Erro ao registrar ocorrência' }, rethrow: true });
    };
    const resolver = async (resolucao: string) => {
        if (!resolverAlvo) return;
        await runWithToast(async () => { await resolverMutation.mutateAsync({ id: resolverAlvo, resolucao }); setResolverAlvo(null); }, { success: { summary: 'Ocorrência resolvida' }, error: { summary: 'Erro ao resolver ocorrência' }, rethrow: true });
    };

    return (
        <>
            <div className="flex flex-column md:flex-row gap-2 md:align-items-center mb-3">
                <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
                <Dropdown value={filters.gravidade ?? null} options={gravidadeFilterOptions} onChange={(event) => updateFilter('gravidade', event.value)} aria-label="Filtrar por gravidade" />
                <Dropdown value={filters.status ?? null} options={statusOcorrenciaFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
                <PermissionGuard permission="PORTARIA_OPERAR" mode="disable">{({ disabled }) => <Button label="Registrar ocorrência" icon="pi pi-exclamation-triangle" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
            </div>

            {listQuery.error ? <ApiErrorPanel error={mapApiError(listQuery.error)} /> : null}
            <DataTableServer<OcorrenciaAcessoResponse> value={visibleRecords} totalRecords={records.length} loading={listQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma ocorrência encontrada.">
                <Column header="Registrada" body={(row: OcorrenciaAcessoResponse) => formatDateTime(row.registradoEm)} />
                <Column header="Tipo" body={(row: OcorrenciaAcessoResponse) => tipoOcorrenciaLabel(Number(row.tipo))} />
                <Column header="Gravidade" body={(row: OcorrenciaAcessoResponse) => <Tag value={gravidadeLabel(Number(row.gravidade))} severity={gravidadeSeverity(Number(row.gravidade)) ?? undefined} />} />
                <Column field="descricao" header="Descrição" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" />
                <Column header="Status" body={(row: OcorrenciaAcessoResponse) => <Tag value={statusOcorrenciaLabel(Number(row.status))} severity={statusOcorrenciaSeverity(Number(row.status)) ?? undefined} />} />
                <Column header="Ações" alignHeader="right" body={(row: OcorrenciaAcessoResponse) => (
                    ocorrenciaPodeResolver(Number(row.status)) ? <DataTableActions actions={[{ key: 'resolver', label: 'Resolver', icon: 'pi pi-check', permission: 'PORTARIA_OPERAR', onClick: () => setResolverAlvo(row.id) }]} /> : <span className="text-color-secondary">—</span>
                )} />
            </DataTableServer>

            <OcorrenciaDialog visible={formVisible} loading={registrarMutation.isPending} empresaId={filters.empresaId ?? ''} filialId={filters.filialId ?? null} registroOptions={registroOptions} onHide={() => setFormVisible(false)} onSubmit={registrar} />
            <ReasonDialog visible={Boolean(resolverAlvo)} title="Resolver ocorrência" confirmLabel="Resolver" loading={resolverMutation.isPending} onHide={() => setResolverAlvo(null)} onConfirm={resolver} />
        </>
    );
};
