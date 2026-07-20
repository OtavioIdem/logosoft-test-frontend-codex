'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { SearchInput } from '@/components/forms/SearchInput';
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
import { useLancamento, useLancamentos, useLancamentoMutations } from '@/features/contabil/hooks/useContabilResources';
import { LancamentoContabilResumoResponse, LancamentoFormValues, LancamentosListQuery, PartidaContabilResponse, TipoPartida } from '@/features/contabil/types/contabil.types';
import { LancamentoFormDialog } from '@/features/contabil/components/ContabilDialogs';
import { lancamentoPodeEstornar, statusLancamentoFilterOptions, statusLancamentoLabel, statusLancamentoSeverity, tipoPartidaLabel } from '@/features/contabil/components/contabilLabels';

const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

const filterLocal = (records: LancamentoContabilResumoResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.numero ?? ''} ${record.historico}`.toLowerCase().includes(normalized));
};

export const LancamentosPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<LancamentosListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [estornarAlvo, setEstornarAlvo] = useState<string | null>(null);

    const lancamentosQuery = useLancamentos(filters, hasPermission('CONTABIL_CONSULTAR'));
    const detalheQuery = useLancamento(selectedId);
    const detalhe = detalheQuery.data ?? null;
    const { criarMutation, estornarMutation } = useLancamentoMutations();

    const records = useMemo(() => filterLocal(lancamentosQuery.data ?? [], localSearch), [lancamentosQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('CONTABIL_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Contábil exige a permissão CONTABIL_CONSULTAR." />;
    }

    const updateFilter = (name: keyof LancamentosListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const criar = async (values: LancamentoFormValues) => {
        await runWithToast(async () => { const criado = await criarMutation.mutateAsync(values); setFormVisible(false); setSelectedId(criado.id); }, { success: { summary: 'Lançamento registrado' }, error: { summary: 'Erro ao registrar lançamento' }, rethrow: true });
    };
    const estornar = async (motivo: string) => {
        if (!estornarAlvo) return;
        await runWithToast(async () => { await estornarMutation.mutateAsync({ id: estornarAlvo, motivo }); setEstornarAlvo(null); }, { success: { summary: 'Lançamento estornado' }, error: { summary: 'Erro ao estornar lançamento' }, rethrow: true });
    };

    const empresaSelecionada = Boolean(filters.empresaId);

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusLancamentoFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <SearchInput ariaLabel="Buscar lançamento" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="CONTABIL_LANCAMENTOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo lançamento" icon="pi pi-plus" disabled={disabled || !empresaSelecionada} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Lançamentos contábeis" description="Partidas dobradas com Σdébito = Σcrédito; só em conta analítica e período aberto." actions={headerActions} />
            <Card>
                {!empresaSelecionada ? <p className="text-color-secondary mt-0">Selecione a empresa para habilitar novos lançamentos.</p> : null}
                {lancamentosQuery.error ? <ApiErrorPanel error={mapApiError(lancamentosQuery.error)} /> : null}
                <DataTableServer<LancamentoContabilResumoResponse> value={visibleRecords} totalRecords={records.length} loading={lancamentosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum lançamento encontrado.">
                    <Column header="Número" body={(row: LancamentoContabilResumoResponse) => row.numero || row.id.slice(0, 8)} />
                    <Column header="Data" body={(row: LancamentoContabilResumoResponse) => formatDate(row.data)} />
                    <Column field="historico" header="Histórico" />
                    <Column header="Valor" body={(row: LancamentoContabilResumoResponse) => formatMoney(row.valorTotal)} />
                    <Column header="Status" body={(row: LancamentoContabilResumoResponse) => <Tag value={statusLancamentoLabel(Number(row.status))} severity={statusLancamentoSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: LancamentoContabilResumoResponse) => (
                        <DataTableActions actions={[
                            { key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'CONTABIL_CONSULTAR', onClick: () => setSelectedId(row.id) },
                            ...(lancamentoPodeEstornar(Number(row.status)) ? [{ key: 'estornar', label: 'Estornar', icon: 'pi pi-undo', severity: 'danger' as const, permission: 'CONTABIL_LANCAMENTOS_ESTORNAR' as const, onClick: () => setEstornarAlvo(row.id) }] : [])
                        ]} />
                    )} />
                </DataTableServer>
                {!lancamentosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum lançamento" description="Registre um lançamento ou ajuste os filtros." /> : null}
            </Card>

            {detalhe ? (
                <Card title={`Lançamento ${detalhe.numero || detalhe.id.slice(0, 8)}`} className="mt-3">
                    <div className="flex gap-2 flex-wrap mb-3 align-items-center">
                        <Tag value={statusLancamentoLabel(Number(detalhe.status))} severity={statusLancamentoSeverity(Number(detalhe.status)) ?? undefined} />
                        <span className="text-color-secondary">{formatDate(detalhe.data)} · {detalhe.historico}</span>
                    </div>
                    <DataTable value={detalhe.partidas} dataKey="id" emptyMessage="Nenhuma partida." responsiveLayout="scroll" stripedRows size="small">
                        <Column header="Conta" field="contaContabilId" />
                        <Column header="Tipo" body={(item: PartidaContabilResponse) => tipoPartidaLabel(Number(item.tipo))} />
                        <Column header="Débito" body={(item: PartidaContabilResponse) => (Number(item.tipo) === TipoPartida.Debito ? formatMoney(item.valor) : '—')} />
                        <Column header="Crédito" body={(item: PartidaContabilResponse) => (Number(item.tipo) === TipoPartida.Credito ? formatMoney(item.valor) : '—')} />
                        <Column field="historico" header="Histórico" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: PartidaContabilResponse) => item.historico || '—'} />
                    </DataTable>
                </Card>
            ) : null}

            <LancamentoFormDialog visible={formVisible} loading={criarMutation.isPending} empresaId={filters.empresaId ?? ''} filialId={filters.filialId ?? null} onHide={() => setFormVisible(false)} onSubmit={criar} />
            <ReasonDialog visible={Boolean(estornarAlvo)} title="Estornar lançamento" confirmLabel="Estornar" loading={estornarMutation.isPending} onHide={() => setEstornarAlvo(null)} onConfirm={estornar} />
        </>
    );
};
