'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
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
import { useLotes, useLotesRecall, useRecallMutations, useRecalls } from '@/features/alimentar/hooks/useAlimentarResources';
import { RecallFormValues, RecallLoteResponse, RecallResponse, RecallsListQuery } from '@/features/alimentar/types/alimentar.types';
import { RecallFormDialog } from '@/features/alimentar/components/AlimentarDialogs';
import { gravidadeRecallFilterOptions, gravidadeRecallLabel, gravidadeRecallSeverity, loteAtivoParaRecall, recallAberto, statusLoteLabel, statusRecallFilterOptions, statusRecallLabel, statusRecallSeverity } from '@/features/alimentar/components/alimentarLabels';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

export const RecallsPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<RecallsListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loteParaAdicionar, setLoteParaAdicionar] = useState<string | null>(null);
    const [cancelarVisible, setCancelarVisible] = useState(false);

    const recallsQuery = useRecalls(filters, hasPermission('ALIMENTAR_CONSULTAR'));
    const { abrirMutation, adicionarLoteMutation, encerrarMutation, cancelarMutation } = useRecallMutations();

    const selectedRecall = useMemo(() => (recallsQuery.data ?? []).find((recall) => recall.id === selectedId) ?? null, [recallsQuery.data, selectedId]);
    const lotesRecallQuery = useLotesRecall(selectedId);
    const lotesDisponiveisQuery = useLotes({ empresaId: selectedRecall?.empresaId ?? null, filialId: selectedRecall?.filialId ?? null }, null, Boolean(selectedRecall && recallAberto(Number(selectedRecall.status))));
    const loteOptions = useMemo(() => (lotesDisponiveisQuery.data ?? []).filter((lote) => loteAtivoParaRecall(Number(lote.status))).map((lote) => ({ label: `${lote.numeroLote} — venc. ${formatDate(lote.dataValidade)}`, value: lote.id })), [lotesDisponiveisQuery.data]);

    const records = useMemo(() => recallsQuery.data ?? [], [recallsQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('ALIMENTAR_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Alimentar exige a permissão ALIMENTAR_CONSULTAR." />;
    }

    const updateFilter = (name: keyof RecallsListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const abrir = async (values: RecallFormValues) => {
        await runWithToast(async () => { const criado = await abrirMutation.mutateAsync(values); setFormVisible(false); setSelectedId(criado.id); }, { success: { summary: 'Recall aberto' }, error: { summary: 'Erro ao abrir recall' }, rethrow: true });
    };
    const adicionarLote = async () => {
        if (!selectedId || !loteParaAdicionar) return;
        await runWithToast(async () => { await adicionarLoteMutation.mutateAsync({ id: selectedId, loteId: loteParaAdicionar }); setLoteParaAdicionar(null); }, { success: { summary: 'Lote adicionado', detail: 'Saldo do lote bloqueado (liberação em Estoque avançado).' }, error: { summary: 'Erro ao adicionar lote' }, rethrow: true });
    };
    const encerrar = () => selectedId && runWithToast(() => encerrarMutation.mutateAsync(selectedId), { success: { summary: 'Recall encerrado' }, error: { summary: 'Erro ao encerrar recall' } });
    const cancelar = async (motivo: string) => {
        if (!selectedId) return;
        await runWithToast(async () => { await cancelarMutation.mutateAsync({ id: selectedId, motivo }); setCancelarVisible(false); }, { success: { summary: 'Recall cancelado' }, error: { summary: 'Erro ao cancelar recall' }, rethrow: true });
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.gravidade ?? null} options={gravidadeRecallFilterOptions} onChange={(event) => updateFilter('gravidade', event.value)} aria-label="Filtrar por gravidade" />
            <Dropdown value={filters.status ?? null} options={statusRecallFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <PermissionGuard permission="ALIMENTAR_RECALL_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Abrir recall" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    const aberto = selectedRecall ? recallAberto(Number(selectedRecall.status)) : false;

    return (
        <>
            <PageHeader title="Recalls" description="Recall com bloqueio de estoque por lote. Adicionar lote bloqueia o saldo." actions={headerActions} />
            <Card>
                {recallsQuery.error ? <ApiErrorPanel error={mapApiError(recallsQuery.error)} /> : null}
                <DataTableServer<RecallResponse> value={visibleRecords} totalRecords={records.length} loading={recallsQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum recall encontrado.">
                    <Column header="Aberto em" body={(row: RecallResponse) => formatDate(row.abertoEm)} />
                    <Column field="motivo" header="Motivo" />
                    <Column header="Gravidade" body={(row: RecallResponse) => <Tag value={gravidadeRecallLabel(Number(row.gravidade))} severity={gravidadeRecallSeverity(Number(row.gravidade)) ?? undefined} />} />
                    <Column header="Lotes" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: RecallResponse) => row.totalLotes ?? '—'} />
                    <Column header="Status" body={(row: RecallResponse) => <Tag value={statusRecallLabel(Number(row.status))} severity={statusRecallSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: RecallResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'ALIMENTAR_CONSULTAR', onClick: () => setSelectedId(row.id) }]} />} />
                </DataTableServer>
                {!recallsQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum recall" description="Abra um recall ou ajuste os filtros." /> : null}
            </Card>

            {selectedRecall ? (
                <Card title={`Recall: ${selectedRecall.motivo}`} className="mt-3">
                    <div className="flex gap-2 flex-wrap mb-3 align-items-center">
                        <Tag value={statusRecallLabel(Number(selectedRecall.status))} severity={statusRecallSeverity(Number(selectedRecall.status)) ?? undefined} />
                        <Tag value={gravidadeRecallLabel(Number(selectedRecall.gravidade))} severity={gravidadeRecallSeverity(Number(selectedRecall.gravidade)) ?? undefined} />
                        <span className="text-color-secondary">Aberto em {formatDate(selectedRecall.abertoEm)}</span>
                        <div className="flex-1" />
                        {aberto ? <PermissionGuard permission="ALIMENTAR_RECALL_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Encerrar" icon="pi pi-check" size="small" severity="success" disabled={disabled} loading={encerrarMutation.isPending} onClick={encerrar} />}</PermissionGuard> : null}
                        {aberto ? <PermissionGuard permission="ALIMENTAR_RECALL_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Cancelar" icon="pi pi-ban" size="small" severity="danger" outlined disabled={disabled} onClick={() => setCancelarVisible(true)} />}</PermissionGuard> : null}
                    </div>

                    {selectedRecall.descricao ? <Message className="w-full mb-3" severity="info" text={selectedRecall.descricao} /> : null}

                    {aberto ? (
                        <div className="flex flex-column md:flex-row gap-2 md:align-items-end mb-3">
                            <div className="flex-1">
                                <label htmlFor="recallAddLote" className="block font-medium mb-1">Adicionar lote ao recall</label>
                                <EntitySelect id="recallAddLote" entityName="lote" value={loteParaAdicionar} options={loteOptions} loading={lotesDisponiveisQuery.isFetching} onChange={setLoteParaAdicionar} />
                            </div>
                            <PermissionGuard permission="ALIMENTAR_RECALL_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Adicionar lote" icon="pi pi-plus" loading={adicionarLoteMutation.isPending} disabled={disabled || !loteParaAdicionar} onClick={adicionarLote} />}</PermissionGuard>
                        </div>
                    ) : null}

                    {lotesRecallQuery.error ? <ApiErrorPanel error={mapApiError(lotesRecallQuery.error)} /> : null}
                    <DataTable value={lotesRecallQuery.data ?? []} dataKey="loteId" loading={lotesRecallQuery.isFetching} emptyMessage="Nenhum lote no recall." responsiveLayout="scroll" stripedRows size="small">
                        <Column field="numeroLote" header="Lote" />
                        <Column header="Validade" body={(row: RecallLoteResponse) => formatDate(row.dataValidade)} />
                        <Column header="Qtd. bloqueada" body={(row: RecallLoteResponse) => row.quantidadeAtual.toLocaleString('pt-BR')} />
                        <Column header="Status" body={(row: RecallLoteResponse) => <Tag value={statusLoteLabel(Number(row.status))} severity={Number(row.status) === 2 ? 'danger' : undefined} />} />
                    </DataTable>
                </Card>
            ) : null}

            <RecallFormDialog visible={formVisible} loading={abrirMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={abrir} />
            <ReasonDialog visible={cancelarVisible} title="Cancelar recall" confirmLabel="Cancelar recall" loading={cancelarMutation.isPending} onHide={() => setCancelarVisible(false)} onConfirm={cancelar} />
        </>
    );
};
