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
import { calcularResumoInventarios, inventarioStatusLabel, inventarioStatusSeverity } from '@/features/estoque/components/estoqueUxUtils';
import { useInventarioEstoqueMutations, useInventariosEstoque, useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { EstoqueListQuery, InventarioFormValues, InventarioItemFormValues, InventarioResponse } from '@/features/estoque/types/estoque.types';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { StatusInventario } from '@/types/erp';

const canOperate = (record: InventarioResponse) => Number(record.statusInventario ?? record.status) === StatusInventario.Aberto;

export const InventariosEstoquePage = () => {
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const [filters, setFilters] = useState<EstoqueListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [createVisible, setCreateVisible] = useState(false);
    const [itemRecord, setItemRecord] = useState<InventarioResponse | null>(null);
    const [reasonState, setReasonState] = useState<{ action: 'fechar' | 'cancelar'; record: InventarioResponse } | null>(null);
    const inventariosQuery = useInventariosEstoque(filters);
    const locaisQuery = useLocaisEstoque({ empresaId: filters.empresaId, filialId: filters.filialId });
    const produtosQuery = useProdutos({ empresaId: filters.empresaId, filialId: filters.filialId });
    const { abrirMutation, adicionarItemMutation, fecharMutation, cancelarMutation } = useInventarioEstoqueMutations();
    const records = useMemo(() => filterLocalRecords(inventariosQuery.data ?? [], localSearch), [inventariosQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);
    const localLabelMap = useMemo(() => new Map((locaisQuery.data ?? []).map((local) => [local.id, `${local.codigo} • ${local.nome}`])), [locaisQuery.data]);
    const resumo = useMemo(() => calcularResumoInventarios(records), [records]);

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

    const executarMotivo = async (motivo: string) => {
        if (!reasonState) return;
        try {
            if (reasonState.action === 'fechar') await fecharMutation.mutateAsync({ id: reasonState.record.id, motivo });
            if (reasonState.action === 'cancelar') await cancelarMutation.mutateAsync({ id: reasonState.record.id, motivo });
            toast.success('Operação concluída', 'Inventário atualizado com sucesso.');
            setReasonState(null);
        } catch (error) {
            toast.error('Erro no inventário', error instanceof Error ? error.message : 'Não foi possível atualizar o inventário.');
        }
    };

    return (
        <>
            <PageHeader title="Inventários" description="Abertura, contagem, fechamento e cancelamento de inventários." actions={<div className="flex flex-column md:flex-row gap-2 md:align-items-center"><EstoqueFilterBar filters={filters} locais={locaisQuery.data ?? []} showLocal search={localSearch} onSearchChange={(value) => { setFirst(0); setLocalSearch(value); }} onFilterChange={updateFilter} /><PermissionGuard permission="ESTOQUE_INVENTARIO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Abrir inventário" icon="pi pi-plus" disabled={disabled} onClick={() => setCreateVisible(true)} />}</PermissionGuard></div>} />
            <div className="grid mb-3">
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Inventários</span><strong className="text-2xl">{resumo.totalInventarios}</strong></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Abertos</span><strong className="text-2xl">{resumo.abertos}</strong></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Fechados</span><strong className="text-2xl">{resumo.fechados}</strong><small className="block text-color-secondary mt-2">{resumo.cancelados} cancelado(s)</small></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Itens contados</span><strong className="text-2xl">{resumo.itensContados}</strong></Card></div>
            </div>
            <Card>
                {inventariosQuery.error ? <ApiErrorPanel error={mapApiError(inventariosQuery.error)} /> : null}
                <DataTableServer<InventarioResponse> value={visibleRecords} totalRecords={records.length} loading={inventariosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }}>
                    <Column field="codigo" header="Código" />
                    <Column header="Local" body={(row) => localLabelMap.get(row.localEstoqueId) ?? 'Local não carregado'} />
                    <Column field="descricao" header="Descrição" />
                    <Column header="Status" body={(row: InventarioResponse) => <Tag value={inventarioStatusLabel(row.statusInventario ?? row.status)} severity={inventarioStatusSeverity(row.statusInventario ?? row.status)} />} />
                    <Column header="Itens" body={(row: InventarioResponse) => row.itens?.length ?? 0} />
                    <Column header="Ações" alignHeader="right" body={(row: InventarioResponse) => <DataTableActions actions={[{ key: 'item', label: 'Adicionar item', icon: 'pi pi-list', permission: 'ESTOQUE_INVENTARIO_GERENCIAR', disabled: !canOperate(row), onClick: () => setItemRecord(row) }, { key: 'fechar', label: 'Fechar', icon: 'pi pi-check', permission: 'ESTOQUE_INVENTARIO_GERENCIAR', disabled: !canOperate(row), onClick: () => setReasonState({ action: 'fechar', record: row }) }, { key: 'cancelar', label: 'Cancelar', icon: 'pi pi-ban', severity: 'danger', permission: 'ESTOQUE_INVENTARIO_GERENCIAR', disabled: !canOperate(row), onClick: () => setReasonState({ action: 'cancelar', record: row }) }]} />} />
                </DataTableServer>
                {!inventariosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum inventário" description="Abra um inventário ou ajuste os filtros." /> : null}
            </Card>
            <InventarioFormDialog visible={createVisible} locais={locaisQuery.data ?? []} loading={abrirMutation.isPending} onHide={() => setCreateVisible(false)} onSubmit={abrir} />
            <InventarioItemDialog visible={Boolean(itemRecord)} produtos={produtosQuery.data ?? []} loading={adicionarItemMutation.isPending} onHide={() => setItemRecord(null)} onSubmit={adicionarItem} />
            <ReasonDialog visible={Boolean(reasonState)} title={reasonState?.action === 'fechar' ? 'Motivo do fechamento' : 'Motivo do cancelamento'} confirmLabel={reasonState?.action === 'fechar' ? 'Fechar' : 'Cancelar'} loading={fecharMutation.isPending || cancelarMutation.isPending} onHide={() => setReasonState(null)} onConfirm={executarMotivo} />
        </>
    );
};
