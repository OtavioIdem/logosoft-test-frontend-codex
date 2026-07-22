'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useInventarioAvancado, useInventariosAvancado, useInventariosAvancadoMutations } from '@/features/estoque-avancado/hooks/useEstoqueAvancadoResources';
import { CriarInventarioFormValues, InventarioEstoqueResumoResponse, InventariosListQuery, ItemInventarioEstoqueResponse, ItemInventarioFormValues } from '@/features/estoque-avancado/types/estoqueAvancado.types';
import { CriarInventarioDialog, ConcluirInventarioDialog, ItemInventarioDialog } from '@/features/estoque-avancado/components/InventarioDialogs';
import { inventarioPodeCancelar, inventarioPodeConcluir, inventarioPodeIniciar, inventarioPodeItens, statusInventarioLabel, statusInventarioOptions, statusInventarioSeverity } from '@/features/estoque-avancado/components/estoqueAvancadoLabels';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

export const InventariosOperacionaisTab = () => {
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<Pick<InventariosListQuery, 'empresaId' | 'filialId' | 'status'>>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dialog, setDialog] = useState<'criar' | 'item' | 'concluir' | 'cancelar' | null>(null);

    const page = Math.floor(first / rows) + 1;
    const listQuery = useMemo<InventariosListQuery>(() => ({ ...filters, page, pageSize: rows }), [filters, page, rows]);
    const inventariosQuery = useInventariosAvancado(listQuery);
    const detalheQuery = useInventarioAvancado(selectedId);
    const detalhe = detalheQuery.data ?? null;
    const { criarMutation, itemMutation, iniciarMutation, concluirMutation, cancelarMutation } = useInventariosAvancadoMutations();

    const produtosQuery = useProdutos({ empresaId: detalhe?.empresaId ?? null, filialId: detalhe?.filialId ?? null });
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);
    const produtoLabel = (id: string) => produtoOptions.find((option) => option.value === id)?.label ?? id;

    const paged = inventariosQuery.data;
    const inventarios = paged?.items ?? [];
    const totalRecords = paged?.totalItems ?? 0;

    const updateFilter = (name: 'empresaId' | 'filialId' | 'status', value: string | number | null) => { setFirst(0); setFilters((c) => ({ ...c, [name]: value === '' ? null : value })); };
    const close = () => setDialog(null);

    const criar = async (values: CriarInventarioFormValues) => {
        await runWithToast(async () => { const criado = await criarMutation.mutateAsync(values); close(); setSelectedId(criado.id); }, { success: { summary: 'Inventário criado' }, error: { summary: 'Erro ao criar inventário' }, rethrow: true });
    };
    const adicionarItem = async (values: ItemInventarioFormValues) => {
        if (!selectedId) return;
        await runWithToast(async () => { await itemMutation.mutateAsync({ id: selectedId, values }); close(); }, { success: { summary: 'Item adicionado' }, error: { summary: 'Erro ao adicionar item' }, rethrow: true });
    };
    const iniciar = () => selectedId && runWithToast(() => iniciarMutation.mutateAsync(selectedId), { success: { summary: 'Contagem iniciada' }, error: { summary: 'Erro ao iniciar contagem' } });
    const concluir = async (motivoAjuste: string) => {
        if (!selectedId) return;
        await runWithToast(async () => { await concluirMutation.mutateAsync({ id: selectedId, values: { motivoAjuste } }); close(); }, { success: { summary: 'Inventário concluído', detail: 'Divergências geraram ajustes.' }, error: { summary: 'Erro ao concluir' }, rethrow: true });
    };
    const cancelar = async (motivo: string) => {
        if (!selectedId) return;
        await runWithToast(async () => { await cancelarMutation.mutateAsync({ id: selectedId, motivo }); close(); }, { success: { summary: 'Inventário cancelado' }, error: { summary: 'Erro ao cancelar' }, rethrow: true });
    };

    const status = detalhe ? Number(detalhe.status) : 0;

    return (
        <>
            <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center mb-3">
                <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
                <Dropdown value={filters.status ?? null} options={statusInventarioOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
                <PermissionGuard permission="ESTOQUE_INVENTARIO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo inventário" icon="pi pi-plus" disabled={disabled} onClick={() => setDialog('criar')} />}</PermissionGuard>
            </div>

            {inventariosQuery.error ? <ApiErrorPanel error={mapApiError(inventariosQuery.error)} /> : null}
            <DataTableServer<InventarioEstoqueResumoResponse> value={inventarios} totalRecords={totalRecords} loading={inventariosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum inventário encontrado.">
                <Column field="descricao" header="Descrição" />
                <Column header="Referência" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: InventarioEstoqueResumoResponse) => formatDate(row.dataReferencia)} />
                <Column header="Status" body={(row: InventarioEstoqueResumoResponse) => <Tag value={statusInventarioLabel(Number(row.status))} severity={statusInventarioSeverity(Number(row.status)) ?? undefined} />} />
                <Column header="Ações" alignHeader="right" body={(row: InventarioEstoqueResumoResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'ESTOQUE_CONSULTAR', onClick: () => setSelectedId(row.id) }]} />} />
            </DataTableServer>

            {detalhe ? (
                <Card title={`Inventário: ${detalhe.descricao}`} className="mt-3">
                    <div className="flex gap-2 flex-wrap mb-3 align-items-center">
                        <Tag value={statusInventarioLabel(status)} severity={statusInventarioSeverity(status) ?? undefined} />
                        <span className="text-color-secondary">Referência {formatDate(detalhe.dataReferencia)}</span>
                        <div className="flex-1" />
                        {inventarioPodeItens(status) ? <PermissionGuard permission="ESTOQUE_INVENTARIO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Adicionar item" icon="pi pi-plus" size="small" severity="secondary" disabled={disabled} onClick={() => setDialog('item')} />}</PermissionGuard> : null}
                        {inventarioPodeIniciar(status) ? <PermissionGuard permission="ESTOQUE_INVENTARIO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Iniciar contagem" icon="pi pi-play" size="small" disabled={disabled} loading={iniciarMutation.isPending} onClick={iniciar} />}</PermissionGuard> : null}
                        {inventarioPodeConcluir(status) ? <PermissionGuard permission="ESTOQUE_INVENTARIO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Concluir" icon="pi pi-check" size="small" severity="success" disabled={disabled} onClick={() => setDialog('concluir')} />}</PermissionGuard> : null}
                        {inventarioPodeCancelar(status) ? <PermissionGuard permission="ESTOQUE_INVENTARIO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Cancelar" icon="pi pi-ban" size="small" severity="danger" outlined disabled={disabled} onClick={() => setDialog('cancelar')} />}</PermissionGuard> : null}
                    </div>
                    <DataTable value={detalhe.itens} dataKey="id" emptyMessage="Nenhum item." responsiveLayout="scroll" stripedRows size="small">
                        <Column header="Produto" body={(item: ItemInventarioEstoqueResponse) => produtoLabel(item.produtoId)} />
                        <Column header="Sistema" body={(item: ItemInventarioEstoqueResponse) => item.quantidadeSistema} />
                        <Column header="Contada" body={(item: ItemInventarioEstoqueResponse) => item.quantidadeContada} />
                        <Column header="Divergência" body={(item: ItemInventarioEstoqueResponse) => <span className={item.divergencia === 0 ? '' : 'text-orange-600'}>{item.divergencia}</span>} />
                        <Column field="observacao" header="Observação" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" />
                    </DataTable>
                </Card>
            ) : null}

            <CriarInventarioDialog visible={dialog === 'criar'} loading={criarMutation.isPending} onHide={close} onSubmit={criar} />
            <ItemInventarioDialog visible={dialog === 'item'} loading={itemMutation.isPending} produtoOptions={produtoOptions} onHide={close} onSubmit={adicionarItem} />
            <ConcluirInventarioDialog visible={dialog === 'concluir'} loading={concluirMutation.isPending} onHide={close} onSubmit={concluir} />
            <ReasonDialog visible={dialog === 'cancelar'} title="Cancelar inventário" confirmLabel="Cancelar inventário" loading={cancelarMutation.isPending} onHide={close} onConfirm={cancelar} />
        </>
    );
};
