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
import { useUsuariosSeguranca } from '@/features/seguranca/hooks/useUsuariosSeguranca';
import { useNaoConformidade, useNaoConformidades, useNaoConformidadeMutations } from '@/features/qualidade/hooks/useQualidadeResources';
import { AcaoCorretivaFormValues, AcaoCorretivaResponse, NaoConformidadeResumoResponse, NaoConformidadesListQuery } from '@/features/qualidade/types/qualidade.types';
import { AcaoCorretivaDialog } from '@/features/qualidade/components/QualidadeDialogs';
import {
    acaoPodeCancelar,
    acaoPodeConcluir,
    acaoPodeIniciar,
    naoConformidadePodeAcoes,
    naoConformidadePodeEncerrar,
    statusAcaoLabel,
    statusAcaoSeverity,
    statusNaoConformidadeFilterOptions,
    statusNaoConformidadeLabel,
    statusNaoConformidadeSeverity
} from '@/features/qualidade/components/qualidadeLabels';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

export const NaoConformidadesPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<NaoConformidadesListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [acaoVisible, setAcaoVisible] = useState(false);
    const [cancelarAlvo, setCancelarAlvo] = useState<string | null>(null);

    const listQuery = useNaoConformidades(filters, hasPermission('QUALIDADE_CONSULTAR'));
    const detalheQuery = useNaoConformidade(selectedId);
    const detalhe = detalheQuery.data ?? null;
    const { acaoMutation, iniciarMutation, concluirMutation, cancelarMutation, encerrarMutation } = useNaoConformidadeMutations();

    const usuariosQuery = useUsuariosSeguranca({ empresaId: detalhe?.empresaId ?? undefined, filialId: detalhe?.filialId ?? undefined, ativo: true });
    const usuarioOptions = useMemo(() => (usuariosQuery.data ?? []).map((usuario) => ({ label: usuario.nome, value: usuario.id })), [usuariosQuery.data]);

    const records = useMemo(() => listQuery.data ?? [], [listQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('QUALIDADE_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Qualidade exige a permissão QUALIDADE_CONSULTAR." />;
    }

    const updateFilter = (name: keyof NaoConformidadesListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const adicionarAcao = async (values: AcaoCorretivaFormValues) => {
        if (!selectedId) return;
        await runWithToast(async () => { await acaoMutation.mutateAsync({ id: selectedId, values }); setAcaoVisible(false); }, { success: { summary: 'Ação corretiva adicionada' }, error: { summary: 'Erro ao adicionar ação' }, rethrow: true });
    };
    const iniciarAcao = (acaoId: string) => selectedId && runWithToast(() => iniciarMutation.mutateAsync({ id: selectedId, acaoId }), { success: { summary: 'Ação iniciada' }, error: { summary: 'Erro ao iniciar ação' } });
    const concluirAcao = (acaoId: string) => selectedId && runWithToast(() => concluirMutation.mutateAsync({ id: selectedId, acaoId }), { success: { summary: 'Ação concluída' }, error: { summary: 'Erro ao concluir ação' } });
    const cancelarAcao = async (motivo: string) => {
        if (!selectedId || !cancelarAlvo) return;
        await runWithToast(async () => { await cancelarMutation.mutateAsync({ id: selectedId, acaoId: cancelarAlvo, motivo }); setCancelarAlvo(null); }, { success: { summary: 'Ação cancelada' }, error: { summary: 'Erro ao cancelar ação' }, rethrow: true });
    };
    const encerrar = () => selectedId && runWithToast(() => encerrarMutation.mutateAsync(selectedId), { success: { summary: 'Não-conformidade encerrada' }, error: { summary: 'Erro ao encerrar' } });

    const status = detalhe ? Number(detalhe.status) : 0;

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusNaoConformidadeFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
        </div>
    );

    return (
        <>
            <PageHeader title="Não-conformidades" description="Tratativa de não-conformidades com ações corretivas e encerramento." actions={headerActions} />
            <Card>
                {listQuery.error ? <ApiErrorPanel error={mapApiError(listQuery.error)} /> : null}
                <DataTableServer<NaoConformidadeResumoResponse> value={visibleRecords} totalRecords={records.length} loading={listQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma não-conformidade encontrada.">
                    <Column header="Aberta em" body={(row: NaoConformidadeResumoResponse) => formatDate(row.abertaEm)} />
                    <Column field="descricao" header="Descrição" />
                    <Column header="Crítica" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: NaoConformidadeResumoResponse) => (row.critico ? <Tag value="Crítica" severity="danger" /> : '—')} />
                    <Column header="Status" body={(row: NaoConformidadeResumoResponse) => <Tag value={statusNaoConformidadeLabel(Number(row.status))} severity={statusNaoConformidadeSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: NaoConformidadeResumoResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'QUALIDADE_CONSULTAR', onClick: () => setSelectedId(row.id) }]} />} />
                </DataTableServer>
                {!listQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma não-conformidade" description="Não-conformidades surgem de inspeções reprovadas." /> : null}
            </Card>

            {detalhe ? (
                <Card title="Não-conformidade" className="mt-3">
                    <div className="flex gap-2 flex-wrap mb-3 align-items-center">
                        <Tag value={statusNaoConformidadeLabel(status)} severity={statusNaoConformidadeSeverity(status) ?? undefined} />
                        {detalhe.critico ? <Tag value="Crítica" severity="danger" /> : null}
                        <span className="text-color-secondary">{detalhe.descricao}</span>
                        <div className="flex-1" />
                        {naoConformidadePodeAcoes(status) ? <PermissionGuard permission="QUALIDADE_NAO_CONFORMIDADE_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Adicionar ação" icon="pi pi-plus" size="small" severity="secondary" disabled={disabled} onClick={() => setAcaoVisible(true)} />}</PermissionGuard> : null}
                        {naoConformidadePodeEncerrar(status) ? <PermissionGuard permission="QUALIDADE_NAO_CONFORMIDADE_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Encerrar" icon="pi pi-flag" size="small" severity="success" disabled={disabled} loading={encerrarMutation.isPending} onClick={encerrar} />}</PermissionGuard> : null}
                    </div>

                    {detalhe.bloqueioEstoqueId ? <Message className="w-full mb-3" severity="warn" text="Não-conformidade crítica bloqueou saldo em estoque. A liberação é feita em Estoque avançado (Bloqueios)." /> : null}

                    <DataTable value={detalhe.acoes} dataKey="id" emptyMessage="Nenhuma ação corretiva." responsiveLayout="scroll" stripedRows size="small">
                        <Column field="descricao" header="Ação" />
                        <Column header="Prazo" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: AcaoCorretivaResponse) => formatDate(item.prazo)} />
                        <Column header="Status" body={(item: AcaoCorretivaResponse) => <Tag value={statusAcaoLabel(Number(item.status))} severity={statusAcaoSeverity(Number(item.status)) ?? undefined} />} />
                        <Column header="Ações" alignHeader="right" body={(item: AcaoCorretivaResponse) => {
                            const acoes = [] as { key: string; label: string; icon: string; severity?: 'danger'; permission: 'QUALIDADE_NAO_CONFORMIDADE_GERENCIAR'; onClick: () => void }[];
                            if (acaoPodeIniciar(Number(item.status))) acoes.push({ key: 'iniciar', label: 'Iniciar', icon: 'pi pi-play', permission: 'QUALIDADE_NAO_CONFORMIDADE_GERENCIAR', onClick: () => iniciarAcao(item.id) });
                            if (acaoPodeConcluir(Number(item.status))) acoes.push({ key: 'concluir', label: 'Concluir', icon: 'pi pi-check', permission: 'QUALIDADE_NAO_CONFORMIDADE_GERENCIAR', onClick: () => concluirAcao(item.id) });
                            if (acaoPodeCancelar(Number(item.status))) acoes.push({ key: 'cancelar', label: 'Cancelar', icon: 'pi pi-ban', severity: 'danger', permission: 'QUALIDADE_NAO_CONFORMIDADE_GERENCIAR', onClick: () => setCancelarAlvo(item.id) });
                            return acoes.length ? <DataTableActions actions={acoes} /> : <span className="text-color-secondary">—</span>;
                        }} />
                    </DataTable>
                </Card>
            ) : null}

            <AcaoCorretivaDialog visible={acaoVisible} loading={acaoMutation.isPending} responsavelOptions={usuarioOptions} responsavelLoading={usuariosQuery.isFetching} onHide={() => setAcaoVisible(false)} onSubmit={adicionarAcao} />
            <ReasonDialog visible={Boolean(cancelarAlvo)} title="Cancelar ação corretiva" confirmLabel="Cancelar ação" loading={cancelarMutation.isPending} onHide={() => setCancelarAlvo(null)} onConfirm={cancelarAcao} />
        </>
    );
};
