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
import { useAmbiente, useDeploy, useDeploys, useDeployMutations, useMigracoes } from '@/features/deploy/hooks/useDeployResources';
import { CriarDeployFormValues, DeployResumoResponse, DeploysListQuery, ItemChecklistDeployResponse, ItemChecklistFormValues, ResultadoChecklistFormValues } from '@/features/deploy/types/deploy.types';
import { CriarDeployDialog, ItemChecklistDialog, ResultadoChecklistDialog } from '@/features/deploy/components/DeployDialogs';
import {
    deployEmAndamento,
    deployPodeReverter,
    itemChecklistPendente,
    statusDeployFilterOptions,
    statusDeployLabel,
    statusDeploySeverity,
    statusItemChecklistLabel,
    statusItemChecklistSeverity
} from '@/features/deploy/components/deployLabels';

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

export const DeployPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<DeploysListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dialog, setDialog] = useState<'criar' | 'item' | 'falhar' | 'reverter' | null>(null);
    const [resultadoAlvo, setResultadoAlvo] = useState<ItemChecklistDeployResponse | null>(null);

    const podeConsultar = hasPermission('DEPLOY_CONSULTAR');
    const ambienteQuery = useAmbiente(podeConsultar);
    const migracoesQuery = useMigracoes(podeConsultar);
    const deploysQuery = useDeploys(filters, podeConsultar);
    const detalheQuery = useDeploy(selectedId);
    const detalhe = detalheQuery.data ?? null;
    const { criarMutation, concluirMutation, falharMutation, reverterMutation, itemMutation, resultadoMutation } = useDeployMutations();

    const records = useMemo(() => deploysQuery.data ?? [], [deploysQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!podeConsultar) {
        return <UnauthorizedState description="O painel de Deploy exige a permissão DEPLOY_CONSULTAR." />;
    }

    const updateFilter = (name: keyof DeploysListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };
    const close = () => setDialog(null);

    const criar = async (values: CriarDeployFormValues) => {
        await runWithToast(async () => { const criado = await criarMutation.mutateAsync(values); close(); setSelectedId(criado.id); }, { success: { summary: 'Deploy registrado' }, error: { summary: 'Erro ao registrar deploy' }, rethrow: true });
    };
    const adicionarItem = async (values: ItemChecklistFormValues) => {
        await runWithToast(async () => { await itemMutation.mutateAsync(values); close(); }, { success: { summary: 'Item adicionado' }, error: { summary: 'Erro ao adicionar item' }, rethrow: true });
    };
    const registrarResultado = async (values: ResultadoChecklistFormValues) => {
        if (!resultadoAlvo) return;
        await runWithToast(async () => { await resultadoMutation.mutateAsync({ itemId: resultadoAlvo.id, values }); setResultadoAlvo(null); }, { success: { summary: 'Resultado registrado' }, error: { summary: 'Erro ao registrar resultado' }, rethrow: true });
    };
    const concluir = () => selectedId && runWithToast(() => concluirMutation.mutateAsync(selectedId), { success: { summary: 'Deploy concluído' }, error: { summary: 'Erro ao concluir deploy' } });
    const falhar = async (motivo: string) => {
        if (!selectedId) return;
        await runWithToast(async () => { await falharMutation.mutateAsync({ id: selectedId, motivo }); close(); }, { success: { summary: 'Deploy marcado como falho' }, error: { summary: 'Erro ao marcar falha' }, rethrow: true });
    };
    const reverter = async (motivo: string) => {
        if (!selectedId) return;
        await runWithToast(async () => { await reverterMutation.mutateAsync({ id: selectedId, motivo }); close(); }, { success: { summary: 'Deploy revertido' }, error: { summary: 'Erro ao reverter deploy' }, rethrow: true });
    };

    const ambiente = ambienteQuery.data;
    const migracoes = migracoesQuery.data;
    const status = detalhe ? Number(detalhe.status) : 0;

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <Dropdown value={filters.status ?? null} options={statusDeployFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <PermissionGuard permission="DEPLOY_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Registrar deploy" icon="pi pi-plus" disabled={disabled} onClick={() => setDialog('criar')} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Deploy / Ambiente" description="Status do ambiente, migrações, registro de deploys com checklist e rollback." actions={headerActions} />

            <div className="grid mb-1">
                <div className="col-12 md:col-6">
                    <Card title="Ambiente">
                        {ambienteQuery.error ? <ApiErrorPanel error={mapApiError(ambienteQuery.error)} /> : null}
                        {ambiente ? (
                            <div className="grid">
                                <div className="col-6"><span className="block text-color-secondary text-sm">Versão atual</span><strong>{ambiente.versaoAtual}</strong></div>
                                <div className="col-6"><span className="block text-color-secondary text-sm">Ambiente</span>{ambiente.ambiente || '—'}</div>
                                <div className="col-6"><span className="block text-color-secondary text-sm">Runtime</span>{ambiente.runtime || '—'}</div>
                                <div className="col-6"><span className="block text-color-secondary text-sm">Saúde</span>{ambiente.healthy == null ? '—' : <Tag value={ambiente.healthy ? 'Saudável' : 'Degradado'} severity={ambiente.healthy ? 'success' : 'danger'} />}</div>
                            </div>
                        ) : <p className="text-color-secondary m-0">Carregando status do ambiente…</p>}
                    </Card>
                </div>
                <div className="col-12 md:col-6">
                    <Card title="Migrações">
                        {migracoesQuery.error ? <ApiErrorPanel error={mapApiError(migracoesQuery.error)} /> : null}
                        {migracoes ? (
                            <>
                                <div className="grid">
                                    <div className="col-4"><span className="block text-color-secondary text-sm">Aplicadas</span><strong>{migracoes.aplicadas}</strong></div>
                                    <div className="col-4"><span className="block text-color-secondary text-sm">Pendentes</span><strong className={migracoes.pendentes > 0 ? 'text-orange-600' : ''}>{migracoes.pendentes}</strong></div>
                                    <div className="col-4"><span className="block text-color-secondary text-sm">Total</span>{migracoes.total}</div>
                                </div>
                                <Message className="w-full mt-2" severity={migracoes.consistente ? 'success' : 'warn'} text={migracoes.consistente ? 'Esquema consistente.' : 'Inconsistência detectada — verifique as migrações pendentes.'} />
                            </>
                        ) : <p className="text-color-secondary m-0">Carregando migrações…</p>}
                    </Card>
                </div>
            </div>

            <Card>
                {deploysQuery.error ? <ApiErrorPanel error={mapApiError(deploysQuery.error)} /> : null}
                <DataTableServer<DeployResumoResponse> value={visibleRecords} totalRecords={records.length} loading={deploysQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum deploy registrado.">
                    <Column field="versao" header="Versão" />
                    <Column field="ambiente" header="Ambiente" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: DeployResumoResponse) => row.ambiente || '—'} />
                    <Column header="Iniciado" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: DeployResumoResponse) => formatDateTime(row.iniciadoEm)} />
                    <Column header="Status" body={(row: DeployResumoResponse) => <Tag value={statusDeployLabel(Number(row.status))} severity={statusDeploySeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: DeployResumoResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'DEPLOY_CONSULTAR', onClick: () => setSelectedId(row.id) }]} />} />
                </DataTableServer>
                {!deploysQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum deploy" description="Registre um deploy para acompanhar o checklist." /> : null}
            </Card>

            {detalhe ? (
                <Card title={`Deploy ${detalhe.versao}`} className="mt-3">
                    <div className="flex gap-2 flex-wrap mb-3 align-items-center">
                        <Tag value={statusDeployLabel(status)} severity={statusDeploySeverity(status) ?? undefined} />
                        <span className="text-color-secondary">{detalhe.ambiente || '—'} · iniciado {formatDateTime(detalhe.iniciadoEm)}{detalhe.concluidoEm ? ` · concluído ${formatDateTime(detalhe.concluidoEm)}` : ''}</span>
                        <div className="flex-1" />
                        {deployEmAndamento(status) ? <PermissionGuard permission="DEPLOY_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Adicionar item" icon="pi pi-plus" size="small" severity="secondary" disabled={disabled} onClick={() => setDialog('item')} />}</PermissionGuard> : null}
                        {deployEmAndamento(status) ? <PermissionGuard permission="DEPLOY_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Concluir" icon="pi pi-check" size="small" severity="success" disabled={disabled} loading={concluirMutation.isPending} onClick={concluir} />}</PermissionGuard> : null}
                        {deployEmAndamento(status) ? <PermissionGuard permission="DEPLOY_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Falhar" icon="pi pi-times" size="small" severity="danger" outlined disabled={disabled} onClick={() => setDialog('falhar')} />}</PermissionGuard> : null}
                        {deployPodeReverter(status) ? <PermissionGuard permission="DEPLOY_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Reverter" icon="pi pi-undo" size="small" severity="warning" disabled={disabled} onClick={() => setDialog('reverter')} />}</PermissionGuard> : null}
                    </div>
                    {detalhe.descricao ? <Message className="w-full mb-3" severity="info" text={detalhe.descricao} /> : null}
                    <DataTable value={detalhe.checklist} dataKey="id" emptyMessage="Nenhum item de checklist." responsiveLayout="scroll" stripedRows size="small">
                        <Column field="descricao" header="Item" />
                        <Column header="Obrigatório" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: ItemChecklistDeployResponse) => (item.obrigatorio ? 'Sim' : 'Não')} />
                        <Column header="Status" body={(item: ItemChecklistDeployResponse) => <Tag value={statusItemChecklistLabel(Number(item.status))} severity={statusItemChecklistSeverity(Number(item.status)) ?? undefined} />} />
                        <Column field="observacao" header="Observação" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(item: ItemChecklistDeployResponse) => item.observacao || '—'} />
                        <Column header="Ações" alignHeader="right" body={(item: ItemChecklistDeployResponse) => (
                            deployEmAndamento(status) && itemChecklistPendente(Number(item.status)) ? <PermissionGuard permission="DEPLOY_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Resultado" icon="pi pi-pencil" size="small" text disabled={disabled} onClick={() => setResultadoAlvo(item)} />}</PermissionGuard> : <span className="text-color-secondary">—</span>
                        )} />
                    </DataTable>
                </Card>
            ) : null}

            <CriarDeployDialog visible={dialog === 'criar'} loading={criarMutation.isPending} onHide={close} onSubmit={criar} />
            <ItemChecklistDialog visible={dialog === 'item'} loading={itemMutation.isPending} deployId={selectedId ?? ''} onHide={close} onSubmit={adicionarItem} />
            <ResultadoChecklistDialog visible={Boolean(resultadoAlvo)} loading={resultadoMutation.isPending} descricaoItem={resultadoAlvo?.descricao ?? ''} onHide={() => setResultadoAlvo(null)} onSubmit={registrarResultado} />
            <ReasonDialog visible={dialog === 'falhar'} title="Marcar deploy como falho" confirmLabel="Marcar falha" loading={falharMutation.isPending} onHide={close} onConfirm={falhar} />
            <ReasonDialog visible={dialog === 'reverter'} title="Reverter deploy" confirmLabel="Reverter" loading={reverterMutation.isPending} onHide={close} onConfirm={reverter} />
        </>
    );
};
