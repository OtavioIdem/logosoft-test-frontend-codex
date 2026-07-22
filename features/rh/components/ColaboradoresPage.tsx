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
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { DateInput } from '@/components/forms/DateInput';
import { SearchInput } from '@/components/forms/SearchInput';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useColaboradorMutations, useColaboradores } from '@/features/rh/hooks/useRhResources';
import { ColaboradorFormValues, ColaboradorResponse, ColaboradoresListQuery, DesligarColaboradorFormValues } from '@/features/rh/types/rh.types';
import { ColaboradorFormDialog } from '@/features/rh/components/RhDialogs';
import { colaboradorAtivo, regimeLabel, statusColaboradorFilterOptions, statusColaboradorLabel, statusColaboradorSeverity } from '@/features/rh/components/rhLabels';

const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const filterLocal = (records: ColaboradorResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.matricula} ${record.nome} ${record.cpf}`.toLowerCase().includes(normalized));
};

const DesligarDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: DesligarColaboradorFormValues) => Promise<void> }) => {
    const [dataDemissao, setDataDemissao] = useState<Date | null>(null);
    const [motivo, setMotivo] = useState('');
    const [erros, setErros] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setDataDemissao(null);
            setMotivo('');
            setErros({});
        }
    }, [visible]);

    const confirmar = async () => {
        const next: Record<string, string> = {};
        if (!dataDemissao) next.dataDemissao = 'Informe a data de demissão.';
        if (!motivo.trim()) next.motivo = 'Informe o motivo.';
        setErros(next);
        if (Object.keys(next).length > 0) return;
        await onSubmit({ dataDemissao, motivo });
    };

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Desligar" icon="pi pi-user-minus" severity="danger" loading={loading} onClick={confirmar} />
        </div>
    );

    return (
        <Dialog header="Desligar colaborador" visible={visible} modal style={{ width: 'min(38rem, 96vw)' }} footer={footer} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-6">
                    <label htmlFor="desData" className="font-medium">Data de demissão *</label>
                    <DateInput id="desData" value={dataDemissao} onChange={(value) => { setDataDemissao(value); setErros((c) => ({ ...c, dataDemissao: '' })); }} />
                    <FieldError message={erros.dataDemissao} />
                </div>
                <div className="field col-12">
                    <label htmlFor="desMotivo" className="font-medium">Motivo *</label>
                    <InputTextarea id="desMotivo" value={motivo} rows={3} autoResize className={classNames({ 'p-invalid': erros.motivo })} onChange={(event) => { setMotivo(event.target.value); setErros((c) => ({ ...c, motivo: '' })); }} />
                    <FieldError message={erros.motivo} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const ColaboradoresPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<ColaboradoresListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [admitirVisible, setAdmitirVisible] = useState(false);
    const [desligarAlvo, setDesligarAlvo] = useState<string | null>(null);

    const colaboradoresQuery = useColaboradores(filters, hasPermission('RH_CONSULTAR'));
    const { admitirMutation, desligarMutation } = useColaboradorMutations();

    const records = useMemo(() => filterLocal(colaboradoresQuery.data ?? [], localSearch), [colaboradoresQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('RH_CONSULTAR')) {
        return <UnauthorizedState description="O módulo RH exige a permissão RH_CONSULTAR." />;
    }

    const updateFilter = (name: keyof ColaboradoresListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const admitir = async (values: ColaboradorFormValues) => {
        await runWithToast(async () => { await admitirMutation.mutateAsync(values); setAdmitirVisible(false); }, { success: { summary: 'Colaborador admitido', detail: `${values.nome} adicionado.` }, error: { summary: 'Erro ao admitir colaborador' }, rethrow: true });
    };
    const desligar = async (values: DesligarColaboradorFormValues) => {
        if (!desligarAlvo) return;
        await runWithToast(async () => { await desligarMutation.mutateAsync({ id: desligarAlvo, values }); setDesligarAlvo(null); }, { success: { summary: 'Colaborador desligado' }, error: { summary: 'Erro ao desligar colaborador' }, rethrow: true });
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusColaboradorFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <SearchInput ariaLabel="Buscar colaborador" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="RH_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Admitir" icon="pi pi-user-plus" disabled={disabled} onClick={() => setAdmitirVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Colaboradores" description="Admissão, dados contratuais e desligamento (status reflete férias/afastamento)." actions={headerActions} />
            <Card>
                {colaboradoresQuery.error ? <ApiErrorPanel error={mapApiError(colaboradoresQuery.error)} /> : null}
                <DataTableServer<ColaboradorResponse> value={visibleRecords} totalRecords={records.length} loading={colaboradoresQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum colaborador encontrado.">
                    <Column field="matricula" header="Matrícula" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" />
                    <Column field="nome" header="Nome" />
                    <Column header="Regime" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: ColaboradorResponse) => regimeLabel(Number(row.regime))} />
                    <Column header="Salário base" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: ColaboradorResponse) => formatMoney(row.salarioBase)} />
                    <Column header="Status" body={(row: ColaboradorResponse) => <Tag value={statusColaboradorLabel(Number(row.status))} severity={statusColaboradorSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: ColaboradorResponse) => (
                        colaboradorAtivo(Number(row.status)) ? <DataTableActions actions={[{ key: 'desligar', label: 'Desligar', icon: 'pi pi-user-minus', severity: 'danger', permission: 'RH_GERENCIAR', onClick: () => setDesligarAlvo(row.id) }]} /> : <span className="text-color-secondary">—</span>
                    )} />
                </DataTableServer>
                {!colaboradoresQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum colaborador" description="Admita um colaborador ou ajuste os filtros." /> : null}
            </Card>
            <ColaboradorFormDialog visible={admitirVisible} loading={admitirMutation.isPending} onHide={() => setAdmitirVisible(false)} onSubmit={admitir} />
            <DesligarDialog visible={Boolean(desligarAlvo)} loading={desligarMutation.isPending} onHide={() => setDesligarAlvo(null)} onSubmit={desligar} />
        </>
    );
};
