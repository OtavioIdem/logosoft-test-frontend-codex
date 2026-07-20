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
import { useRegistroAcessoMutations, useRegistrosAcesso } from '@/features/portaria/hooks/usePortariaResources';
import { RegistrarEntradaFormValues, RegistrarSaidaFormValues, RegistroAcessoResponse, RegistrosAcessoListQuery, ValidarDocumentoFormValues } from '@/features/portaria/types/portaria.types';
import { RegistrarEntradaDialog, SaidaDialog, ValidarDocumentoDialog } from '@/features/portaria/components/PortariaDialogs';
import { registroPodeCancelar, registroPodeSaida, registroPodeValidar, statusRegistroFilterOptions, statusRegistroLabel, statusRegistroSeverity, tipoAcessoLabel } from '@/features/portaria/components/portariaLabels';

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');
const formatPermanencia = (minutos?: number | null) => {
    if (minutos == null) return '—';
    const horas = Math.floor(minutos / 60);
    const restante = minutos % 60;
    return horas > 0 ? `${horas}h${String(restante).padStart(2, '0')}` : `${restante}min`;
};

const filterLocal = (records: RegistroAcessoResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.nomeVisitante} ${record.documentoNumero} ${record.destino}`.toLowerCase().includes(normalized));
};

type DialogKind = 'entrada' | 'validar' | 'saida' | 'cancelar' | null;

export const RegistrosAcessoTab = () => {
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<RegistrosAcessoListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [dialog, setDialog] = useState<DialogKind>(null);
    const [alvo, setAlvo] = useState<string | null>(null);

    const listQuery = useRegistrosAcesso(filters);
    const { entradaMutation, validarMutation, saidaMutation, cancelarMutation } = useRegistroAcessoMutations();

    const records = useMemo(() => filterLocal(listQuery.data ?? [], localSearch), [listQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    const updateFilter = (name: keyof RegistrosAcessoListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const close = () => {
        setDialog(null);
        setAlvo(null);
    };

    const registrarEntrada = async (values: RegistrarEntradaFormValues) => {
        await runWithToast(async () => { await entradaMutation.mutateAsync(values); close(); }, { success: { summary: 'Entrada registrada' }, error: { summary: 'Erro ao registrar entrada' }, rethrow: true });
    };
    const validar = async (values: ValidarDocumentoFormValues) => {
        if (!alvo) return;
        await runWithToast(async () => { await validarMutation.mutateAsync({ id: alvo, values }); close(); }, { success: { summary: values.aprovado ? 'Documento aprovado' : 'Acesso negado' }, error: { summary: 'Erro ao validar documento' }, rethrow: true });
    };
    const registrarSaida = async (values: RegistrarSaidaFormValues) => {
        if (!alvo) return;
        await runWithToast(async () => { await saidaMutation.mutateAsync({ id: alvo, values }); close(); }, { success: { summary: 'Saída registrada' }, error: { summary: 'Erro ao registrar saída' }, rethrow: true });
    };
    const cancelar = async (motivo: string) => {
        if (!alvo) return;
        await runWithToast(async () => { await cancelarMutation.mutateAsync({ id: alvo, motivo }); close(); }, { success: { summary: 'Registro cancelado' }, error: { summary: 'Erro ao cancelar registro' }, rethrow: true });
    };

    const abrir = (kind: DialogKind, id: string) => {
        setAlvo(id);
        setDialog(kind);
    };

    return (
        <>
            <div className="flex flex-column md:flex-row gap-2 md:align-items-center mb-3">
                <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
                <Dropdown value={filters.status ?? null} options={statusRegistroFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
                <SearchInput ariaLabel="Buscar registro" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
                <PermissionGuard permission="PORTARIA_OPERAR" mode="disable">{({ disabled }) => <Button label="Registrar entrada" icon="pi pi-sign-in" disabled={disabled} onClick={() => setDialog('entrada')} />}</PermissionGuard>
            </div>

            {listQuery.error ? <ApiErrorPanel error={mapApiError(listQuery.error)} /> : null}
            <DataTableServer<RegistroAcessoResponse> value={visibleRecords} totalRecords={records.length} loading={listQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum registro de acesso encontrado.">
                <Column field="nomeVisitante" header="Visitante" />
                <Column header="Tipo" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: RegistroAcessoResponse) => tipoAcessoLabel(Number(row.tipoAcesso))} />
                <Column field="destino" header="Destino" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" />
                <Column header="Entrada" body={(row: RegistroAcessoResponse) => formatDateTime(row.dataEntrada)} />
                <Column header="Permanência" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: RegistroAcessoResponse) => formatPermanencia(row.permanenciaMinutos)} />
                <Column header="Status" body={(row: RegistroAcessoResponse) => <Tag value={statusRegistroLabel(Number(row.status))} severity={statusRegistroSeverity(Number(row.status)) ?? undefined} />} />
                <Column header="Ações" alignHeader="right" body={(row: RegistroAcessoResponse) => {
                    const acoes = [] as { key: string; label: string; icon: string; severity?: 'danger'; permission: 'PORTARIA_OPERAR'; onClick: () => void }[];
                    if (registroPodeValidar(Number(row.status))) acoes.push({ key: 'validar', label: 'Validar', icon: 'pi pi-verified', permission: 'PORTARIA_OPERAR', onClick: () => abrir('validar', row.id) });
                    if (registroPodeSaida(Number(row.status))) acoes.push({ key: 'saida', label: 'Saída', icon: 'pi pi-sign-out', permission: 'PORTARIA_OPERAR', onClick: () => abrir('saida', row.id) });
                    if (registroPodeCancelar(Number(row.status))) acoes.push({ key: 'cancelar', label: 'Cancelar', icon: 'pi pi-ban', severity: 'danger', permission: 'PORTARIA_OPERAR', onClick: () => abrir('cancelar', row.id) });
                    return acoes.length ? <DataTableActions actions={acoes} /> : <span className="text-color-secondary">—</span>;
                }} />
            </DataTableServer>

            <RegistrarEntradaDialog visible={dialog === 'entrada'} loading={entradaMutation.isPending} onHide={close} onSubmit={registrarEntrada} />
            <ValidarDocumentoDialog visible={dialog === 'validar'} loading={validarMutation.isPending} onHide={close} onSubmit={validar} />
            <SaidaDialog visible={dialog === 'saida'} loading={saidaMutation.isPending} onHide={close} onSubmit={registrarSaida} />
            <ReasonDialog visible={dialog === 'cancelar'} title="Cancelar registro de acesso" confirmLabel="Cancelar registro" loading={cancelarMutation.isPending} onHide={close} onConfirm={cancelar} />
        </>
    );
};
