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
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useBens, useInventariosPatrimonio, useInventarioPatrimonio, useInventarioPatrimonioMutations } from '@/features/patrimonio/hooks/usePatrimonioResources';
import { AbrirInventarioPatrimonioFormValues, InventarioPatrimonialResumoResponse, InventariosListQuery, ItemInventarioPatrimonioResponse, RegistrarContagemFormValues } from '@/features/patrimonio/types/patrimonio.types';
import { AbrirInventarioDialog, ContagemDialog } from '@/features/patrimonio/components/PatrimonioDialogs';
import { inventarioPatrimonioAberto, statusInventarioFilterOptions, statusInventarioPatrimonioLabel, statusInventarioPatrimonioSeverity } from '@/features/patrimonio/components/patrimonioLabels';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

export const InventariosPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<InventariosListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [abrirVisible, setAbrirVisible] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [contagemAlvo, setContagemAlvo] = useState<ItemInventarioPatrimonioResponse | null>(null);

    const inventariosQuery = useInventariosPatrimonio(filters, hasPermission('PATRIMONIO_CONSULTAR'));
    const detalheQuery = useInventarioPatrimonio(selectedId);
    const detalhe = detalheQuery.data ?? null;
    const { abrirMutation, contagemMutation, encerrarMutation } = useInventarioPatrimonioMutations();

    const bensQuery = useBens({ empresaId: detalhe?.empresaId ?? null, filialId: detalhe?.filialId ?? null }, Boolean(detalhe));
    const bemDescricao = useMemo(() => {
        const map = new Map((bensQuery.data ?? []).map((bem) => [bem.id, `${bem.codigo} - ${bem.descricao}`]));
        return (id: string) => map.get(id) ?? id;
    }, [bensQuery.data]);

    const records = useMemo(() => inventariosQuery.data ?? [], [inventariosQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('PATRIMONIO_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Patrimônio exige a permissão PATRIMONIO_CONSULTAR." />;
    }

    const updateFilter = (name: keyof InventariosListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const abrir = async (values: AbrirInventarioPatrimonioFormValues) => {
        await runWithToast(async () => { const criado = await abrirMutation.mutateAsync(values); setAbrirVisible(false); setSelectedId(criado.id); }, { success: { summary: 'Inventário aberto' }, error: { summary: 'Erro ao abrir inventário' }, rethrow: true });
    };
    const contar = async (values: RegistrarContagemFormValues) => {
        if (!selectedId) return;
        await runWithToast(async () => { await contagemMutation.mutateAsync({ id: selectedId, values }); setContagemAlvo(null); }, { success: { summary: 'Contagem registrada' }, error: { summary: 'Erro ao registrar contagem' }, rethrow: true });
    };
    const encerrar = () => selectedId && runWithToast(() => encerrarMutation.mutateAsync(selectedId), { success: { summary: 'Inventário encerrado', detail: 'Divergências apuradas.' }, error: { summary: 'Erro ao encerrar inventário' } });

    const status = detalhe ? Number(detalhe.status) : 0;
    const aberto = inventarioPatrimonioAberto(status);

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusInventarioFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <PermissionGuard permission="PATRIMONIO_INVENTARIO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Abrir inventário" icon="pi pi-plus" disabled={disabled} onClick={() => setAbrirVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Inventário patrimonial" description="Abertura, contagem e encerramento (apura divergências)." actions={headerActions} />
            <Card>
                {inventariosQuery.error ? <ApiErrorPanel error={mapApiError(inventariosQuery.error)} /> : null}
                <DataTableServer<InventarioPatrimonialResumoResponse> value={visibleRecords} totalRecords={records.length} loading={inventariosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum inventário encontrado.">
                    <Column field="descricao" header="Descrição" />
                    <Column header="Referência" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: InventarioPatrimonialResumoResponse) => formatDate(row.dataReferencia)} />
                    <Column header="Itens" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: InventarioPatrimonialResumoResponse) => row.totalItens ?? '—'} />
                    <Column header="Status" body={(row: InventarioPatrimonialResumoResponse) => <Tag value={statusInventarioPatrimonioLabel(Number(row.status))} severity={statusInventarioPatrimonioSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: InventarioPatrimonialResumoResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'PATRIMONIO_CONSULTAR', onClick: () => setSelectedId(row.id) }]} />} />
                </DataTableServer>
                {!inventariosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum inventário" description="Abra um inventário ou ajuste os filtros." /> : null}
            </Card>

            {detalhe ? (
                <Card title={`Inventário: ${detalhe.descricao}`} className="mt-3">
                    <div className="flex gap-2 flex-wrap mb-3 align-items-center">
                        <Tag value={statusInventarioPatrimonioLabel(status)} severity={statusInventarioPatrimonioSeverity(status) ?? undefined} />
                        <span className="text-color-secondary">Referência {formatDate(detalhe.dataReferencia)}{detalhe.divergencias != null ? ` · ${detalhe.divergencias} divergência(s)` : ''}</span>
                        <div className="flex-1" />
                        {aberto ? <PermissionGuard permission="PATRIMONIO_INVENTARIO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Encerrar" icon="pi pi-flag" size="small" severity="success" disabled={disabled} loading={encerrarMutation.isPending} onClick={encerrar} />}</PermissionGuard> : null}
                    </div>
                    <DataTable value={detalhe.itens} dataKey="id" emptyMessage="Nenhum item." responsiveLayout="scroll" stripedRows size="small">
                        <Column header="Bem" body={(item: ItemInventarioPatrimonioResponse) => bemDescricao(item.bemId)} />
                        <Column header="Contado" body={(item: ItemInventarioPatrimonioResponse) => (item.contado ? <Tag value={item.localizado ? 'Localizado' : 'Não localizado'} severity={item.localizado ? 'success' : 'danger'} /> : <Tag value="Pendente" severity="warning" />)} />
                        <Column field="observacao" header="Observação" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: ItemInventarioPatrimonioResponse) => item.observacao || '—'} />
                        <Column header="Ações" alignHeader="right" body={(item: ItemInventarioPatrimonioResponse) => (
                            aberto ? <PermissionGuard permission="PATRIMONIO_INVENTARIO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Contar" icon="pi pi-check-square" size="small" text disabled={disabled} onClick={() => setContagemAlvo(item)} />}</PermissionGuard> : <span className="text-color-secondary">—</span>
                        )} />
                    </DataTable>
                </Card>
            ) : null}

            <AbrirInventarioDialog visible={abrirVisible} loading={abrirMutation.isPending} onHide={() => setAbrirVisible(false)} onSubmit={abrir} />
            <ContagemDialog visible={Boolean(contagemAlvo)} loading={contagemMutation.isPending} itemId={contagemAlvo?.id ?? ''} bemDescricao={contagemAlvo ? bemDescricao(contagemAlvo.bemId) : ''} empresaId={detalhe?.empresaId ?? null} filialId={detalhe?.filialId ?? null} onHide={() => setContagemAlvo(null)} onSubmit={contar} />
        </>
    );
};
