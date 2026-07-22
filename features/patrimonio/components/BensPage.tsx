'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
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
import { useBens, useBemMutations } from '@/features/patrimonio/hooks/usePatrimonioResources';
import { BaixarBemFormValues, BemFormValues, BemPatrimonialResponse, BensListQuery, TransferirBemFormValues } from '@/features/patrimonio/types/patrimonio.types';
import { BaixarBemDialog, BemFormDialog, TransferirBemDialog } from '@/features/patrimonio/components/PatrimonioDialogs';
import { bemPodeBaixar, bemPodeBloquear, bemPodeDesbloquear, bemPodeTransferir, categoriaBemFilterOptions, categoriaBemLabel, statusBemFilterOptions, statusBemLabel, statusBemSeverity } from '@/features/patrimonio/components/patrimonioLabels';

const formatMoney = (value?: number | null) => (value == null ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

const filterLocal = (records: BemPatrimonialResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.codigo} ${record.descricao}`.toLowerCase().includes(normalized));
};

type DialogKind = 'cadastrar' | 'transferir' | 'baixar' | 'bloquear' | 'desbloquear' | null;

export const BensPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<BensListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [dialog, setDialog] = useState<DialogKind>(null);
    const [alvo, setAlvo] = useState<BemPatrimonialResponse | null>(null);

    const bensQuery = useBens(filters, hasPermission('PATRIMONIO_CONSULTAR'));
    const { cadastrarMutation, transferirMutation, bloquearMutation, desbloquearMutation, baixarMutation } = useBemMutations();

    const records = useMemo(() => filterLocal(bensQuery.data ?? [], localSearch), [bensQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('PATRIMONIO_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Patrimônio exige a permissão PATRIMONIO_CONSULTAR." />;
    }

    const updateFilter = (name: keyof BensListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };
    const close = () => { setDialog(null); setAlvo(null); };
    const abrir = (kind: DialogKind, bem: BemPatrimonialResponse) => { setAlvo(bem); setDialog(kind); };

    const cadastrar = async (values: BemFormValues) => {
        await runWithToast(async () => { await cadastrarMutation.mutateAsync(values); close(); }, { success: { summary: 'Bem cadastrado' }, error: { summary: 'Erro ao cadastrar bem' }, rethrow: true });
    };
    const transferir = async (values: TransferirBemFormValues) => {
        if (!alvo) return;
        await runWithToast(async () => { await transferirMutation.mutateAsync({ id: alvo.id, values }); close(); }, { success: { summary: 'Bem transferido' }, error: { summary: 'Erro ao transferir bem' }, rethrow: true });
    };
    const baixar = async (values: BaixarBemFormValues) => {
        if (!alvo) return;
        await runWithToast(async () => { await baixarMutation.mutateAsync({ id: alvo.id, values }); close(); }, { success: { summary: 'Bem baixado' }, error: { summary: 'Erro ao baixar bem' }, rethrow: true });
    };
    const bloquear = async (motivo: string) => {
        if (!alvo) return;
        await runWithToast(async () => { await bloquearMutation.mutateAsync({ id: alvo.id, motivo }); close(); }, { success: { summary: 'Bem bloqueado' }, error: { summary: 'Erro ao bloquear bem' }, rethrow: true });
    };
    const desbloquear = async (motivo: string) => {
        if (!alvo) return;
        await runWithToast(async () => { await desbloquearMutation.mutateAsync({ id: alvo.id, motivo }); close(); }, { success: { summary: 'Bem desbloqueado' }, error: { summary: 'Erro ao desbloquear bem' }, rethrow: true });
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.categoria ?? null} options={categoriaBemFilterOptions} onChange={(event) => updateFilter('categoria', event.value)} aria-label="Filtrar por categoria" />
            <Dropdown value={filters.status ?? null} options={statusBemFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <SearchInput ariaLabel="Buscar bem" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="PATRIMONIO_BENS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo bem" icon="pi pi-plus" disabled={disabled} onClick={() => setDialog('cadastrar')} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Bens patrimoniais" description="Ativo imobilizado: cadastro, transferência, bloqueio e baixa." actions={headerActions} />
            <Card>
                {bensQuery.error ? <ApiErrorPanel error={mapApiError(bensQuery.error)} /> : null}
                <DataTableServer<BemPatrimonialResponse> value={visibleRecords} totalRecords={records.length} loading={bensQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum bem encontrado.">
                    <Column field="codigo" header="Código" />
                    <Column field="descricao" header="Descrição" />
                    <Column header="Categoria" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: BemPatrimonialResponse) => categoriaBemLabel(Number(row.categoria))} />
                    <Column header="Valor contábil" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: BemPatrimonialResponse) => formatMoney(row.valorContabil ?? row.valorAquisicao)} />
                    <Column header="Status" body={(row: BemPatrimonialResponse) => <Tag value={statusBemLabel(Number(row.status))} severity={statusBemSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: BemPatrimonialResponse) => {
                        const acoes = [] as { key: string; label: string; icon: string; severity?: 'danger'; permission: 'PATRIMONIO_TRANSFERIR' | 'PATRIMONIO_BENS_GERENCIAR' | 'PATRIMONIO_BAIXAR'; onClick: () => void }[];
                        if (bemPodeTransferir(Number(row.status))) acoes.push({ key: 'transferir', label: 'Transferir', icon: 'pi pi-arrow-right-arrow-left', permission: 'PATRIMONIO_TRANSFERIR', onClick: () => abrir('transferir', row) });
                        if (bemPodeBloquear(Number(row.status))) acoes.push({ key: 'bloquear', label: 'Bloquear', icon: 'pi pi-lock', permission: 'PATRIMONIO_BENS_GERENCIAR', onClick: () => abrir('bloquear', row) });
                        if (bemPodeDesbloquear(Number(row.status))) acoes.push({ key: 'desbloquear', label: 'Desbloquear', icon: 'pi pi-lock-open', permission: 'PATRIMONIO_BENS_GERENCIAR', onClick: () => abrir('desbloquear', row) });
                        if (bemPodeBaixar(Number(row.status))) acoes.push({ key: 'baixar', label: 'Baixar', icon: 'pi pi-minus-circle', severity: 'danger', permission: 'PATRIMONIO_BAIXAR', onClick: () => abrir('baixar', row) });
                        return acoes.length ? <DataTableActions actions={acoes} /> : <span className="text-color-secondary">—</span>;
                    }} />
                </DataTableServer>
                {!bensQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum bem" description="Cadastre um bem ou ajuste os filtros." /> : null}
            </Card>

            <BemFormDialog visible={dialog === 'cadastrar'} loading={cadastrarMutation.isPending} onHide={close} onSubmit={cadastrar} />
            <TransferirBemDialog visible={dialog === 'transferir'} loading={transferirMutation.isPending} empresaId={alvo?.empresaId ?? null} filialId={alvo?.filialId ?? null} onHide={close} onSubmit={transferir} />
            <BaixarBemDialog visible={dialog === 'baixar'} loading={baixarMutation.isPending} onHide={close} onSubmit={baixar} />
            <ReasonDialog visible={dialog === 'bloquear'} title="Bloquear bem" confirmLabel="Bloquear" loading={bloquearMutation.isPending} onHide={close} onConfirm={bloquear} />
            <ReasonDialog visible={dialog === 'desbloquear'} title="Desbloquear bem" confirmLabel="Desbloquear" loading={desbloquearMutation.isPending} onHide={close} onConfirm={desbloquear} />
        </>
    );
};
