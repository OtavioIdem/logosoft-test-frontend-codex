'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { StatusTag } from '@/components/data/StatusTag';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { EstoqueFilterBar } from '@/features/estoque/components/EstoqueFilterBar';
import { LocalEstoqueFormDialog } from '@/features/estoque/components/LocalEstoqueFormDialog';
import { filterLocalRecords } from '@/features/estoque/components/estoqueUiUtils';
import { useLocalEstoqueMutations, useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { EstoqueListQuery, LocalEstoqueFormValues, LocalEstoqueResponse } from '@/features/estoque/types/estoque.types';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { EntityStatus } from '@/types/erp';

const isActive = (record: LocalEstoqueResponse) => Number(record.status) === EntityStatus.Ativo;

export const LocaisEstoquePage = () => {
    const runWithToast = useMutationWithToast();
    const { hasPermission } = usePermissions();
    const [filters, setFilters] = useState<EstoqueListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [selected, setSelected] = useState<LocalEstoqueResponse | null>(null);
    const [reasonRecord, setReasonRecord] = useState<LocalEstoqueResponse | null>(null);
    const listQuery = useLocaisEstoque(filters);
    const { saveMutation, inativarMutation } = useLocalEstoqueMutations(filters);

    const records = useMemo(() => filterLocalRecords(listQuery.data ?? [], localSearch), [listQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);
    const resumo = useMemo(() => ({ total: records.length, ativos: records.filter(isActive).length, inativos: records.filter((record) => !isActive(record)).length }), [records]);

    if (!hasPermission('ESTOQUE_CONSULTAR')) return <UnauthorizedState description="Locais de estoque exigem ESTOQUE_CONSULTAR." />;

    const updateFilter = (name: keyof EstoqueListQuery, value: string | null) => { setFirst(0); setFilters((current) => ({ ...current, [name]: value || null })); };

    const save = async (values: LocalEstoqueFormValues) => {
        await runWithToast(
            async () => {
                await saveMutation.mutateAsync({ id: values.id, values });
                setFormVisible(false);
                setSelected(null);
            },
            { success: { summary: 'Local salvo', detail: 'Cadastro de local de estoque gravado com sucesso.' }, error: { summary: 'Erro ao salvar local', detail: 'Não foi possível salvar o local.' }, rethrow: true }
        );
    };

    const inativar = async (motivo: string) => {
        if (!reasonRecord) return;
        await runWithToast(
            async () => {
                await inativarMutation.mutateAsync({ id: reasonRecord.id, motivo });
                setReasonRecord(null);
            },
            { success: { summary: 'Local inativado', detail: 'Motivo registrado com sucesso.' }, error: { summary: 'Erro ao inativar local', detail: 'Não foi possível inativar o local.' } }
        );
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EstoqueFilterBar filters={filters} search={localSearch} onSearchChange={(value) => { setFirst(0); setLocalSearch(value); }} onFilterChange={updateFilter} />
            <PermissionGuard permission="LOCAIS_ESTOQUE_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo local" icon="pi pi-plus" disabled={disabled} onClick={() => { setSelected(null); setFormVisible(true); }} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Locais de estoque" description="Cadastro de locais usados em saldos, movimentos, reservas e inventários." actions={headerActions} />
            <Message className="w-full mb-3" severity="info" text="Campos de Empresa e Filial são selecionados por dropdown alimentado do banco; o vínculo interno é enviado automaticamente." />
            <div className="grid mb-3">
                <div className="col-12 md:col-4"><Card><span className="block text-color-secondary mb-2">Locais listados</span><strong className="text-2xl">{resumo.total}</strong></Card></div>
                <div className="col-12 md:col-4"><Card><span className="block text-color-secondary mb-2">Ativos</span><strong className="text-2xl">{resumo.ativos}</strong></Card></div>
                <div className="col-12 md:col-4"><Card><span className="block text-color-secondary mb-2">Inativos/bloqueados</span><strong className="text-2xl">{resumo.inativos}</strong></Card></div>
            </div>
            <Card>
                {listQuery.error ? <ApiErrorPanel error={mapApiError(listQuery.error)} /> : null}
                <DataTableServer<LocalEstoqueResponse> value={visibleRecords} totalRecords={records.length} loading={listQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }}>
                    <Column field="codigo" header="Código" />
                    <Column field="nome" header="Nome" />
                    <Column field="descricao" header="Descrição" />
                    <Column header="Status" body={(row: LocalEstoqueResponse) => <StatusTag status={row.status} />} />
                    <Column header="Ações" alignHeader="right" body={(row: LocalEstoqueResponse) => <DataTableActions actions={[{ key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'LOCAIS_ESTOQUE_GERENCIAR', disabled: !isActive(row), onClick: () => { setSelected(row); setFormVisible(true); } }, { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', severity: 'danger', permission: 'LOCAIS_ESTOQUE_GERENCIAR', disabled: !isActive(row), onClick: () => setReasonRecord(row) }]} />} />
                </DataTableServer>
                {!listQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum local" description="Crie um local ou ajuste os filtros." /> : null}
            </Card>
            <LocalEstoqueFormDialog visible={formVisible} record={selected} loading={saveMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={save} />
            <ReasonDialog visible={Boolean(reasonRecord)} title="Motivo da inativação" confirmLabel="Inativar" loading={inativarMutation.isPending} onHide={() => setReasonRecord(null)} onConfirm={inativar} />
        </>
    );
};
