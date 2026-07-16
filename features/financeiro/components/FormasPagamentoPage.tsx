'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { SearchInput } from '@/components/forms/SearchInput';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { StatusTag } from '@/components/data/StatusTag';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { FormaPagamentoFormDialog } from '@/features/financeiro/components/FormaPagamentoFormDialog';
import { useFinanceiroMutations, useFormasPagamento } from '@/features/financeiro/hooks/useFinanceiroResources';
import { FormaPagamentoFormValues, FormaPagamentoResponse } from '@/features/financeiro/types/financeiro.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';

const filterLocal = (items: FormaPagamentoResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => [item.codigo, item.nome].some((value) => value.toLowerCase().includes(normalized)));
};

export const FormasPagamentoPage = () => {
    const { hasPermission } = usePermissions();
    const toast = useAppToast();
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [filialId, setFilialId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [editing, setEditing] = useState<FormaPagamentoResponse | null>(null);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [reasonTarget, setReasonTarget] = useState<FormaPagamentoResponse | null>(null);
    const query = useFormasPagamento(empresaId);
    const mutations = useFinanceiroMutations();
    const records = useMemo(() => filterLocal(query.data ?? [], search), [query.data, search]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [first, records, rows]);

    if (!hasPermission('FINANCEIRO_CONSULTAR') && !hasPermission('FORMAS_PAGAMENTO_GERENCIAR')) return <UnauthorizedState description="Formas de pagamento exigem permissão financeira." />;

    const openNew = () => { setEditing(null); setDialogVisible(true); };
    const openEdit = (record: FormaPagamentoResponse) => { setEditing(record); setDialogVisible(true); };
    const submit = (values: FormaPagamentoFormValues) => {
        mutations.formaSaveMutation.mutate({ id: editing?.id, values }, { onSuccess: () => { toast.success('Forma de pagamento salva.'); setDialogVisible(false); }, onError: (error) => toast.error('Erro ao salvar', mapApiError(error).message) });
    };
    const inativar = (motivo: string) => {
        if (!reasonTarget) return;
        mutations.formaInativarMutation.mutate({ id: reasonTarget.id, motivo }, { onSuccess: () => { toast.success('Forma de pagamento inativada.'); setReasonTarget(null); }, onError: (error) => toast.error('Erro ao inativar', mapApiError(error).message) });
    };

    return <><PageHeader title="Formas de pagamento" description="Parametrize formas permitidas para recebimento e pagamento." actions={<div className="flex flex-column md:flex-row gap-2"><EmpresaFilialFilter empresaId={empresaId} filialId={filialId} onEmpresaChange={(value) => { setEmpresaId(value); setFilialId(null); }} onFilialChange={setFilialId} /><SearchInput ariaLabel="Buscar formas" defaultValue={search} onChange={(term) => { setSearch(term); setFirst(0); }} /><PermissionGuard permission="FORMAS_PAGAMENTO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Nova forma" icon="pi pi-plus" disabled={disabled} onClick={openNew} />}</PermissionGuard></div>} />
        <Card>{query.error ? <ApiErrorPanel error={mapApiError(query.error)} /> : null}<DataTableServer<FormaPagamentoResponse> value={visibleRecords} totalRecords={records.length} first={first} rows={rows} loading={query.isFetching} onPage={(event) => { setFirst(event.first); setRows(event.rows); }}><Column field="codigo" header="Código" /><Column field="nome" header="Nome" /><Column header="Recebimento" body={(row: FormaPagamentoResponse) => (row.permiteRecebimento ? 'Sim' : 'Não')} /><Column header="Pagamento" body={(row: FormaPagamentoResponse) => (row.permitePagamento ? 'Sim' : 'Não')} /><Column header="Status" body={(row: FormaPagamentoResponse) => <StatusTag status={row.status} />} /><Column header="Ações" body={(row: FormaPagamentoResponse) => <DataTableActions actions={[{ key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'FORMAS_PAGAMENTO_GERENCIAR', onClick: () => openEdit(row) }, { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', severity: 'danger', permission: 'FORMAS_PAGAMENTO_GERENCIAR', onClick: () => setReasonTarget(row) }]} />} /></DataTableServer></Card>
        <FormaPagamentoFormDialog visible={dialogVisible} record={editing} loading={mutations.formaSaveMutation.isPending} onHide={() => setDialogVisible(false)} onSubmit={submit} />
        <ReasonDialog visible={Boolean(reasonTarget)} title="Inativar forma de pagamento" loading={mutations.formaInativarMutation.isPending} onHide={() => setReasonTarget(null)} onConfirm={inativar} />
    </>;
};
