'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { DateTimeInput } from '@/components/forms/DateTimeInput';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAuditoriaEventosRecentes, useAuditoriaOperacional } from '@/features/auditoria/hooks/useAuditoriaResources';
import { AuditoriaEventoResponse, AuditoriaEventoView, AuditoriaOperacionalQuery } from '@/features/auditoria/types/auditoria.types';
import { buildAuditoriaReference, formatAuditoriaDateTime, getAuditoriaActionLabel, getAuditoriaActionSeverity, maskAuditoriaTechnicalIds } from '@/features/auditoria/utils/auditoriaDisplay';
import { useUsuariosSeguranca } from '@/features/seguranca/hooks/useUsuariosSeguranca';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { SelectOption } from '@/types/erp';

const startOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
};

const endOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
};

const acaoOptions: SelectOption<string | null>[] = [
    { label: 'Todas as ações', value: null },
    { label: 'Criação', value: 'Criacao' },
    { label: 'Atualização', value: 'Atualizacao' },
    { label: 'Inativação', value: 'Inativacao' },
    { label: 'Cancelamento', value: 'Cancelamento' },
    { label: 'Aprovação', value: 'Aprovacao' },
    { label: 'Baixa', value: 'Baixa' },
    { label: 'Estorno', value: 'Estorno' },
    { label: 'Login', value: 'Login' },
    { label: 'Logout', value: 'Logout' }
];

const usuarioFallback = 'Usuário vinculado';
const contextoFallback = 'Contexto protegido';

const toView = (evento: AuditoriaEventoResponse, usuarioLabelMap: Map<string, string>): AuditoriaEventoView => ({
    ...evento,
    acaoDescricao: getAuditoriaActionLabel(evento.acao),
    referencia: buildAuditoriaReference(evento.entidade, evento.acao),
    usuarioDescricao: evento.usuarioId ? usuarioLabelMap.get(evento.usuarioId) ?? usuarioFallback : usuarioFallback,
    descricaoSegura: maskAuditoriaTechnicalIds(evento.descricao)
});

const safeText = (value?: string | null, fallback = '-') => maskAuditoriaTechnicalIds(value?.trim() || fallback);
const countCritical = (eventos: AuditoriaEventoView[]) => eventos.filter((evento) => ['Cancelamento', 'Inativação', 'Estorno'].includes(evento.acaoDescricao)).length;

export const AuditoriaEventosPage = () => {
    const { hasPermission } = usePermissions();
    const toast = useAppToast();
    const [filters, setFilters] = useState<AuditoriaOperacionalQuery>({ page: 1, pageSize: 20, dataInicial: startOfMonth(), dataFinal: endOfMonth() });
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(20);

    const usuariosQuery = useUsuariosSeguranca({ ativo: true });
    const usuarioOptions = useMemo(() => (usuariosQuery.data ?? []).map((usuario) => ({ label: usuario.nome || usuario.email || usuario.login || usuarioFallback, value: usuario.id })), [usuariosQuery.data]);
    const usuarioLabelMap = useMemo(() => new Map((usuariosQuery.data ?? []).map((usuario) => [usuario.id, usuario.nome || usuario.email || usuario.login || usuarioFallback])), [usuariosQuery.data]);

    const query = useMemo<AuditoriaOperacionalQuery>(() => ({ ...filters, page: Math.floor(first / rows) + 1, pageSize: rows }), [filters, first, rows]);
    const operacionalQuery = useAuditoriaOperacional(query);
    const recentesQuery = useAuditoriaEventosRecentes();

    const operacionalItems = useMemo(() => (operacionalQuery.data?.items ?? []).map((evento) => toView(evento, usuarioLabelMap)), [operacionalQuery.data?.items, usuarioLabelMap]);
    const recentes = useMemo(() => (recentesQuery.data ?? []).slice(0, 8).map((evento) => toView(evento, usuarioLabelMap)), [recentesQuery.data, usuarioLabelMap]);
    const modulesCount = useMemo(() => new Set(operacionalItems.map((evento) => evento.modulo).filter(Boolean)).size, [operacionalItems]);

    if (!hasPermission('AUDITORIA_OPERACIONAL_CONSULTAR')) {
        return <UnauthorizedState description="A consulta de auditoria exige a permissão AUDITORIA_OPERACIONAL_CONSULTAR." />;
    }

    const update = (name: keyof AuditoriaOperacionalQuery, value: string | Date | null) => {
        setFilters((current) => ({ ...current, [name]: value || null }));
        setFirst(0);
    };

    const clearFilters = () => {
        setFilters({ page: 1, pageSize: rows, dataInicial: startOfMonth(), dataFinal: endOfMonth() });
        setFirst(0);
        toast.info('Filtros limpos', 'A auditoria operacional voltou para o período padrão.');
    };

    const refresh = () => {
        operacionalQuery.refetch();
        recentesQuery.refetch();
    };

    return (
        <>
            <PageHeader
                title="Eventos de auditoria"
                description="Consulta operacional auditável avançada, com filtros por contexto, usuário, módulo, entidade, ação, período e termo. A auditoria é consultiva e não expõe GUID bruto."
                actions={<Button label="Atualizar" icon="pi pi-refresh" outlined loading={operacionalQuery.isFetching || recentesQuery.isFetching} onClick={refresh} />}
            />

            <div className="grid">
                <div className="col-12 md:col-6 xl:col-3"><Card><span className="block text-color-secondary mb-2">Eventos operacionais</span><strong className="text-2xl">{(operacionalQuery.data?.totalItems ?? 0).toLocaleString('pt-BR')}</strong><small className="block text-color-secondary mt-2">Total retornado pela consulta paginada.</small></Card></div>
                <div className="col-12 md:col-6 xl:col-3"><Card><span className="block text-color-secondary mb-2">Eventos recentes</span><strong className="text-2xl">{recentes.length.toLocaleString('pt-BR')}</strong><small className="block text-color-secondary mt-2">Baseado em /eventos-recentes.</small></Card></div>
                <div className="col-12 md:col-6 xl:col-3"><Card><span className="block text-color-secondary mb-2">Módulos afetados</span><strong className="text-2xl">{modulesCount.toLocaleString('pt-BR')}</strong><small className="block text-color-secondary mt-2">Módulos distintos na página atual.</small></Card></div>
                <div className="col-12 md:col-6 xl:col-3"><Card><span className="block text-color-secondary mb-2">Ações críticas</span><strong className="text-2xl">{countCritical(operacionalItems).toLocaleString('pt-BR')}</strong><small className="block text-color-secondary mt-2">Cancelamento, inativação e estorno.</small></Card></div>
            </div>

            <Card className="mb-3" title="Eventos recentes">
                {recentesQuery.error ? <ApiErrorPanel error={mapApiError(recentesQuery.error)} /> : null}
                <div className="grid">
                    {recentes.map((evento) => (
                        <div key={evento.id} className="col-12 md:col-6 xl:col-3">
                            <div className="surface-card border-1 surface-border border-round p-3 h-full">
                                <div className="flex justify-content-between align-items-center gap-2 mb-2">
                                    <strong>{safeText(evento.modulo, 'Módulo')}</strong>
                                    <Tag value={evento.acaoDescricao} severity={getAuditoriaActionSeverity(evento.acao)} />
                                </div>
                                <span className="block text-color-secondary mb-2">{formatAuditoriaDateTime(evento.criadoEm)}</span>
                                <p className="m-0 line-height-3">{evento.descricaoSegura}</p>
                            </div>
                        </div>
                    ))}
                    {!recentesQuery.isLoading && recentes.length === 0 ? <div className="col-12"><EmptyState title="Sem eventos recentes" description="Nenhum evento recente foi retornado pelo backend." /></div> : null}
                </div>
            </Card>

            <Card title="Auditoria operacional">
                <div className="grid mb-3">
                    <div className="col-12 lg:col-4"><EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} /></div>
                    <div className="col-12 md:col-6 lg:col-2"><Dropdown className="w-full" value={filters.usuarioId ?? null} options={usuarioOptions} placeholder="Usuário" showClear onChange={(event) => update('usuarioId', event.value)} /></div>
                    <div className="col-12 md:col-6 lg:col-2"><InputText className="w-full" value={filters.modulo ?? ''} placeholder="Módulo" onChange={(event) => update('modulo', event.target.value)} /></div>
                    <div className="col-12 md:col-6 lg:col-2"><InputText className="w-full" value={filters.entidade ?? ''} placeholder="Entidade" onChange={(event) => update('entidade', event.target.value)} /></div>
                    <div className="col-12 md:col-6 lg:col-2"><Dropdown className="w-full" value={filters.acao ?? null} options={acaoOptions} placeholder="Ação" showClear onChange={(event) => update('acao', event.value)} /></div>
                    <div className="col-12 lg:col-3"><span className="p-input-icon-left w-full"><i className="pi pi-search" aria-hidden="true" /><InputText className="w-full" value={filters.termo ?? ''} placeholder="Termo" onChange={(event) => update('termo', event.target.value)} /></span></div>
                    <div className="col-12 md:col-6 lg:col-3"><DateTimeInput value={filters.dataInicial instanceof Date ? filters.dataInicial : filters.dataInicial ? new Date(filters.dataInicial) : null} onChange={(value) => update('dataInicial', value)} /></div>
                    <div className="col-12 md:col-6 lg:col-3"><DateTimeInput value={filters.dataFinal instanceof Date ? filters.dataFinal : filters.dataFinal ? new Date(filters.dataFinal) : null} onChange={(value) => update('dataFinal', value)} /></div>
                    <div className="col-12 lg:col-3"><Button className="w-full" label="Limpar filtros" icon="pi pi-filter-slash" outlined onClick={clearFilters} /></div>
                </div>
                {operacionalQuery.error ? <ApiErrorPanel error={mapApiError(operacionalQuery.error)} /> : null}
                <DataTableServer
                    value={operacionalItems}
                    totalRecords={operacionalQuery.data?.totalItems ?? 0}
                    loading={operacionalQuery.isLoading || operacionalQuery.isFetching}
                    first={first}
                    rows={rows}
                    onPage={(event) => { setFirst(event.first); setRows(event.rows); }}
                    emptyMessage="Nenhum evento operacional encontrado."
                >
                    <Column field="criadoEm" header="Data" body={(evento: AuditoriaEventoView) => formatAuditoriaDateTime(evento.criadoEm)} />
                    <Column field="modulo" header="Módulo" body={(evento: AuditoriaEventoView) => safeText(evento.modulo)} />
                    <Column field="entidade" header="Entidade" body={(evento: AuditoriaEventoView) => safeText(evento.entidade)} />
                    <Column field="acaoDescricao" header="Ação" body={(evento: AuditoriaEventoView) => <Tag value={evento.acaoDescricao} severity={getAuditoriaActionSeverity(evento.acao)} />} />
                    <Column field="descricao" header="Descrição" body={(evento: AuditoriaEventoView) => evento.descricaoSegura} />
                    <Column field="usuarioDescricao" header="Usuário" body={(evento: AuditoriaEventoView) => evento.usuarioDescricao} />
                    <Column field="referencia" header="Referência" body={(evento: AuditoriaEventoView) => evento.referencia || contextoFallback} />
                </DataTableServer>
                {!operacionalQuery.isLoading && operacionalItems.length === 0 ? <EmptyState title="Nenhum evento operacional" description="Ajuste os filtros ou confirme a disponibilidade do endpoint de auditoria operacional." /> : null}
            </Card>
        </>
    );
};
