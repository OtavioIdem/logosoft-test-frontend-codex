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
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { BaixarReservaDialog, CancelarReservaDialog, ReservaEstoqueFormDialog } from '@/features/estoque/components/ReservaEstoqueDialogs';
import { EstoqueFilterBar } from '@/features/estoque/components/EstoqueFilterBar';
import { filterLocalRecords, formatQuantity } from '@/features/estoque/components/estoqueUiUtils';
import { calcularResumoReservas, reservaStatusLabel, reservaStatusSeverity } from '@/features/estoque/components/estoqueUxUtils';
import { useLocaisEstoque, useReservaEstoqueMutations, useReservasEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { BaixarReservaFormValues, CancelarReservaFormValues, EstoqueListQuery, ReservaEstoqueFormValues, ReservaEstoqueResponse } from '@/features/estoque/types/estoque.types';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { StatusReservaEstoque } from '@/types/erp';

const canOperate = (record: ReservaEstoqueResponse) => Number(record.statusReserva ?? record.status) === StatusReservaEstoque.Ativa || Number(record.statusReserva ?? record.status) === StatusReservaEstoque.ParcialmenteBaixada;

export const ReservasEstoquePage = () => {
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const [filters, setFilters] = useState<EstoqueListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [createVisible, setCreateVisible] = useState(false);
    const [baixarRecord, setBaixarRecord] = useState<ReservaEstoqueResponse | null>(null);
    const [cancelarRecord, setCancelarRecord] = useState<ReservaEstoqueResponse | null>(null);
    const reservasQuery = useReservasEstoque(filters);
    const produtosQuery = useProdutos({ empresaId: filters.empresaId, filialId: filters.filialId });
    const locaisQuery = useLocaisEstoque({ empresaId: filters.empresaId, filialId: filters.filialId });
    const { criarMutation, baixarMutation, cancelarMutation } = useReservaEstoqueMutations();
    const records = useMemo(() => filterLocalRecords(reservasQuery.data ?? [], localSearch), [reservasQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);
    const produtoLabelMap = useMemo(() => new Map((produtosQuery.data ?? []).map((produto) => [produto.id, `${produto.codigo} • ${produto.descricao}`])), [produtosQuery.data]);
    const localLabelMap = useMemo(() => new Map((locaisQuery.data ?? []).map((local) => [local.id, `${local.codigo} • ${local.nome}`])), [locaisQuery.data]);
    const resumo = useMemo(() => calcularResumoReservas(records), [records]);

    if (!hasPermission('ESTOQUE_RESERVAR')) return <UnauthorizedState description="Reservas exigem ESTOQUE_RESERVAR." />;
    const updateFilter = (name: keyof EstoqueListQuery, value: string | null) => { setFirst(0); setFilters((current) => ({ ...current, [name]: value || null })); };

    const criar = async (values: ReservaEstoqueFormValues) => {
        try {
            await criarMutation.mutateAsync(values);
            toast.success('Reserva criada', 'Reserva registrada com sucesso.');
            setCreateVisible(false);
        } catch (error) {
            toast.error('Erro ao reservar', error instanceof Error ? error.message : 'Não foi possível criar a reserva.');
            throw error;
        }
    };

    const baixar = async (values: BaixarReservaFormValues) => {
        if (!baixarRecord) return;
        try {
            await baixarMutation.mutateAsync({ id: baixarRecord.id, values });
            toast.success('Reserva baixada', 'Baixa de reserva concluída.');
            setBaixarRecord(null);
        } catch (error) {
            toast.error('Erro ao baixar reserva', error instanceof Error ? error.message : 'Não foi possível baixar a reserva.');
            throw error;
        }
    };

    const cancelar = async (values: CancelarReservaFormValues) => {
        if (!cancelarRecord) return;
        try {
            await cancelarMutation.mutateAsync({ id: cancelarRecord.id, values });
            toast.success('Reserva cancelada', 'Cancelamento de reserva concluído.');
            setCancelarRecord(null);
        } catch (error) {
            toast.error('Erro ao cancelar reserva', error instanceof Error ? error.message : 'Não foi possível cancelar a reserva.');
            throw error;
        }
    };

    return (
        <>
            <PageHeader title="Reservas de estoque" description="Criação, baixa e cancelamento de reservas com rastreabilidade operacional." actions={<div className="flex flex-column md:flex-row gap-2 md:align-items-center"><EstoqueFilterBar filters={filters} produtos={produtosQuery.data ?? []} locais={locaisQuery.data ?? []} showProduto showLocal search={localSearch} onSearchChange={(value) => { setFirst(0); setLocalSearch(value); }} onFilterChange={updateFilter} /><PermissionGuard permission="ESTOQUE_RESERVAR" mode="disable">{({ disabled }) => <Button label="Nova reserva" icon="pi pi-plus" disabled={disabled} onClick={() => setCreateVisible(true)} />}</PermissionGuard></div>} />
            <div className="grid mb-3">
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Reservas</span><strong className="text-2xl">{resumo.totalReservas}</strong></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Ativas</span><strong className="text-2xl">{resumo.ativas}</strong><small className="block text-color-secondary mt-2">{resumo.parcialmenteBaixadas} parcial(is)</small></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Baixadas/Canceladas</span><strong className="text-2xl">{resumo.baixadas + resumo.canceladas}</strong></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Quantidade reservada</span><strong className="text-2xl">{formatQuantity(resumo.quantidadeReservada)}</strong></Card></div>
            </div>
            <Card>
                {reservasQuery.error ? <ApiErrorPanel error={mapApiError(reservasQuery.error)} /> : null}
                <DataTableServer<ReservaEstoqueResponse> value={visibleRecords} totalRecords={records.length} loading={reservasQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }}>
                    <Column header="Produto" body={(row) => produtoLabelMap.get(row.produtoId) ?? 'Produto não carregado'} />
                    <Column header="Local" body={(row) => localLabelMap.get(row.localEstoqueId) ?? 'Local não carregado'} />
                    <Column header="Quantidade" body={(row: ReservaEstoqueResponse) => formatQuantity(row.quantidade)} />
                    <Column field="origemModulo" header="Origem" />
                    <Column header="Status" body={(row: ReservaEstoqueResponse) => <Tag value={reservaStatusLabel(row.statusReserva ?? row.status)} severity={reservaStatusSeverity(row.statusReserva ?? row.status)} />} />
                    <Column header="Ações" alignHeader="right" body={(row: ReservaEstoqueResponse) => <DataTableActions actions={[{ key: 'baixar', label: 'Baixar', icon: 'pi pi-download', permission: 'ESTOQUE_RESERVAR', disabled: !canOperate(row), onClick: () => setBaixarRecord(row) }, { key: 'cancelar', label: 'Cancelar', icon: 'pi pi-ban', severity: 'danger', permission: 'ESTOQUE_RESERVAR', disabled: !canOperate(row), onClick: () => setCancelarRecord(row) }]} />} />
                </DataTableServer>
                {!reservasQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma reserva" description="Crie uma reserva ou ajuste os filtros." /> : null}
            </Card>
            <ReservaEstoqueFormDialog visible={createVisible} produtos={produtosQuery.data ?? []} locais={locaisQuery.data ?? []} loading={criarMutation.isPending} onHide={() => setCreateVisible(false)} onSubmit={criar} />
            <BaixarReservaDialog visible={Boolean(baixarRecord)} loading={baixarMutation.isPending} onHide={() => setBaixarRecord(null)} onSubmit={baixar} />
            <CancelarReservaDialog visible={Boolean(cancelarRecord)} loading={cancelarMutation.isPending} onHide={() => setCancelarRecord(null)} onSubmit={cancelar} />
        </>
    );
};
