'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { TabPanel, TabView } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { DateInput } from '@/components/forms/DateInput';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useAfastamentoMutations, useAfastamentos, useColaboradorOptions, useFerias, useFeriasMutations } from '@/features/rh/hooks/useRhResources';
import { AfastamentoFormValues, AfastamentoResponse, AfastamentosListQuery, FeriasFormValues, FeriasListQuery, FeriasResponse } from '@/features/rh/types/rh.types';
import { AfastamentoDialog, FeriasDialog } from '@/features/rh/components/RhDialogs';
import {
    afastamentoPodeEncerrar,
    feriasPodeAprovar,
    feriasPodeCancelar,
    feriasPodeConcluir,
    feriasPodeIniciar,
    feriasPodeRejeitar,
    statusAfastamentoFilterOptions,
    statusAfastamentoLabel,
    statusAfastamentoSeverity,
    statusFeriasFilterOptions,
    statusFeriasLabel,
    statusFeriasSeverity,
    tipoAfastamentoLabel
} from '@/features/rh/components/rhLabels';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

type FeriasAcao = 'aprovar' | 'rejeitar' | 'iniciar' | 'concluir' | 'cancelar';

const FeriasTab = () => {
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<FeriasListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [motivoDialog, setMotivoDialog] = useState<{ id: string; acao: FeriasAcao } | null>(null);

    const feriasQuery = useFerias(filters);
    const colaboradorOptions = useColaboradorOptions(filters.empresaId ?? null, filters.filialId ?? null);
    const { solicitarMutation, acaoMutation } = useFeriasMutations();

    const colaboradorLabel = useMemo(() => {
        const map = new Map(colaboradorOptions.options.map((option) => [option.value, option.label]));
        return (id: string) => map.get(id) ?? id;
    }, [colaboradorOptions.options]);

    const records = useMemo(() => feriasQuery.data ?? [], [feriasQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    const updateFilter = (name: keyof FeriasListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const solicitar = async (values: FeriasFormValues) => {
        await runWithToast(async () => { await solicitarMutation.mutateAsync(values); setFormVisible(false); }, { success: { summary: 'Férias solicitadas' }, error: { summary: 'Erro ao solicitar férias' }, rethrow: true });
    };
    const acaoSimples = (id: string, acao: FeriasAcao, summary: string) => runWithToast(() => acaoMutation.mutateAsync({ id, acao }), { success: { summary }, error: { summary: 'Erro na ação de férias' } });
    const acaoComMotivo = async (motivo: string) => {
        if (!motivoDialog) return;
        await runWithToast(async () => { await acaoMutation.mutateAsync({ id: motivoDialog.id, acao: motivoDialog.acao, motivo }); setMotivoDialog(null); }, { success: { summary: motivoDialog.acao === 'rejeitar' ? 'Férias rejeitadas' : 'Férias canceladas' }, error: { summary: 'Erro na ação de férias' }, rethrow: true });
    };

    const acoesFerias = (row: FeriasResponse) => {
        const status = Number(row.status);
        const acoes = [] as { key: string; label: string; icon: string; severity?: 'danger'; permission: 'RH_GERENCIAR'; onClick: () => void }[];
        if (feriasPodeAprovar(status)) acoes.push({ key: 'aprovar', label: 'Aprovar', icon: 'pi pi-check', permission: 'RH_GERENCIAR', onClick: () => acaoSimples(row.id, 'aprovar', 'Férias aprovadas') });
        if (feriasPodeRejeitar(status)) acoes.push({ key: 'rejeitar', label: 'Rejeitar', icon: 'pi pi-times', severity: 'danger', permission: 'RH_GERENCIAR', onClick: () => setMotivoDialog({ id: row.id, acao: 'rejeitar' }) });
        if (feriasPodeIniciar(status)) acoes.push({ key: 'iniciar', label: 'Iniciar', icon: 'pi pi-play', permission: 'RH_GERENCIAR', onClick: () => acaoSimples(row.id, 'iniciar', 'Férias iniciadas') });
        if (feriasPodeConcluir(status)) acoes.push({ key: 'concluir', label: 'Concluir', icon: 'pi pi-flag', permission: 'RH_GERENCIAR', onClick: () => acaoSimples(row.id, 'concluir', 'Férias concluídas') });
        if (feriasPodeCancelar(status)) acoes.push({ key: 'cancelar', label: 'Cancelar', icon: 'pi pi-ban', severity: 'danger', permission: 'RH_GERENCIAR', onClick: () => setMotivoDialog({ id: row.id, acao: 'cancelar' }) });
        return acoes.length ? <DataTableActions actions={acoes} /> : <span className="text-color-secondary">—</span>;
    };

    return (
        <>
            <div className="flex flex-column md:flex-row gap-2 md:align-items-center mb-3">
                <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
                <Dropdown value={filters.status ?? null} options={statusFeriasFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
                <PermissionGuard permission="RH_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Solicitar férias" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
            </div>
            {feriasQuery.error ? <ApiErrorPanel error={mapApiError(feriasQuery.error)} /> : null}
            <DataTableServer<FeriasResponse> value={visibleRecords} totalRecords={records.length} loading={feriasQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma solicitação de férias.">
                <Column header="Colaborador" body={(row: FeriasResponse) => colaboradorLabel(row.colaboradorId)} />
                <Column header="Período" body={(row: FeriasResponse) => `${formatDate(row.dataInicio)} — ${formatDate(row.dataFim)}`} />
                <Column header="Dias" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: FeriasResponse) => row.dias} />
                <Column header="Status" body={(row: FeriasResponse) => <Tag value={statusFeriasLabel(Number(row.status))} severity={statusFeriasSeverity(Number(row.status)) ?? undefined} />} />
                <Column header="Ações" alignHeader="right" body={acoesFerias} />
            </DataTableServer>
            <FeriasDialog visible={formVisible} loading={solicitarMutation.isPending} colaboradorOptions={colaboradorOptions.options} colaboradorLoading={colaboradorOptions.isFetching} onHide={() => setFormVisible(false)} onSubmit={solicitar} />
            <ReasonDialog visible={Boolean(motivoDialog)} title={motivoDialog?.acao === 'rejeitar' ? 'Rejeitar férias' : 'Cancelar férias'} confirmLabel="Confirmar" loading={acaoMutation.isPending} onHide={() => setMotivoDialog(null)} onConfirm={acaoComMotivo} />
        </>
    );
};

const AfastamentosTab = () => {
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<AfastamentosListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [encerrarAlvo, setEncerrarAlvo] = useState<string | null>(null);
    const [dataFimReal, setDataFimReal] = useState<Date | null>(null);

    const afastamentosQuery = useAfastamentos(filters);
    const colaboradorOptions = useColaboradorOptions(filters.empresaId ?? null, filters.filialId ?? null);
    const { registrarMutation, encerrarMutation } = useAfastamentoMutations();

    const colaboradorLabel = useMemo(() => {
        const map = new Map(colaboradorOptions.options.map((option) => [option.value, option.label]));
        return (id: string) => map.get(id) ?? id;
    }, [colaboradorOptions.options]);

    const records = useMemo(() => afastamentosQuery.data ?? [], [afastamentosQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    const updateFilter = (name: keyof AfastamentosListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const registrar = async (values: AfastamentoFormValues) => {
        await runWithToast(async () => { await registrarMutation.mutateAsync(values); setFormVisible(false); }, { success: { summary: 'Afastamento registrado' }, error: { summary: 'Erro ao registrar afastamento' }, rethrow: true });
    };
    const encerrar = async () => {
        if (!encerrarAlvo) return;
        await runWithToast(async () => { await encerrarMutation.mutateAsync({ id: encerrarAlvo, values: { dataFimReal } }); setEncerrarAlvo(null); setDataFimReal(null); }, { success: { summary: 'Afastamento encerrado' }, error: { summary: 'Erro ao encerrar afastamento' }, rethrow: true });
    };

    return (
        <>
            <div className="flex flex-column md:flex-row gap-2 md:align-items-center mb-3">
                <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
                <Dropdown value={filters.status ?? null} options={statusAfastamentoFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
                <PermissionGuard permission="RH_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Registrar afastamento" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
            </div>
            {afastamentosQuery.error ? <ApiErrorPanel error={mapApiError(afastamentosQuery.error)} /> : null}
            <DataTableServer<AfastamentoResponse> value={visibleRecords} totalRecords={records.length} loading={afastamentosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum afastamento.">
                <Column header="Colaborador" body={(row: AfastamentoResponse) => colaboradorLabel(row.colaboradorId)} />
                <Column header="Tipo" body={(row: AfastamentoResponse) => tipoAfastamentoLabel(Number(row.tipo))} />
                <Column header="Início" body={(row: AfastamentoResponse) => formatDate(row.dataInicio)} />
                <Column header="Fim previsto" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: AfastamentoResponse) => formatDate(row.dataFimPrevista)} />
                <Column header="Status" body={(row: AfastamentoResponse) => <Tag value={statusAfastamentoLabel(Number(row.status))} severity={statusAfastamentoSeverity(Number(row.status)) ?? undefined} />} />
                <Column header="Ações" alignHeader="right" body={(row: AfastamentoResponse) => (
                    afastamentoPodeEncerrar(Number(row.status)) ? <DataTableActions actions={[{ key: 'encerrar', label: 'Encerrar', icon: 'pi pi-flag', permission: 'RH_GERENCIAR', onClick: () => { setEncerrarAlvo(row.id); setDataFimReal(null); } }]} /> : <span className="text-color-secondary">—</span>
                )} />
            </DataTableServer>
            <AfastamentoDialog visible={formVisible} loading={registrarMutation.isPending} colaboradorOptions={colaboradorOptions.options} colaboradorLoading={colaboradorOptions.isFetching} onHide={() => setFormVisible(false)} onSubmit={registrar} />
            <Dialog header="Encerrar afastamento" visible={Boolean(encerrarAlvo)} modal style={{ width: 'min(32rem, 96vw)' }} onHide={() => setEncerrarAlvo(null)} footer={
                <div className="flex justify-content-end gap-2">
                    <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={() => setEncerrarAlvo(null)} disabled={encerrarMutation.isPending} />
                    <Button type="button" label="Encerrar" icon="pi pi-check" loading={encerrarMutation.isPending} onClick={encerrar} />
                </div>
            }>
                <label htmlFor="afaFimReal" className="block font-medium mb-2">Data de fim real</label>
                <DateInput id="afaFimReal" value={dataFimReal} onChange={setDataFimReal} />
            </Dialog>
        </>
    );
};

export const AusenciasPage = () => {
    const { hasPermission } = usePermissions();

    if (!hasPermission('RH_CONSULTAR')) {
        return <UnauthorizedState description="O módulo RH exige a permissão RH_CONSULTAR." />;
    }

    return (
        <>
            <PageHeader title="Ausências" description="Férias (solicitação, aprovação e gozo) e afastamentos." />
            <TabView>
                <TabPanel header="Férias">
                    <FeriasTab />
                </TabPanel>
                <TabPanel header="Afastamentos">
                    <AfastamentosTab />
                </TabPanel>
            </TabView>
        </>
    );
};
