'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
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
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useLoteMutations, useLotes } from '@/features/alimentar/hooks/useAlimentarResources';
import { LoteFormValues, LoteResponse, LotesListQuery, MovimentacaoLoteFormValues } from '@/features/alimentar/types/alimentar.types';
import { LoteFormDialog, MovimentacaoLoteDialog } from '@/features/alimentar/components/AlimentarDialogs';
import { lotePodeBloquear, lotePodeDesbloquear, statusLoteFilterOptions, statusLoteLabel, statusLoteSeverity } from '@/features/alimentar/components/alimentarLabels';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

const validadeTag = (lote: LoteResponse) => {
    if (lote.vencido) return <Tag value={`${formatDate(lote.dataValidade)} · vencido`} severity="danger" />;
    if (lote.diasParaVencer != null && lote.diasParaVencer <= 30) return <Tag value={`${formatDate(lote.dataValidade)} · ${lote.diasParaVencer}d`} severity="warning" />;
    return <span>{formatDate(lote.dataValidade)}</span>;
};

const filterLocal = (records: LoteResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.numeroLote} ${record.documentoOrigem ?? ''}`.toLowerCase().includes(normalized));
};

export const LotesPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<LotesListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [aVencer, setAVencer] = useState(false);
    const [dias, setDias] = useState<number>(30);
    const [formVisible, setFormVisible] = useState(false);
    const [movLote, setMovLote] = useState<LoteResponse | null>(null);
    const [bloquearAlvo, setBloquearAlvo] = useState<string | null>(null);

    const lotesQuery = useLotes(filters, aVencer ? dias : null, hasPermission('ALIMENTAR_CONSULTAR'));
    const produtosQuery = useProdutos({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null });
    const { criarMutation, bloquearMutation, desbloquearMutation, movimentarMutation } = useLoteMutations();

    const produtoLabel = useMemo(() => {
        const map = new Map((produtosQuery.data ?? []).map((produto) => [produto.id, `${produto.codigo} - ${produto.descricao}`]));
        return (id: string) => map.get(id) ?? id;
    }, [produtosQuery.data]);

    const records = useMemo(() => filterLocal(lotesQuery.data ?? [], localSearch), [lotesQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('ALIMENTAR_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Alimentar exige a permissão ALIMENTAR_CONSULTAR." />;
    }

    const updateFilter = (name: keyof LotesListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const criar = async (values: LoteFormValues) => {
        await runWithToast(async () => { await criarMutation.mutateAsync(values); setFormVisible(false); }, { success: { summary: 'Lote criado' }, error: { summary: 'Erro ao criar lote' }, rethrow: true });
    };
    const movimentar = async (values: MovimentacaoLoteFormValues) => {
        await runWithToast(async () => { await movimentarMutation.mutateAsync(values); }, { success: { summary: 'Movimentação registrada' }, error: { summary: 'Erro ao registrar movimentação' }, rethrow: true });
    };
    const bloquear = async (motivo: string) => {
        if (!bloquearAlvo) return;
        await runWithToast(async () => { await bloquearMutation.mutateAsync({ id: bloquearAlvo, motivo }); setBloquearAlvo(null); }, { success: { summary: 'Lote bloqueado' }, error: { summary: 'Erro ao bloquear lote' }, rethrow: true });
    };
    const desbloquear = (id: string) => runWithToast(() => desbloquearMutation.mutateAsync(id), { success: { summary: 'Lote desbloqueado' }, error: { summary: 'Erro ao desbloquear lote' } });

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusLoteFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <SearchInput ariaLabel="Buscar lote" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="ALIMENTAR_LOTES_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo lote" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Lotes" description="Rastreabilidade por lote/validade, movimentações e bloqueio de saldo." actions={headerActions} />
            <Card>
                <div className="flex align-items-center gap-2 mb-3">
                    <InputSwitch inputId="aVencer" checked={aVencer} onChange={(event) => { setFirst(0); setAVencer(Boolean(event.value)); }} />
                    <label htmlFor="aVencer" className="font-medium">Somente a vencer em</label>
                    <InputNumber value={dias} onValueChange={(event) => setDias(event.value ?? 30)} min={1} max={365} disabled={!aVencer} showButtons buttonLayout="horizontal" style={{ width: '7rem' }} suffix=" dias" />
                </div>
                {lotesQuery.error ? <ApiErrorPanel error={mapApiError(lotesQuery.error)} /> : null}
                <DataTableServer<LoteResponse> value={visibleRecords} totalRecords={records.length} loading={lotesQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum lote encontrado.">
                    <Column field="numeroLote" header="Lote" />
                    <Column header="Produto" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: LoteResponse) => produtoLabel(row.produtoId)} />
                    <Column header="Validade" body={(row: LoteResponse) => validadeTag(row)} />
                    <Column header="Qtd. atual" body={(row: LoteResponse) => row.quantidadeAtual.toLocaleString('pt-BR')} />
                    <Column header="Status" body={(row: LoteResponse) => <Tag value={statusLoteLabel(Number(row.status))} severity={statusLoteSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: LoteResponse) => {
                        const acoes = [{ key: 'mov', label: 'Movimentações', icon: 'pi pi-list', permission: 'ALIMENTAR_CONSULTAR' as const, onClick: () => setMovLote(row) }] as { key: string; label: string; icon: string; severity?: 'danger'; permission: 'ALIMENTAR_CONSULTAR' | 'ALIMENTAR_LOTES_GERENCIAR'; onClick: () => void }[];
                        if (lotePodeBloquear(Number(row.status))) acoes.push({ key: 'bloquear', label: 'Bloquear', icon: 'pi pi-lock', severity: 'danger', permission: 'ALIMENTAR_LOTES_GERENCIAR', onClick: () => setBloquearAlvo(row.id) });
                        if (lotePodeDesbloquear(Number(row.status))) acoes.push({ key: 'desbloquear', label: 'Desbloquear', icon: 'pi pi-unlock', permission: 'ALIMENTAR_LOTES_GERENCIAR', onClick: () => desbloquear(row.id) });
                        return <DataTableActions actions={acoes} />;
                    }} />
                </DataTableServer>
                {!lotesQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum lote" description="Crie um lote ou ajuste os filtros." /> : null}
            </Card>

            <LoteFormDialog visible={formVisible} loading={criarMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={criar} />
            <MovimentacaoLoteDialog visible={Boolean(movLote)} loading={movimentarMutation.isPending} loteId={movLote?.id ?? ''} numeroLote={movLote?.numeroLote ?? ''} onHide={() => setMovLote(null)} onSubmit={movimentar} />
            <ReasonDialog visible={Boolean(bloquearAlvo)} title="Bloquear lote" confirmLabel="Bloquear" loading={bloquearMutation.isPending} onHide={() => setBloquearAlvo(null)} onConfirm={bloquear} />
        </>
    );
};
