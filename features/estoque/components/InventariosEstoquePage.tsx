'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { EstoqueFilterBar } from '@/features/estoque/components/EstoqueFilterBar';
import { InventarioFormDialog, InventarioItemDialog } from '@/features/estoque/components/InventarioEstoqueDialogs';
import { filterLocalRecords } from '@/features/estoque/components/estoqueUiUtils';
import { calcularResumoInventarios, inventarioStatusLabel, inventarioStatusSeverity, isInventarioEmContagem } from '@/features/estoque/components/estoqueUxUtils';
import { useInventarioEstoqueDetalhe, useInventarioEstoqueMutations, useInventariosEstoque, useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { EstoqueListQuery, InventarioFormValues, InventarioItemFormValues, InventarioResponse, ItemInventarioResponse } from '@/features/estoque/types/estoque.types';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { StatusInventario } from '@/types/erp';

const statusValue = (record: InventarioResponse) => record.statusInventario ?? record.status;
const isAberto = (record: InventarioResponse) => Number(statusValue(record)) === StatusInventario.Aberto || String(statusValue(record)).toLowerCase() === 'aberto';
const canStartCounting = (record: InventarioResponse) => isAberto(record);
const canCount = (record: InventarioResponse) => isAberto(record) || isInventarioEmContagem(statusValue(record));

export const InventariosEstoquePage = () => {
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const [filters, setFilters] = useState<EstoqueListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [createVisible, setCreateVisible] = useState(false);
    const [itemRecord, setItemRecord] = useState<InventarioResponse | null>(null);
    const [detailRecord, setDetailRecord] = useState<InventarioResponse | null>(null);
    const [reasonState, setReasonState] = useState<{ action: 'concluir' | 'cancelar'; record: InventarioResponse } | null>(null);
    const inventariosQuery = useInventariosEstoque(filters);
    const detalheQuery = useInventarioEstoqueDetalhe(detailRecord?.id ?? null);
    const locaisQuery = useLocaisEstoque({ empresaId: filters.empresaId, filialId: filters.filialId });
    const produtosQuery = useProdutos({ empresaId: filters.empresaId, filialId: filters.filialId });
    const { abrirMutation, adicionarItemMutation, iniciarContagemMutation, concluirMutation, cancelarMutation } = useInventarioEstoqueMutations();
    const records = useMemo(() => filterLocalRecords(inventariosQuery.data ?? [], localSearch), [inventariosQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);
    const localLabelMap = useMemo(() => new Map((locaisQuery.data ?? []).map((local) => [local.id, `${local.codigo} • ${local.nome}`])), [locaisQuery.data]);
    const produtoLabelMap = useMemo(() => new Map((produtosQuery.data ?? []).map((produto) => [produto.id, `${produto.codigo} • ${produto.descricao}`])), [produtosQuery.data]);
    const resumo = useMemo(() => calcularResumoInventarios(records), [records]);
    const detalhe = detalheQuery.data ?? detailRecord;

    if (!hasPermission('ESTOQUE_INVENTARIO_GERENCIAR')) return <UnauthorizedState description="Inventários exigem ESTOQUE_INVENTARIO_GERENCIAR." />;
    const updateFilter = (name: keyof EstoqueListQuery, value: string | null) => { setFirst(0); setFilters((current) => ({ ...current, [name]: value || null })); };

    const abrir = async (values: InventarioFormValues) => {
        try {
            await abrirMutation.mutateAsync(values);
            toast.success('Inventário aberto', 'Inventário registrado com sucesso.');
            setCreateVisible(false);
        } catch (error) {
            toast.error('Erro ao abrir inventário', error instanceof Error ? error.message : 'Não foi possível abrir inventário.');
            throw error;
        }
    };

    const adicionarItem = async (values: InventarioItemFormValues) => {
        if (!itemRecord) return;
        try {
            await adicionarItemMutation.mutateAsync({ id: itemRecord.id, values });
            toast.success('Item adicionado', 'Item incluído no inventário.');
            setItemRecord(null);
        } catch (error) {
            toast.error('Erro ao adicionar item', error instanceof Error ? error.message : 'Não foi possível adicionar item.');
            throw error;
        }
    };

    const iniciarContagem = async (record: InventarioResponse) => {
        try {
            await iniciarContagemMutation.mutateAsync(record.id);
            toast.success('Contagem iniciada', 'Inventário movido para contagem.');
        } catch (error) {
            toast.error('Erro ao iniciar contagem', error instanceof Error ? error.message : 'Não foi possível iniciar a contagem.');
        }
    };

    const executarMotivo = async (motivo: string) => {
        if (!reasonState) return;
        try {
            if (reasonState.action === 'concluir') await concluirMutation.mutateAsync({ id: reasonState.record.id, motivo });
            if (reasonState.action === 'cancelar') await cancelarMutation.mutateAsync({ id: reasonState.record.id, motivo });
            toast.success('Operação concluída', 'Inventário atualizado com sucesso.');
            setReasonState(null);
        } catch (error) {
            toast.error('Erro no inventário', error instanceof Error ? error.message : 'Não foi possível atualizar o inventário.');
        }
    };

    return (
        <>
            <PageHeader title="Inventários" description="Abertura, detalhe, contagem, conclusão e cancelamento de inventários." actions={<div className="flex flex-column md:flex-row gap-2 md:align-items-center"><EstoqueFilterBar filters={filters} locais={locaisQuery.data ?? []} showLocal search={localSearch} onSearchChange={(value) => { setFirst(0); setLocalSearch(value); }} onFilterChange={updateFilter} /><PermissionGuard permission="ESTOQUE_INVENTARIO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Abrir inventário" icon="pi pi-plus" disabled={disabled} onClick={() => setCreateVisible(true)} />}</PermissionGuard></div>} />
            <div className="grid mb-3">
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Inventários</span><strong className="text-2xl">{resumo.totalInventarios}</strong></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Abertos</span><strong className="text-2xl">{resumo.abertos}</strong><small className="block text-color-secondary mt-2">{resumo.emContagem ?? 0} em contagem</small></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Concluídos</span><strong className="text-2xl">{resumo.fechados}</strong><small className="block text-color-secondary mt-2">{resumo.cancelados} cancelado(s)</small></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Itens contados</span><strong className="text-2xl">{resumo.itensContados}</strong></Card></div>
            </div>
            {detalhe ? (
                <Card className="mb-3" title={`Detalhe do inventário ${detalhe.codigo}`}>
                    {detalheQuery.error ? <ApiErrorPanel error={mapApiError(detalheQuery.error)} /> : null}
                    <DataTableServer<ItemInventarioResponse> value={detalhe.itens ?? []} totalRecords={detalhe.itens?.length ?? 0} loading={detalheQuery.isFetching} first={0} rows={5} onPage={() => undefined} emptyMessage="Nenhum item no inventário.">
                        <Column header="Produto" body={(item: ItemInventarioResponse) => produtoLabelMap.get(item.produtoId) ?? item.produtoId} />
                        <Column field="quantidadeContada" header="Quantidade contada" />
                        <Column field="observacao" header="Observação" />
                    </DataTableServer>
                </Card>
            ) : null}
            <Card>
                {inventariosQuery.error ? <ApiErrorPanel error={mapApiError(inventariosQuery.error)} /> : null}
                <DataTableServer<InventarioResponse> value={visibleRecords} totalRecords={records.length} loading={inventariosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }}>
                    <Column field="codigo" header="Código" />
                    <Column header="Local" body={(row) => localLabelMap.get(row.localEstoqueId) ?? 'Local não carregado'} />
                    <Column field="descricao" header="Descrição" />
                    <Column header="Status" body={(row: InventarioResponse) => <Tag value={inventarioStatusLabel(statusValue(row))} severity={inventarioStatusSeverity(statusValue(row))} />} />
                    <Column header="Itens" body={(row: InventarioResponse) => row.itens?.length ?? 0} />
                    <Column header="Ações" alignHeader="right" body={(row: InventarioResponse) => <DataTableActions actions={[{ key: 'detalhe', label: 'Detalhes', icon: 'pi pi-eye', permission: 'ESTOQUE_INVENTARIO_GERENCIAR', onClick: () => setDetailRecord(row) }, { key: 'iniciar', label: 'Iniciar contagem', icon: 'pi pi-play', permission: 'ESTOQUE_INVENTARIO_GERENCIAR', disabled: !canStartCounting(row), onClick: () => iniciarContagem(row) }, { key: 'item', label: 'Adicionar item', icon: 'pi pi-list', permission: 'ESTOQUE_INVENTARIO_GERENCIAR', disabled: !canCount(row), onClick: () => setItemRecord(row) }, { key: 'concluir', label: 'Concluir', icon: 'pi pi-check', permission: 'ESTOQUE_INVENTARIO_GERENCIAR', disabled: !canCount(row), onClick: () => setReasonState({ action: 'concluir', record: row }) }, { key: 'cancelar', label: 'Cancelar', icon: 'pi pi-ban', severity: 'danger', permission: 'ESTOQUE_INVENTARIO_GERENCIAR', disabled: !canCount(row), onClick: () => setReasonState({ action: 'cancelar', record: row }) }]} />} />
                </DataTableServer>
                {!inventariosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum inventário" description="Abra um inventário ou ajuste os filtros." /> : null}
            </Card>
            <InventarioFormDialog visible={createVisible} locais={locaisQuery.data ?? []} loading={abrirMutation.isPending} onHide={() => setCreateVisible(false)} onSubmit={abrir} />
            <InventarioItemDialog visible={Boolean(itemRecord)} produtos={produtosQuery.data ?? []} loading={adicionarItemMutation.isPending} onHide={() => setItemRecord(null)} onSubmit={adicionarItem} />
            <ReasonDialog visible={Boolean(reasonState)} title={reasonState?.action === 'concluir' ? 'Motivo para concluir inventário' : 'Motivo do cancelamento'} confirmLabel={reasonState?.action === 'concluir' ? 'Concluir' : 'Cancelar'} loading={concluirMutation.isPending || cancelarMutation.isPending} onHide={() => setReasonState(null)} onConfirm={executarMotivo} />
        </>
    );
};
