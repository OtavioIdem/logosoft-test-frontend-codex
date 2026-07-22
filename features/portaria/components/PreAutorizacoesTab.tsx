'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { SearchInput } from '@/components/forms/SearchInput';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { usePreAutorizacaoMutations, usePreAutorizacoes } from '@/features/portaria/hooks/usePortariaResources';
import { PreAutorizacaoFormValues, PreAutorizacaoResponse, PreAutorizacoesListQuery } from '@/features/portaria/types/portaria.types';
import { PreAutorizacaoDialog } from '@/features/portaria/components/PortariaDialogs';
import { preAutorizacaoPodeCancelar, statusPreAutorizacaoFilterOptions, statusPreAutorizacaoLabel, statusPreAutorizacaoSeverity, tipoAcessoLabel } from '@/features/portaria/components/portariaLabels';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

const filterLocal = (records: PreAutorizacaoResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.nomeVisitante} ${record.documentoNumero} ${record.destino}`.toLowerCase().includes(normalized));
};

export const PreAutorizacoesTab = () => {
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<PreAutorizacoesListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [cancelarAlvo, setCancelarAlvo] = useState<string | null>(null);

    const listQuery = usePreAutorizacoes(filters);
    const { criarMutation, cancelarMutation } = usePreAutorizacaoMutations();

    const records = useMemo(() => filterLocal(listQuery.data ?? [], localSearch), [listQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    const updateFilter = (name: keyof PreAutorizacoesListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const criar = async (values: PreAutorizacaoFormValues) => {
        await runWithToast(async () => { await criarMutation.mutateAsync(values); setFormVisible(false); }, { success: { summary: 'Pré-autorização criada' }, error: { summary: 'Erro ao criar pré-autorização' }, rethrow: true });
    };
    const cancelar = async (motivo: string) => {
        if (!cancelarAlvo) return;
        await runWithToast(async () => { await cancelarMutation.mutateAsync({ id: cancelarAlvo, motivo }); setCancelarAlvo(null); }, { success: { summary: 'Pré-autorização cancelada' }, error: { summary: 'Erro ao cancelar' }, rethrow: true });
    };

    return (
        <>
            <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center mb-3">
                <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
                <Dropdown value={filters.status ?? null} options={statusPreAutorizacaoFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
                <SearchInput ariaLabel="Buscar pré-autorização" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
                <PermissionGuard permission="PORTARIA_PRE_AUTORIZAR" mode="disable">{({ disabled }) => <Button label="Nova pré-autorização" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
            </div>

            {listQuery.error ? <ApiErrorPanel error={mapApiError(listQuery.error)} /> : null}
            <DataTableServer<PreAutorizacaoResponse> value={visibleRecords} totalRecords={records.length} loading={listQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma pré-autorização encontrada.">
                <Column field="nomeVisitante" header="Visitante" />
                <Column header="Tipo" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: PreAutorizacaoResponse) => tipoAcessoLabel(Number(row.tipoAcesso))} />
                <Column field="destino" header="Destino" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" />
                <Column header="Validade" body={(row: PreAutorizacaoResponse) => `${formatDate(row.validadeInicio)} — ${formatDate(row.validadeFim)}`} />
                <Column header="Status" body={(row: PreAutorizacaoResponse) => <Tag value={statusPreAutorizacaoLabel(Number(row.status))} severity={statusPreAutorizacaoSeverity(Number(row.status)) ?? undefined} />} />
                <Column header="Ações" alignHeader="right" body={(row: PreAutorizacaoResponse) => (
                    preAutorizacaoPodeCancelar(Number(row.status)) ? <DataTableActions actions={[{ key: 'cancelar', label: 'Cancelar', icon: 'pi pi-ban', severity: 'danger', permission: 'PORTARIA_PRE_AUTORIZAR', onClick: () => setCancelarAlvo(row.id) }]} /> : <span className="text-color-secondary">—</span>
                )} />
            </DataTableServer>

            <PreAutorizacaoDialog visible={formVisible} loading={criarMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={criar} />
            <ReasonDialog visible={Boolean(cancelarAlvo)} title="Cancelar pré-autorização" confirmLabel="Cancelar" loading={cancelarMutation.isPending} onHide={() => setCancelarAlvo(null)} onConfirm={cancelar} />
        </>
    );
};
