'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { SearchInput } from '@/components/forms/SearchInput';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { AtividadeFormDialog } from '@/features/atividades/components/AtividadeFormDialog';
import { AlterarStatusAtividadeDialog, AtribuirAtividadeDialog, ComentarAtividadeDialog } from '@/features/atividades/components/AtividadeActionDialogs';
import { useAtividadeDetalhe, useAtividades, useAtividadesMutations } from '@/features/atividades/hooks/useAtividadesResources';
import { AtividadeFormValues, AtividadePrioridade, AtividadeResponse, AtividadeStatus, AtividadesListQuery } from '@/features/atividades/types/atividades.types';
import { useUsuariosSeguranca } from '@/features/seguranca/hooks/useUsuariosSeguranca';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { SelectOption } from '@/types/erp';

type ActionState = 'atribuir' | 'status' | 'comentario' | 'cancelar' | null;

const statusOptions: SelectOption<string | null>[] = [
    { label: 'Todos os status', value: null },
    { label: 'Aberta', value: 'Aberta' },
    { label: 'Em andamento', value: 'EmAndamento' },
    { label: 'Concluída', value: 'Concluida' },
    { label: 'Cancelada', value: 'Cancelada' }
];

const prioridadeOptions: SelectOption<string | null>[] = [
    { label: 'Todas as prioridades', value: null },
    { label: 'Baixa', value: 'Baixa' },
    { label: 'Média', value: 'Media' },
    { label: 'Alta', value: 'Alta' },
    { label: 'Crítica', value: 'Critica' }
];

const statusLabel = (status?: string | null) => {
    if (status === 'EmAndamento') return 'Em andamento';
    if (status === 'Concluida') return 'Concluída';
    if (status === 'Cancelada') return 'Cancelada';
    return 'Aberta';
};

const statusSeverity = (status?: string | null) => {
    if (status === 'Concluida') return 'success' as const;
    if (status === 'Cancelada') return 'danger' as const;
    if (status === 'EmAndamento') return 'info' as const;
    return 'warning' as const;
};

const prioridadeLabel = (prioridade?: string | null) => {
    if (prioridade === 'Critica') return 'Crítica';
    if (prioridade === 'Media') return 'Média';
    return prioridade ?? '-';
};

const prioridadeSeverity = (prioridade?: string | null) => {
    if (prioridade === 'Critica') return 'danger' as const;
    if (prioridade === 'Alta') return 'warning' as const;
    if (prioridade === 'Baixa') return 'success' as const;
    return 'info' as const;
};

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '-');
const getStatus = (atividade: AtividadeResponse) => (atividade.statusAtividade ?? atividade.status ?? 'Aberta') as string;
const canOperate = (atividade: AtividadeResponse) => getStatus(atividade) !== 'Cancelada' && getStatus(atividade) !== 'Concluida';

export const AtividadesPage = () => {
    const runWithToast = useMutationWithToast();
    const { hasAnyPermission } = usePermissions();
    const [filters, setFilters] = useState<AtividadesListQuery>({});
    const [search, setSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [selected, setSelected] = useState<AtividadeResponse | null>(null);
    const [action, setAction] = useState<ActionState>(null);

    const page = Math.floor(first / rows) + 1;
    const listQuery = useMemo<AtividadesListQuery>(() => ({ ...filters, termo: search.trim() || null, page, pageSize: rows }), [filters, search, page, rows]);
    const atividadesQuery = useAtividades(listQuery);
    const usuariosQuery = useUsuariosSeguranca({ empresaId: filters.empresaId ?? undefined, filialId: filters.filialId ?? undefined, ativo: true });
    const detalheQuery = useAtividadeDetalhe(selected?.id ?? null);
    const mutations = useAtividadesMutations();

    const paged = atividadesQuery.data;
    const atividades = useMemo(() => paged?.items ?? [], [paged]);
    const totalRecords = paged?.totalItems ?? 0;
    const usuarios = usuariosQuery.data ?? [];
    const usuarioLabelMap = useMemo(() => new Map(usuarios.map((usuario) => [usuario.id, `${usuario.nome} • ${usuario.email}`])), [usuarios]);
    const detalhe = detalheQuery.data ?? selected;

    if (!hasAnyPermission(['ATIVIDADES_CONSULTAR', 'ATIVIDADES_GERENCIAR'])) {
        return <UnauthorizedState description="A rotina Atividades exige ATIVIDADES_CONSULTAR ou ATIVIDADES_GERENCIAR." />;
    }

    const updateFilter = (name: keyof AtividadesListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value || null }));
    };

    const saveAtividade = async (values: AtividadeFormValues) => {
        await runWithToast(
            async () => {
                await mutations.saveMutation.mutateAsync({ id: values.id, values });
                setFormVisible(false);
                setSelected(null);
            },
            { success: { summary: values.id ? 'Atividade atualizada' : 'Atividade criada', detail: 'O workflow foi enviado ao backend com auditoria operacional.' }, error: { summary: 'Erro ao salvar atividade', detail: 'Não foi possível salvar a atividade.' }, rethrow: true }
        );
    };

    const executarAtribuicao = async (values: { responsavelUsuarioId: string }) => {
        if (!selected) return;
        await runWithToast(
            async () => {
                await mutations.atribuirMutation.mutateAsync({ id: selected.id, values });
                setAction(null);
            },
            { success: { summary: 'Responsável atribuído', detail: 'A atividade foi reatribuída com rastreabilidade.' }, error: { summary: 'Erro ao atribuir' }, rethrow: true }
        );
    };

    const executarStatus = async (values: { status: AtividadeStatus; comentario?: string | null }) => {
        if (!selected) return;
        await runWithToast(
            async () => {
                await mutations.statusMutation.mutateAsync({ id: selected.id, values });
                setAction(null);
            },
            { success: { summary: 'Status alterado', detail: 'A mudança de status foi registrada no histórico.' }, error: { summary: 'Erro ao alterar status' }, rethrow: true }
        );
    };

    const executarComentario = async (values: { mensagem: string }) => {
        if (!selected) return;
        await runWithToast(
            async () => {
                await mutations.comentarioMutation.mutateAsync({ id: selected.id, values });
                setAction(null);
            },
            { success: { summary: 'Comentário adicionado', detail: 'O comentário foi vinculado à atividade.' }, error: { summary: 'Erro ao comentar' }, rethrow: true }
        );
    };

    const executarCancelamento = async (motivo: string) => {
        if (!selected) return;
        await runWithToast(
            async () => {
                await mutations.cancelarMutation.mutateAsync({ id: selected.id, motivo });
                setAction(null);
            },
            { success: { summary: 'Atividade cancelada', detail: 'O cancelamento foi registrado com motivo.' }, error: { summary: 'Erro ao cancelar' } }
        );
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <SearchInput ariaLabel="Buscar atividade" defaultValue={search} onChange={(term) => { setSearch(term); setFirst(0); }} />
            <PermissionGuard permission="ATIVIDADES_GERENCIAR" mode="disable">
                {({ disabled }) => <Button label="Nova atividade" icon="pi pi-plus" disabled={disabled} onClick={() => { setSelected(null); setFormVisible(true); }} />}
            </PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Atividades" description="Workflow operacional com responsável, prioridade, status, comentários e vínculo de origem." actions={headerActions} />
            <Message className="w-full mb-3" severity="info" text="Toda atribuição, alteração de status, comentário e cancelamento é enviada para endpoints específicos para preservar histórico e auditoria operacional." />

            <Card className="mb-3">
                <div className="grid formgrid p-fluid">
                    <div className="field col-12 lg:col-5"><EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} /></div>
                    <div className="field col-12 md:col-3"><label htmlFor="atividadeFiltroStatus" className="font-medium">Status</label><Dropdown id="atividadeFiltroStatus" value={filters.status ?? null} options={statusOptions} onChange={(event) => updateFilter('status', event.value)} /></div>
                    <div className="field col-12 md:col-3"><label htmlFor="atividadeFiltroPrioridade" className="font-medium">Prioridade</label><Dropdown id="atividadeFiltroPrioridade" value={filters.prioridade ?? null} options={prioridadeOptions} onChange={(event) => updateFilter('prioridade', event.value)} /></div>
                </div>
            </Card>

            <div className="grid">
                <div className="col-12 xl:col-8">
                    <Card title="Atividades operacionais">
                        {atividadesQuery.error ? <ApiErrorPanel error={mapApiError(atividadesQuery.error)} /> : null}
                        <DataTableServer<AtividadeResponse> value={atividades} totalRecords={totalRecords} loading={atividadesQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma atividade encontrada.">
                            <Column field="titulo" header="Título" />
                            <Column header="Status" body={(row: AtividadeResponse) => <Tag value={statusLabel(getStatus(row))} severity={statusSeverity(getStatus(row))} />} />
                            <Column header="Prioridade" body={(row: AtividadeResponse) => <Tag value={prioridadeLabel(row.prioridade)} severity={prioridadeSeverity(row.prioridade)} />} />
                            <Column header="Responsável" body={(row: AtividadeResponse) => row.responsavelUsuarioId ? usuarioLabelMap.get(row.responsavelUsuarioId) ?? 'Responsável vinculado' : '-'} />
                            <Column header="Prazo" body={(row: AtividadeResponse) => formatDateTime(row.prazoEm)} />
                            <Column header="Origem" body={(row: AtividadeResponse) => row.entidadeOrigem ? `${row.entidadeOrigem}${row.entidadeOrigemId ? ' • vínculo técnico' : ''}` : '-'} />
                            <Column header="Ações" alignHeader="right" body={(row: AtividadeResponse) => <DataTableActions actions={[
                                { key: 'detalhe', label: 'Detalhe', icon: 'pi pi-eye', permission: 'ATIVIDADES_CONSULTAR', onClick: () => setSelected(row) },
                                { key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'ATIVIDADES_GERENCIAR', disabled: !canOperate(row), onClick: () => { setSelected(row); setFormVisible(true); } },
                                { key: 'atribuir', label: 'Atribuir', icon: 'pi pi-user-edit', permission: 'ATIVIDADES_GERENCIAR', disabled: !canOperate(row), onClick: () => { setSelected(row); setAction('atribuir'); } },
                                { key: 'status', label: 'Status', icon: 'pi pi-sync', permission: 'ATIVIDADES_GERENCIAR', disabled: !canOperate(row), onClick: () => { setSelected(row); setAction('status'); } },
                                { key: 'comentario', label: 'Comentar', icon: 'pi pi-comment', permission: 'ATIVIDADES_GERENCIAR', disabled: getStatus(row) === 'Cancelada', onClick: () => { setSelected(row); setAction('comentario'); } },
                                { key: 'cancelar', label: 'Cancelar', icon: 'pi pi-ban', permission: 'ATIVIDADES_GERENCIAR', severity: 'danger', disabled: !canOperate(row), onClick: () => { setSelected(row); setAction('cancelar'); } }
                            ]} />} />
                        </DataTableServer>
                        {!atividadesQuery.isLoading && totalRecords === 0 ? <EmptyState title="Nenhuma atividade" description="Crie uma atividade ou ajuste os filtros." /> : null}
                    </Card>
                </div>

                <div className="col-12 xl:col-4">
                    <Card title={detalhe ? 'Detalhe da atividade' : 'Selecione uma atividade'}>
                        {detalheQuery.error ? <ApiErrorPanel error={mapApiError(detalheQuery.error)} /> : null}
                        {detalhe ? (
                            <div className="flex flex-column gap-3">
                                <div><span className="text-600 block">Título</span><strong>{detalhe.titulo}</strong></div>
                                <div><span className="text-600 block">Descrição</span><span>{detalhe.descricao || '-'}</span></div>
                                <div className="flex gap-2"><Tag value={statusLabel(getStatus(detalhe))} severity={statusSeverity(getStatus(detalhe))} /><Tag value={prioridadeLabel(detalhe.prioridade)} severity={prioridadeSeverity(detalhe.prioridade)} /></div>
                                <div><span className="text-600 block">Responsável</span><span>{detalhe.responsavelUsuarioId ? usuarioLabelMap.get(detalhe.responsavelUsuarioId) ?? 'Responsável vinculado' : '-'}</span></div>
                                <div><span className="text-600 block">Prazo</span><span>{formatDateTime(detalhe.prazoEm)}</span></div>
                                <div><span className="text-600 block">Histórico</span>{detalhe.historico?.length ? detalhe.historico.map((item) => <div key={item.id} className="border-bottom-1 surface-border py-2"><strong>{statusLabel(item.statusNovo ?? '')}</strong><br /><small>{item.comentario ?? '-'} • {formatDateTime(item.criadoEm)}</small></div>) : <small className="text-600">Sem histórico carregado.</small>}</div>
                                <div><span className="text-600 block">Comentários</span>{detalhe.comentarios?.length ? detalhe.comentarios.map((item) => <div key={item.id} className="border-bottom-1 surface-border py-2"><span>{item.mensagem}</span><br /><small>{formatDateTime(item.criadoEm)}</small></div>) : <small className="text-600">Sem comentários carregados.</small>}</div>
                            </div>
                        ) : <Message severity="info" text="Use a ação Detalhe para carregar histórico e comentários da atividade." />}
                    </Card>
                </div>
            </div>

            <AtividadeFormDialog visible={formVisible} loading={mutations.saveMutation.isPending} atividade={selected && formVisible ? selected : null} usuarios={usuarios} onHide={() => { setFormVisible(false); setSelected(null); }} onSubmit={saveAtividade} />
            <AtribuirAtividadeDialog visible={action === 'atribuir'} loading={mutations.atribuirMutation.isPending} usuarios={usuarios} onHide={() => setAction(null)} onSubmit={executarAtribuicao} />
            <AlterarStatusAtividadeDialog visible={action === 'status'} loading={mutations.statusMutation.isPending} onHide={() => setAction(null)} onSubmit={executarStatus} />
            <ComentarAtividadeDialog visible={action === 'comentario'} loading={mutations.comentarioMutation.isPending} onHide={() => setAction(null)} onSubmit={executarComentario} />
            <ReasonDialog visible={action === 'cancelar'} title="Cancelar atividade" confirmLabel="Cancelar atividade" loading={mutations.cancelarMutation.isPending} onHide={() => setAction(null)} onConfirm={executarCancelamento} />
        </>
    );
};
