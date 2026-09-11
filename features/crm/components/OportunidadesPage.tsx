'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { EntitySelect } from '@/components/forms/EntitySelect';
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
import { useOportunidadeMutations, useOportunidades, usePropostas } from '@/features/crm/hooks/useCrmResources';
import { ConverterOportunidadeFormValues, OportunidadeResponse, OportunidadesListQuery, PerderOportunidadeFormValues, StatusProposta } from '@/features/crm/types/crm.types';
import { ConverterOportunidadeDialog, PerderOportunidadeDialog } from '@/features/crm/components/CrmDialogs';
import {
    estagioFilterOptions,
    estagioLabel,
    estagioOptions,
    estagioSeverity,
    oportunidadeAberta,
    oportunidadePodeConverter,
    statusOportunidadeFilterOptions,
    statusOportunidadeLabel,
    statusOportunidadeSeverity
} from '@/features/crm/components/crmLabels';
import { formatMoney } from '@/lib/formatters/money';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

const filterLocal = (records: OportunidadeResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => record.titulo.toLowerCase().includes(normalized));
};

const GanharDialog = ({ visible, loading, oportunidadeId, onHide, onSubmit }: { visible: boolean; loading?: boolean; oportunidadeId: string; onHide: () => void; onSubmit: (propostaVencedoraId?: string | null) => Promise<void> }) => {
    const [propostaId, setPropostaId] = useState<string | null>(null);
    const propostasQuery = usePropostas({ oportunidadeId }, visible && Boolean(oportunidadeId));
    const propostaOptions = useMemo(() => (propostasQuery.data ?? []).map((proposta) => ({ label: `${proposta.numero ?? proposta.id.slice(0, 8)} — ${formatMoney(proposta.valorTotal)}${Number(proposta.status) === StatusProposta.Aceita ? ' (aceita)' : ''}`, value: proposta.id })), [propostasQuery.data]);

    useEffect(() => {
        if (visible) setPropostaId(null);
    }, [visible]);

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Marcar como ganha" icon="pi pi-check" severity="success" loading={loading} onClick={() => onSubmit(propostaId)} />
        </div>
    );

    return (
        <Dialog header="Ganhar oportunidade" visible={visible} modal style={{ width: 'min(40rem, 96vw)' }} footer={footer} onHide={onHide}>
            <p className="text-color-secondary mt-0">Selecione a proposta vencedora (recomendado antes de converter em pedido).</p>
            <label htmlFor="ganharProposta" className="block font-medium mb-2">Proposta vencedora</label>
            <EntitySelect id="ganharProposta" entityName="proposta" value={propostaId} options={propostaOptions} loading={propostasQuery.isFetching} onChange={setPropostaId} />
        </Dialog>
    );
};

export const OportunidadesPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<OportunidadesListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dialog, setDialog] = useState<'ganhar' | 'perder' | 'converter' | null>(null);
    const [conversao, setConversao] = useState<{ numeroPedido: string; pedidoVendaId: string; valorTotal: number } | null>(null);

    const oportunidadesQuery = useOportunidades(filters, hasPermission('CRM_CONSULTAR'));
    const { estagioMutation, ganharMutation, perderMutation, converterMutation } = useOportunidadeMutations();

    const selected = useMemo(() => (oportunidadesQuery.data ?? []).find((item) => item.id === selectedId) ?? null, [oportunidadesQuery.data, selectedId]);

    const records = useMemo(() => filterLocal(oportunidadesQuery.data ?? [], localSearch), [oportunidadesQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('CRM_CONSULTAR')) {
        return <UnauthorizedState description="O módulo CRM exige a permissão CRM_CONSULTAR." />;
    }

    const updateFilter = (name: keyof OportunidadesListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };
    const close = () => setDialog(null);

    const moverEstagio = (estagio: number) => selectedId && runWithToast(() => estagioMutation.mutateAsync({ id: selectedId, estagio }), { success: { summary: 'Estágio atualizado' }, error: { summary: 'Erro ao mover estágio' } });
    const ganhar = async (propostaVencedoraId?: string | null) => {
        if (!selectedId) return;
        await runWithToast(async () => { await ganharMutation.mutateAsync({ id: selectedId, propostaVencedoraId }); close(); }, { success: { summary: 'Oportunidade ganha' }, error: { summary: 'Erro ao marcar como ganha' }, rethrow: true });
    };
    const perder = async (values: PerderOportunidadeFormValues) => {
        if (!selectedId) return;
        await runWithToast(async () => { await perderMutation.mutateAsync({ id: selectedId, values }); close(); }, { success: { summary: 'Oportunidade perdida' }, error: { summary: 'Erro ao marcar como perdida' }, rethrow: true });
    };
    const converter = async (values: ConverterOportunidadeFormValues) => {
        if (!selectedId) return;
        await runWithToast(async () => { const resultado = await converterMutation.mutateAsync({ id: selectedId, values }); setConversao({ numeroPedido: resultado.numeroPedido, pedidoVendaId: resultado.pedidoVendaId, valorTotal: resultado.valorTotal }); close(); }, { success: { summary: 'Oportunidade convertida', detail: 'Pedido de venda criado.' }, error: { summary: 'Erro ao converter' }, rethrow: true });
    };

    const status = selected ? Number(selected.status) : 0;

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.estagio ?? null} options={estagioFilterOptions} onChange={(event) => updateFilter('estagio', event.value)} aria-label="Filtrar por estágio" />
            <Dropdown value={filters.status ?? null} options={statusOportunidadeFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <SearchInput ariaLabel="Buscar oportunidade" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
        </div>
    );

    return (
        <>
            <PageHeader title="Oportunidades" description="Funil comercial por estágio; ganhar/perder e converter em pedido de venda." actions={headerActions} />
            <Card>
                {oportunidadesQuery.error ? <ApiErrorPanel error={mapApiError(oportunidadesQuery.error)} /> : null}
                <DataTableServer<OportunidadeResponse> value={visibleRecords} totalRecords={records.length} loading={oportunidadesQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma oportunidade encontrada.">
                    <Column field="titulo" header="Título" />
                    <Column header="Valor estimado" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: OportunidadeResponse) => formatMoney(row.valorEstimado)} />
                    <Column header="Estágio" body={(row: OportunidadeResponse) => <Tag value={estagioLabel(Number(row.estagio))} severity={estagioSeverity(Number(row.estagio)) ?? undefined} />} />
                    <Column header="Status" body={(row: OportunidadeResponse) => <Tag value={statusOportunidadeLabel(Number(row.status))} severity={statusOportunidadeSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: OportunidadeResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'CRM_CONSULTAR', onClick: () => { setSelectedId(row.id); setConversao(null); } }]} />} />
                </DataTableServer>
                {!oportunidadesQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma oportunidade" description="Oportunidades surgem da qualificação de leads." /> : null}
            </Card>

            {selected ? (
                <Card title={selected.titulo} className="mt-3">
                    <div className="flex gap-2 flex-wrap mb-3 align-items-center">
                        <Tag value={statusOportunidadeLabel(status)} severity={statusOportunidadeSeverity(status) ?? undefined} />
                        <Tag value={estagioLabel(Number(selected.estagio))} severity={estagioSeverity(Number(selected.estagio)) ?? undefined} />
                        <span className="text-color-secondary">{formatMoney(selected.valorEstimado)} · previsão {formatDate(selected.dataPrevisaoFechamento)}</span>
                        <div className="flex-1" />
                        {oportunidadeAberta(status) ? (
                            <PermissionGuard permission="CRM_OPORTUNIDADES_GERENCIAR" mode="disable">
                                {({ disabled }) => (
                                    <span className="flex align-items-center gap-2">
                                        <label htmlFor="oppEstagio" className="text-color-secondary">Estágio</label>
                                        <Dropdown inputId="oppEstagio" value={Number(selected.estagio)} options={estagioOptions} disabled={disabled || estagioMutation.isPending} onChange={(event) => moverEstagio(event.value)} />
                                    </span>
                                )}
                            </PermissionGuard>
                        ) : null}
                        {oportunidadeAberta(status) ? <PermissionGuard permission="CRM_OPORTUNIDADES_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Ganhar" icon="pi pi-check" size="small" severity="success" disabled={disabled} onClick={() => setDialog('ganhar')} />}</PermissionGuard> : null}
                        {oportunidadeAberta(status) ? <PermissionGuard permission="CRM_OPORTUNIDADES_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Perder" icon="pi pi-times" size="small" severity="danger" outlined disabled={disabled} onClick={() => setDialog('perder')} />}</PermissionGuard> : null}
                        {oportunidadePodeConverter(status) ? <PermissionGuard permission="CRM_CONVERTER" mode="disable">{({ disabled }) => <Button label="Converter em pedido" icon="pi pi-shopping-cart" size="small" disabled={disabled} onClick={() => setDialog('converter')} />}</PermissionGuard> : null}
                    </div>

                    {conversao ? <Message className="w-full" severity="success" text={`Convertida — pedido de venda ${conversao.numeroPedido} (${conversao.pedidoVendaId}) no valor de ${formatMoney(conversao.valorTotal)}.`} /> : null}
                    {!conversao && selected.pedidoVendaId ? <Message className="w-full" severity="info" text={`Pedido de venda vinculado: ${selected.pedidoVendaId}.`} /> : null}
                </Card>
            ) : null}

            <GanharDialog visible={dialog === 'ganhar'} loading={ganharMutation.isPending} oportunidadeId={selectedId ?? ''} onHide={close} onSubmit={ganhar} />
            <PerderOportunidadeDialog visible={dialog === 'perder'} loading={perderMutation.isPending} onHide={close} onSubmit={perder} />
            <ConverterOportunidadeDialog visible={dialog === 'converter'} loading={converterMutation.isPending} onHide={close} onSubmit={converter} />
        </>
    );
};
