'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableServer } from '@/components/data/DataTableServer';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAuditoriaEventos } from '@/features/auditoria/hooks/useAuditoriaResources';
import { AuditoriaEventoResponse, AuditoriaEventoView } from '@/features/auditoria/types/auditoria.types';
import { buildAuditoriaReference, formatAuditoriaDateTime, getAuditoriaActionLabel, getAuditoriaActionSeverity } from '@/features/auditoria/utils/auditoriaDisplay';
import { useAppToast } from '@/hooks/useAppToast';

const toView = (evento: AuditoriaEventoResponse): AuditoriaEventoView => ({
    ...evento,
    acaoDescricao: getAuditoriaActionLabel(evento.acao),
    referencia: buildAuditoriaReference(evento.entidade, evento.acao)
});

const matches = (value: string | undefined, term: string) => String(value ?? '').toLowerCase().includes(term.toLowerCase());

const buildSummary = (eventos: AuditoriaEventoView[]) => {
    const criticalActions = eventos.filter((evento) => [3, 4, 7].includes(evento.acao)).length;
    const modules = new Set(eventos.map((evento) => evento.modulo).filter(Boolean)).size;
    const latest = eventos
        .map((evento) => new Date(evento.criadoEm))
        .filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())[0];

    return [
        { label: 'Eventos carregados', value: eventos.length.toLocaleString('pt-BR'), helper: 'Últimos registros retornados pela API.', severity: 'info' as const },
        { label: 'Módulos afetados', value: modules.toLocaleString('pt-BR'), helper: 'Quantidade de módulos distintos na consulta.', severity: 'success' as const },
        { label: 'Ações críticas', value: criticalActions.toLocaleString('pt-BR'), helper: 'Cancelamentos, inativações e estornos.', severity: criticalActions > 0 ? 'warning' as const : 'info' as const },
        { label: 'Evento mais recente', value: latest ? latest.toLocaleDateString('pt-BR') : 'Sem data', helper: 'Baseado no campo de criação retornado.', severity: 'info' as const }
    ];
};

export const AuditoriaEventosPage = () => {
    const { hasPermission } = usePermissions();
    const toast = useAppToast();
    const eventosQuery = useAuditoriaEventos();
    const [termo, setTermo] = useState('');
    const [modulo, setModulo] = useState<string | null>(null);
    const [entidade, setEntidade] = useState<string | null>(null);
    const [acao, setAcao] = useState<number | null>(null);
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);

    const eventos = useMemo(() => (eventosQuery.data ?? []).map(toView), [eventosQuery.data]);
    const summary = useMemo(() => buildSummary(eventos), [eventos]);
    const moduloOptions = useMemo(() => Array.from(new Set(eventos.map((evento) => evento.modulo).filter(Boolean))).map((value) => ({ label: value, value })), [eventos]);
    const entidadeOptions = useMemo(() => Array.from(new Set(eventos.map((evento) => evento.entidade).filter(Boolean))).map((value) => ({ label: value, value })), [eventos]);
    const acaoOptions = useMemo(
        () => Array.from(new Set(eventos.map((evento) => evento.acao))).sort((a, b) => a - b).map((value) => ({ label: getAuditoriaActionLabel(value), value })),
        [eventos]
    );
    const filteredEventos = useMemo(() => {
        const term = termo.trim();
        return eventos.filter((evento) => {
            const sameModulo = !modulo || evento.modulo === modulo;
            const sameEntidade = !entidade || evento.entidade === entidade;
            const sameAcao = acao === null || evento.acao === acao;
            const sameTerm = !term || matches(evento.descricao, term) || matches(evento.modulo, term) || matches(evento.entidade, term) || matches(evento.acaoDescricao, term) || matches(evento.referencia, term);
            return sameModulo && sameEntidade && sameAcao && sameTerm;
        });
    }, [acao, entidade, eventos, modulo, termo]);
    const visibleEventos = filteredEventos.slice(first, first + rows);

    if (!hasPermission('AUDITORIA_CONSULTAR')) {
        return <UnauthorizedState description="A consulta de auditoria exige a permissão AUDITORIA_CONSULTAR." />;
    }

    const clearFilters = () => {
        setTermo('');
        setModulo(null);
        setEntidade(null);
        setAcao(null);
        setFirst(0);
        toast.info('Filtros limpos', 'A lista de eventos voltou para a consulta padrão.');
    };

    return (
        <>
            <PageHeader
                title="Eventos de auditoria"
                description="Últimos eventos críticos registrados pela API, com filtros visuais sem expor identificadores técnicos ao usuário."
                actions={<Button label="Atualizar" icon="pi pi-refresh" outlined loading={eventosQuery.isFetching} onClick={() => eventosQuery.refetch()} />}
            />
            <Message severity="info" className="w-full mb-3" text="A API retorna os últimos 100 eventos. Use os filtros para localizar módulo, entidade, ação ou descrição." />
            <div className="grid">
                {summary.map((item) => (
                    <div key={item.label} className="col-12 md:col-6 xl:col-3">
                        <Card>
                            <div className="flex align-items-center justify-content-between gap-2">
                                <span className="text-color-secondary font-medium">{item.label}</span>
                                <Tag value={item.severity === 'warning' ? 'Atenção' : 'Info'} severity={item.severity} />
                            </div>
                            <div className="text-900 text-2xl font-semibold mt-2">{item.value}</div>
                            <small className="text-color-secondary line-height-3">{item.helper}</small>
                        </Card>
                    </div>
                ))}
            </div>
            <Card>
                <div className="grid mb-3">
                    <div className="col-12 lg:col-3">
                        <span className="p-input-icon-left w-full">
                            <i className="pi pi-search" aria-hidden="true" />
                            <InputText className="w-full" value={termo} placeholder="Buscar por descrição, módulo ou ação" onChange={(event) => { setTermo(event.target.value); setFirst(0); }} />
                        </span>
                    </div>
                    <div className="col-12 md:col-4 lg:col-2">
                        <Dropdown className="w-full" value={modulo} options={moduloOptions} placeholder="Módulo" showClear onChange={(event) => { setModulo(event.value); setFirst(0); }} />
                    </div>
                    <div className="col-12 md:col-4 lg:col-2">
                        <Dropdown className="w-full" value={entidade} options={entidadeOptions} placeholder="Entidade" showClear onChange={(event) => { setEntidade(event.value); setFirst(0); }} />
                    </div>
                    <div className="col-12 md:col-4 lg:col-2">
                        <Dropdown className="w-full" value={acao} options={acaoOptions} placeholder="Ação" showClear onChange={(event) => { setAcao(event.value); setFirst(0); }} />
                    </div>
                    <div className="col-12 lg:col-3">
                        <Button className="w-full" label="Limpar filtros" icon="pi pi-filter-slash" outlined onClick={clearFilters} />
                    </div>
                </div>
                <DataTableServer
                    value={visibleEventos}
                    totalRecords={filteredEventos.length}
                    loading={eventosQuery.isLoading || eventosQuery.isFetching}
                    first={first}
                    rows={rows}
                    onPage={(event) => { setFirst(event.first); setRows(event.rows); }}
                    emptyMessage="Nenhum evento encontrado."
                >
                    <Column field="criadoEm" header="Data" body={(evento: AuditoriaEventoView) => formatAuditoriaDateTime(evento.criadoEm)} />
                    <Column field="modulo" header="Módulo" />
                    <Column field="entidade" header="Entidade" />
                    <Column field="acaoDescricao" header="Ação" body={(evento: AuditoriaEventoView) => <Tag value={evento.acaoDescricao} severity={getAuditoriaActionSeverity(evento.acao)} />} />
                    <Column field="descricao" header="Descrição" />
                    <Column field="referencia" header="Referência" />
                </DataTableServer>
                {!eventosQuery.isLoading && filteredEventos.length === 0 ? <EmptyState title="Nenhum evento encontrado" description="Ajuste os filtros ou atualize a consulta." /> : null}
            </Card>
        </>
    );
};
