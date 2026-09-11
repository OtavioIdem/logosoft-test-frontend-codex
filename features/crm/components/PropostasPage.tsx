'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { EntitySelect } from '@/components/forms/EntitySelect';
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
import { useOportunidades, usePropostas, usePropostaMutations } from '@/features/crm/hooks/useCrmResources';
import { PropostaFormValues, PropostaResponse, PropostasListQuery } from '@/features/crm/types/crm.types';
import { PropostaFormDialog } from '@/features/crm/components/CrmDialogs';
import { oportunidadeAberta, propostaPodeDecidir, statusPropostaFilterOptions, statusPropostaLabel, statusPropostaSeverity } from '@/features/crm/components/crmLabels';
import { formatMoney } from '@/lib/formatters/money';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

export const PropostasPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<PropostasListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [oportunidadeParaProposta, setOportunidadeParaProposta] = useState<string | null>(null);
    const [formVisible, setFormVisible] = useState(false);
    const [recusarAlvo, setRecusarAlvo] = useState<string | null>(null);

    const propostasQuery = usePropostas(filters, hasPermission('CRM_CONSULTAR'));
    const oportunidadesQuery = useOportunidades({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null }, hasPermission('CRM_CONSULTAR'));
    const { criarMutation, aceitarMutation, recusarMutation } = usePropostaMutations();

    const oportunidadesAbertas = useMemo(() => (oportunidadesQuery.data ?? []).filter((item) => oportunidadeAberta(Number(item.status))), [oportunidadesQuery.data]);
    const oportunidadeOptions = useMemo(() => oportunidadesAbertas.map((item) => ({ label: item.titulo, value: item.id })), [oportunidadesAbertas]);
    const oportunidadeSelecionada = useMemo(() => oportunidadesAbertas.find((item) => item.id === oportunidadeParaProposta) ?? null, [oportunidadesAbertas, oportunidadeParaProposta]);
    const oportunidadeTitulo = useMemo(() => {
        const map = new Map((oportunidadesQuery.data ?? []).map((item) => [item.id, item.titulo]));
        return (id: string) => map.get(id) ?? id;
    }, [oportunidadesQuery.data]);

    const records = useMemo(() => propostasQuery.data ?? [], [propostasQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('CRM_CONSULTAR')) {
        return <UnauthorizedState description="O módulo CRM exige a permissão CRM_CONSULTAR." />;
    }

    const updateFilter = (name: keyof PropostasListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const criar = async (values: PropostaFormValues) => {
        await runWithToast(async () => { await criarMutation.mutateAsync(values); setFormVisible(false); setOportunidadeParaProposta(null); }, { success: { summary: 'Proposta criada' }, error: { summary: 'Erro ao criar proposta' }, rethrow: true });
    };
    const aceitar = (id: string) => runWithToast(() => aceitarMutation.mutateAsync(id), { success: { summary: 'Proposta aceita' }, error: { summary: 'Erro ao aceitar proposta' } });
    const recusar = async (motivo: string) => {
        if (!recusarAlvo) return;
        await runWithToast(async () => { await recusarMutation.mutateAsync({ id: recusarAlvo, motivo }); setRecusarAlvo(null); }, { success: { summary: 'Proposta recusada' }, error: { summary: 'Erro ao recusar proposta' }, rethrow: true });
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusPropostaFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
        </div>
    );

    return (
        <>
            <PageHeader title="Propostas" description="Propostas comerciais por oportunidade (aceitar/recusar)." actions={headerActions} />
            <Card className="mb-3">
                <div className="flex flex-column md:flex-row gap-2 md:align-items-end">
                    <div className="flex-1">
                        <label htmlFor="propOportunidade" className="block font-medium mb-1">Nova proposta para oportunidade</label>
                        <EntitySelect id="propOportunidade" entityName="oportunidade" value={oportunidadeParaProposta} options={oportunidadeOptions} loading={oportunidadesQuery.isFetching} onChange={setOportunidadeParaProposta} />
                    </div>
                    <PermissionGuard permission="CRM_PROPOSTAS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Criar proposta" icon="pi pi-plus" disabled={disabled || !oportunidadeSelecionada} onClick={() => setFormVisible(true)} />}</PermissionGuard>
                </div>
            </Card>
            <Card>
                {propostasQuery.error ? <ApiErrorPanel error={mapApiError(propostasQuery.error)} /> : null}
                <DataTableServer<PropostaResponse> value={visibleRecords} totalRecords={records.length} loading={propostasQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma proposta encontrada.">
                    <Column header="Número" body={(row: PropostaResponse) => row.numero || row.id.slice(0, 8)} />
                    <Column header="Oportunidade" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: PropostaResponse) => oportunidadeTitulo(row.oportunidadeId)} />
                    <Column header="Validade" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: PropostaResponse) => formatDate(row.dataValidade)} />
                    <Column header="Total" body={(row: PropostaResponse) => formatMoney(row.valorTotal)} />
                    <Column header="Status" body={(row: PropostaResponse) => <Tag value={statusPropostaLabel(Number(row.status))} severity={statusPropostaSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: PropostaResponse) => {
                        if (!propostaPodeDecidir(Number(row.status))) return <span className="text-color-secondary">—</span>;
                        return <DataTableActions actions={[
                            { key: 'aceitar', label: 'Aceitar', icon: 'pi pi-check', permission: 'CRM_PROPOSTAS_GERENCIAR', onClick: () => aceitar(row.id) },
                            { key: 'recusar', label: 'Recusar', icon: 'pi pi-times', severity: 'danger', permission: 'CRM_PROPOSTAS_GERENCIAR', onClick: () => setRecusarAlvo(row.id) }
                        ]} />;
                    }} />
                </DataTableServer>
                {!propostasQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma proposta" description="Crie uma proposta a partir de uma oportunidade aberta." /> : null}
            </Card>

            <PropostaFormDialog visible={formVisible && Boolean(oportunidadeSelecionada)} loading={criarMutation.isPending} oportunidadeId={oportunidadeParaProposta ?? ''} empresaId={oportunidadeSelecionada?.empresaId ?? null} filialId={oportunidadeSelecionada?.filialId ?? null} onHide={() => setFormVisible(false)} onSubmit={criar} />
            <ReasonDialog visible={Boolean(recusarAlvo)} title="Recusar proposta" confirmLabel="Recusar" loading={recusarMutation.isPending} onHide={() => setRecusarAlvo(null)} onConfirm={recusar} />
        </>
    );
};
