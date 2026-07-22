'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { classNames } from 'primereact/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { DateInput } from '@/components/forms/DateInput';
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
import { useMotoristas, useVeiculos, useViagemMutations, useViagens } from '@/features/frota/hooks/useFrotaResources';
import { EncerrarViagemFormValues, StatusVeiculo, ViagemFormValues, ViagemResponse, ViagensListQuery } from '@/features/frota/types/frota.types';
import { statusViagemFilterOptions, statusViagemLabel, statusViagemSeverity, viagemEmAndamento } from '@/features/frota/components/frotaLabels';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');
const formatOdometro = (value?: number | null) => (value == null ? '—' : value.toLocaleString('pt-BR'));

const initialViagem = (): ViagemFormValues => ({ empresaId: '', filialId: null, veiculoId: '', motoristaId: '', origem: '', destino: '', dataSaida: null, odometroSaida: 0 });

const IniciarViagemDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: ViagemFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<ViagemFormValues>(initialViagem);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialViagem());
            setErrors({});
        }
    }, [visible]);

    const scope = { empresaId: values.empresaId || null, filialId: values.filialId || null };
    const veiculosQuery = useVeiculos({ ...scope, status: StatusVeiculo.Ativo }, Boolean(values.empresaId));
    const motoristasQuery = useMotoristas(scope, Boolean(values.empresaId));
    const veiculoOptions = useMemo(() => (veiculosQuery.data ?? []).map((veiculo) => ({ label: `${veiculo.placa} - ${veiculo.modelo}`, value: veiculo.id })), [veiculosQuery.data]);
    const motoristaOptions = useMemo(() => (motoristasQuery.data ?? []).map((motorista) => ({ label: motorista.nome, value: motorista.id })), [motoristasQuery.data]);

    const update = (name: keyof ViagemFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const next: Record<string, string> = {};
        if (!values.empresaId) next.empresaId = 'Selecione a empresa.';
        if (!values.veiculoId) next.veiculoId = 'Selecione o veículo.';
        if (!values.motoristaId) next.motoristaId = 'Selecione o motorista.';
        if (!values.origem.trim()) next.origem = 'Informe a origem.';
        if (!values.destino.trim()) next.destino = 'Informe o destino.';
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Iniciar viagem" icon="pi pi-check" loading={loading} onClick={submit} />
        </div>
    );

    return (
        <Dialog header="Iniciar viagem" visible={visible} modal style={{ width: 'min(52rem, 98vw)' }} footer={footer} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value ?? '')} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-6">
                    <label htmlFor="viagemVeiculo" className="font-medium">Veículo *</label>
                    <EntitySelect id="viagemVeiculo" entityName="veículo" value={values.veiculoId || null} options={veiculoOptions} loading={veiculosQuery.isFetching} onChange={(value) => update('veiculoId', value ?? '')} />
                    <FieldError message={errors.veiculoId} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="viagemMotorista" className="font-medium">Motorista *</label>
                    <EntitySelect id="viagemMotorista" entityName="motorista" value={values.motoristaId || null} options={motoristaOptions} loading={motoristasQuery.isFetching} onChange={(value) => update('motoristaId', value ?? '')} />
                    <FieldError message={errors.motoristaId} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="viagemOrigem" className="font-medium">Origem *</label>
                    <InputText id="viagemOrigem" value={values.origem} className={invalid('origem')} onChange={(event) => update('origem', event.target.value)} />
                    <FieldError message={errors.origem} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="viagemDestino" className="font-medium">Destino *</label>
                    <InputText id="viagemDestino" value={values.destino} className={invalid('destino')} onChange={(event) => update('destino', event.target.value)} />
                    <FieldError message={errors.destino} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="viagemDataSaida" className="font-medium">Data de saída</label>
                    <DateInput id="viagemDataSaida" value={values.dataSaida ?? null} onChange={(value) => update('dataSaida', value)} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="viagemOdometroSaida" className="font-medium">Odômetro de saída *</label>
                    <QuantityInput id="viagemOdometroSaida" value={values.odometroSaida} onChange={(value) => update('odometroSaida', value ?? 0)} />
                    <FieldError message={errors.odometroSaida} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const EncerrarViagemDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: EncerrarViagemFormValues) => Promise<void> }) => {
    const [dataChegada, setDataChegada] = useState<Date | null>(null);
    const [odometroChegada, setOdometroChegada] = useState<number | null>(0);
    const [observacao, setObservacao] = useState('');
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setDataChegada(null);
            setOdometroChegada(0);
            setObservacao('');
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (odometroChegada == null || odometroChegada <= 0) {
            setErro('Informe o odômetro de chegada.');
            return;
        }
        await onSubmit({ dataChegada, odometroChegada: odometroChegada ?? 0, observacao: observacao.trim() || null });
    };

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Encerrar viagem" icon="pi pi-check" loading={loading} onClick={confirmar} />
        </div>
    );

    return (
        <Dialog header="Encerrar viagem" visible={visible} modal style={{ width: 'min(40rem, 96vw)' }} footer={footer} onHide={onHide}>
            <FormGrid>
                <div className="field col-6">
                    <label htmlFor="encData" className="font-medium">Data de chegada</label>
                    <DateInput id="encData" value={dataChegada} onChange={setDataChegada} />
                </div>
                <div className="field col-6">
                    <label htmlFor="encOdometro" className="font-medium">Odômetro de chegada *</label>
                    <QuantityInput id="encOdometro" value={odometroChegada} onChange={(value) => { setOdometroChegada(value); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
                <div className="field col-12">
                    <label htmlFor="encObservacao" className="font-medium">Observação</label>
                    <InputTextarea id="encObservacao" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const ViagensPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<ViagensListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [dialog, setDialog] = useState<'iniciar' | 'encerrar' | 'cancelar' | null>(null);
    const [viagemAlvo, setViagemAlvo] = useState<string | null>(null);

    const viagensQuery = useViagens(filters, hasPermission('FROTA_CONSULTAR'));
    const veiculosQuery = useVeiculos({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null }, hasPermission('FROTA_CONSULTAR'));
    const motoristasQuery = useMotoristas({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null }, hasPermission('FROTA_CONSULTAR'));
    const { iniciarMutation, encerrarMutation, cancelarMutation } = useViagemMutations();

    const veiculoLabel = useMemo(() => {
        const map = new Map((veiculosQuery.data ?? []).map((veiculo) => [veiculo.id, `${veiculo.placa}`]));
        return (id: string) => map.get(id) ?? id;
    }, [veiculosQuery.data]);
    const motoristaLabel = useMemo(() => {
        const map = new Map((motoristasQuery.data ?? []).map((motorista) => [motorista.id, motorista.nome]));
        return (id: string) => map.get(id) ?? id;
    }, [motoristasQuery.data]);

    const records = useMemo(() => viagensQuery.data ?? [], [viagensQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('FROTA_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de Frota exige a permissão FROTA_CONSULTAR." />;
    }

    const updateFilter = (name: keyof ViagensListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const close = () => {
        setDialog(null);
        setViagemAlvo(null);
    };

    const iniciar = async (values: ViagemFormValues) => {
        await runWithToast(async () => { await iniciarMutation.mutateAsync(values); close(); }, { success: { summary: 'Viagem iniciada' }, error: { summary: 'Erro ao iniciar viagem' }, rethrow: true });
    };
    const encerrar = async (values: EncerrarViagemFormValues) => {
        if (!viagemAlvo) return;
        await runWithToast(async () => { await encerrarMutation.mutateAsync({ id: viagemAlvo, values }); close(); }, { success: { summary: 'Viagem encerrada' }, error: { summary: 'Erro ao encerrar viagem' }, rethrow: true });
    };
    const cancelar = async (motivo: string) => {
        if (!viagemAlvo) return;
        await runWithToast(async () => { await cancelarMutation.mutateAsync({ id: viagemAlvo, motivo }); close(); }, { success: { summary: 'Viagem cancelada' }, error: { summary: 'Erro ao cancelar viagem' }, rethrow: true });
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusViagemFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <PermissionGuard permission="FROTA_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Nova viagem" icon="pi pi-plus" disabled={disabled} onClick={() => setDialog('iniciar')} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Viagens" description="Controle de viagens com odômetro de saída e chegada." actions={headerActions} />
            <Card>
                {viagensQuery.error ? <ApiErrorPanel error={mapApiError(viagensQuery.error)} /> : null}
                <DataTableServer<ViagemResponse> value={visibleRecords} totalRecords={records.length} loading={viagensQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma viagem encontrada.">
                    <Column header="Veículo" body={(row: ViagemResponse) => veiculoLabel(row.veiculoId)} />
                    <Column header="Motorista" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: ViagemResponse) => motoristaLabel(row.motoristaId)} />
                    <Column header="Trajeto" body={(row: ViagemResponse) => `${row.origem} → ${row.destino}`} />
                    <Column header="Saída" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: ViagemResponse) => formatDate(row.dataSaida)} />
                    <Column header="Odômetro" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: ViagemResponse) => `${formatOdometro(row.odometroSaida)} → ${formatOdometro(row.odometroChegada)}`} />
                    <Column header="Status" body={(row: ViagemResponse) => <Tag value={statusViagemLabel(Number(row.status))} severity={statusViagemSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: ViagemResponse) => (
                        viagemEmAndamento(Number(row.status)) ? (
                            <DataTableActions actions={[
                                { key: 'encerrar', label: 'Encerrar', icon: 'pi pi-flag', permission: 'FROTA_GERENCIAR', onClick: () => { setViagemAlvo(row.id); setDialog('encerrar'); } },
                                { key: 'cancelar', label: 'Cancelar', icon: 'pi pi-ban', severity: 'danger', permission: 'FROTA_GERENCIAR', onClick: () => { setViagemAlvo(row.id); setDialog('cancelar'); } }
                            ]} />
                        ) : <span className="text-color-secondary">—</span>
                    )} />
                </DataTableServer>
                {!viagensQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma viagem" description="Inicie uma viagem ou ajuste os filtros." /> : null}
            </Card>
            <IniciarViagemDialog visible={dialog === 'iniciar'} loading={iniciarMutation.isPending} onHide={close} onSubmit={iniciar} />
            <EncerrarViagemDialog visible={dialog === 'encerrar'} loading={encerrarMutation.isPending} onHide={close} onSubmit={encerrar} />
            <ReasonDialog visible={dialog === 'cancelar'} title="Cancelar viagem" confirmLabel="Cancelar viagem" loading={cancelarMutation.isPending} onHide={close} onConfirm={cancelar} />
        </>
    );
};
