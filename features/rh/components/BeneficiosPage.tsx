'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { TabPanel, TabView } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { DateInput } from '@/components/forms/DateInput';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useBeneficioMutations, useBeneficios, useColaboradorOptions, useConcessaoMutations, useConcessoes } from '@/features/rh/hooks/useRhResources';
import { BeneficioFormValues, BeneficioResponse, BeneficiosListQuery, ConcessaoBeneficioResponse, ConcessaoFormValues, ConcessoesListQuery } from '@/features/rh/types/rh.types';
import { BeneficioFormDialog, ConcessaoDialog } from '@/features/rh/components/RhDialogs';
import { concessaoPodeEncerrar, statusConcessaoLabel, statusConcessaoSeverity, tipoBeneficioLabel } from '@/features/rh/components/rhLabels';

const formatMoney = (value?: number | null) => (value == null ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

const BeneficiosTab = () => {
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<BeneficiosListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);

    const beneficiosQuery = useBeneficios(filters);
    const { criarMutation } = useBeneficioMutations();

    const records = useMemo(() => beneficiosQuery.data ?? [], [beneficiosQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    const updateFilter = (name: keyof BeneficiosListQuery, value: string | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const criar = async (values: BeneficioFormValues) => {
        await runWithToast(async () => { await criarMutation.mutateAsync(values); setFormVisible(false); }, { success: { summary: 'Benefício criado' }, error: { summary: 'Erro ao criar benefício' }, rethrow: true });
    };

    return (
        <>
            <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center mb-3">
                <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
                <PermissionGuard permission="RH_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo benefício" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
            </div>
            {beneficiosQuery.error ? <ApiErrorPanel error={mapApiError(beneficiosQuery.error)} /> : null}
            <DataTableServer<BeneficioResponse> value={visibleRecords} totalRecords={records.length} loading={beneficiosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum benefício.">
                <Column field="nome" header="Nome" />
                <Column header="Tipo" body={(row: BeneficioResponse) => tipoBeneficioLabel(Number(row.tipo))} />
                <Column header="Valor padrão" body={(row: BeneficioResponse) => formatMoney(row.valor)} />
                <Column header="Situação" body={(row: BeneficioResponse) => <Tag value={row.ativo ? 'Ativo' : 'Inativo'} severity={row.ativo ? 'success' : undefined} />} />
            </DataTableServer>
            <BeneficioFormDialog visible={formVisible} loading={criarMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={criar} />
        </>
    );
};

const ConcessoesTab = () => {
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<ConcessoesListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [encerrarAlvo, setEncerrarAlvo] = useState<string | null>(null);
    const [dataFim, setDataFim] = useState<Date | null>(null);

    const concessoesQuery = useConcessoes(filters);
    const colaboradorOptions = useColaboradorOptions(filters.empresaId ?? null, filters.filialId ?? null);
    const beneficiosQuery = useBeneficios({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null });
    const { concederMutation, encerrarMutation } = useConcessaoMutations();

    const beneficioOptions = useMemo(() => (beneficiosQuery.data ?? []).map((beneficio) => ({ label: beneficio.nome, value: beneficio.id })), [beneficiosQuery.data]);
    const colaboradorLabel = useMemo(() => {
        const map = new Map(colaboradorOptions.options.map((option) => [option.value, option.label]));
        return (id: string) => map.get(id) ?? id;
    }, [colaboradorOptions.options]);
    const beneficioLabel = useMemo(() => {
        const map = new Map(beneficioOptions.map((option) => [option.value, option.label]));
        return (id: string) => map.get(id) ?? id;
    }, [beneficioOptions]);

    const records = useMemo(() => concessoesQuery.data ?? [], [concessoesQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    const updateFilter = (name: keyof ConcessoesListQuery, value: string | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const conceder = async (values: ConcessaoFormValues) => {
        await runWithToast(async () => { await concederMutation.mutateAsync(values); setFormVisible(false); }, { success: { summary: 'Benefício concedido' }, error: { summary: 'Erro ao conceder benefício' }, rethrow: true });
    };
    const encerrar = async () => {
        if (!encerrarAlvo) return;
        await runWithToast(async () => { await encerrarMutation.mutateAsync({ id: encerrarAlvo, values: { dataFim } }); setEncerrarAlvo(null); setDataFim(null); }, { success: { summary: 'Concessão encerrada' }, error: { summary: 'Erro ao encerrar concessão' }, rethrow: true });
    };

    return (
        <>
            <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center mb-3">
                <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
                <PermissionGuard permission="RH_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Conceder benefício" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
            </div>
            {concessoesQuery.error ? <ApiErrorPanel error={mapApiError(concessoesQuery.error)} /> : null}
            <DataTableServer<ConcessaoBeneficioResponse> value={visibleRecords} totalRecords={records.length} loading={concessoesQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma concessão.">
                <Column header="Colaborador" body={(row: ConcessaoBeneficioResponse) => colaboradorLabel(row.colaboradorId)} />
                <Column header="Benefício" body={(row: ConcessaoBeneficioResponse) => beneficioLabel(row.beneficioId)} />
                <Column header="Início" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: ConcessaoBeneficioResponse) => formatDate(row.dataInicio)} />
                <Column header="Valor" body={(row: ConcessaoBeneficioResponse) => formatMoney(row.valor)} />
                <Column header="Status" body={(row: ConcessaoBeneficioResponse) => <Tag value={statusConcessaoLabel(Number(row.status))} severity={statusConcessaoSeverity(Number(row.status)) ?? undefined} />} />
                <Column header="Ações" alignHeader="right" body={(row: ConcessaoBeneficioResponse) => (
                    concessaoPodeEncerrar(Number(row.status)) ? <DataTableActions actions={[{ key: 'encerrar', label: 'Encerrar', icon: 'pi pi-flag', permission: 'RH_GERENCIAR', onClick: () => { setEncerrarAlvo(row.id); setDataFim(null); } }]} /> : <span className="text-color-secondary">—</span>
                )} />
            </DataTableServer>
            <ConcessaoDialog visible={formVisible} loading={concederMutation.isPending} colaboradorOptions={colaboradorOptions.options} colaboradorLoading={colaboradorOptions.isFetching} beneficioOptions={beneficioOptions} beneficioLoading={beneficiosQuery.isFetching} onHide={() => setFormVisible(false)} onSubmit={conceder} />
            <Dialog header="Encerrar concessão" visible={Boolean(encerrarAlvo)} modal style={{ width: 'min(32rem, 96vw)' }} onHide={() => setEncerrarAlvo(null)} footer={
                <div className="flex justify-content-end gap-2">
                    <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={() => setEncerrarAlvo(null)} disabled={encerrarMutation.isPending} />
                    <Button type="button" label="Encerrar" icon="pi pi-check" loading={encerrarMutation.isPending} onClick={encerrar} />
                </div>
            }>
                <label htmlFor="concFim" className="block font-medium mb-2">Data de fim</label>
                <DateInput id="concFim" value={dataFim} onChange={setDataFim} />
            </Dialog>
        </>
    );
};

export const BeneficiosPage = () => {
    const { hasPermission } = usePermissions();

    if (!hasPermission('RH_CONSULTAR')) {
        return <UnauthorizedState description="O módulo RH exige a permissão RH_CONSULTAR." />;
    }

    return (
        <>
            <PageHeader title="Benefícios" description="Catálogo de benefícios e concessões por colaborador." />
            <TabView>
                <TabPanel header="Benefícios">
                    <BeneficiosTab />
                </TabPanel>
                <TabPanel header="Concessões">
                    <ConcessoesTab />
                </TabPanel>
            </TabView>
        </>
    );
};
