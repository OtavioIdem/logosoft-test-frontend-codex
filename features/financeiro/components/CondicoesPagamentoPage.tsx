'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
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
import { CondicaoPagamentoFormDialog } from '@/features/financeiro/components/CondicaoPagamentoFormDialog';
import { useCondicoesPagamento, useFinanceiroMutations } from '@/features/financeiro/hooks/useFinanceiroResources';
import { CondicaoPagamentoFormValues, CondicaoPagamentoResponse } from '@/features/financeiro/types/financeiro.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';

const filterLocal = (items: CondicaoPagamentoResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => [item.codigo, item.nome].some((value) => value.toLowerCase().includes(normalized)));
};

export const CondicoesPagamentoPage = () => {
    const { hasPermission } = usePermissions();
    const toast = useAppToast();
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [filialId, setFilialId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [editing, setEditing] = useState<CondicaoPagamentoResponse | null>(null);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [reasonTarget, setReasonTarget] = useState<CondicaoPagamentoResponse | null>(null);
    const query = useCondicoesPagamento(empresaId);
    const mutations = useFinanceiroMutations();
    const records = useMemo(() => filterLocal(query.data ?? [], search), [query.data, search]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [first, records, rows]);

    if (!hasPermission('FINANCEIRO_CONSULTAR') && !hasPermission('CONDICOES_PAGAMENTO_GERENCIAR')) return <UnauthorizedState description="Condições de pagamento exigem permissão financeira." />;

    const submit = (values: CondicaoPagamentoFormValues) => {
        mutations.condicaoSaveMutation.mutate({ id: editing?.id, values }, { onSuccess: () => { toast.success('Condição de pagamento salva.'); setDialogVisible(false); }, onError: (error) => toast.error('Erro ao salvar', mapApiError(error).message) });
    };
    const inativar = (motivo: string) => {
        if (!reasonTarget) return;
        mutations.condicaoInativarMutation.mutate({ id: reasonTarget.id, motivo }, { onSuccess: () => { toast.success('Condição de pagamento inativada.'); setReasonTarget(null); }, onError: (error) => toast.error('Erro ao inativar', mapApiError(error).message) });
    };

    return <><PageHeader title="Condições de pagamento" description="Controle parcelamento, intervalo e entrada." actions={<div className="flex flex-column md:flex-row gap-2"><EmpresaFilialFilter empresaId={empresaId} filialId={filialId} onEmpresaChange={(value) => { setEmpresaId(value); setFilialId(null); }} onFilialChange={setFilialId} /><span className="p-input-icon-left"><i className="pi pi-search" /><InputText value={search} placeholder="Buscar" onChange={(event) => { setSearch(event.target.value); setFirst(0); }} /></span><PermissionGuard permission="CONDICOES_PAGAMENTO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Nova condição" icon="pi pi-plus" disabled={disabled} onClick={() => { setEditing(null); setDialogVisible(true); }} />}</PermissionGuard></div>} />
        <Card>{query.error ? <ApiErrorPanel error={mapApiError(query.error)} /> : null}<DataTableServer<CondicaoPagamentoResponse> value={visibleRecords} totalRecords={records.length} first={first} rows={rows} loading={query.isFetching} onPage={(event) => { setFirst(event.first); setRows(event.rows); }}><Column field="codigo" header="Código" /><Column field="nome" header="Nome" /><Column field="quantidadeParcelas" header="Parcelas" /><Column field="intervaloDias" header="Intervalo" /><Column header="Entrada" body={(row: CondicaoPagamentoResponse) => (row.permiteEntrada ? 'Sim' : 'Não')} /><Column header="Status" body={(row: CondicaoPagamentoResponse) => <StatusTag status={row.status} />} /><Column header="Ações" body={(row: CondicaoPagamentoResponse) => <DataTableActions actions={[{ key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'CONDICOES_PAGAMENTO_GERENCIAR', onClick: () => { setEditing(row); setDialogVisible(true); } }, { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', severity: 'danger', permission: 'CONDICOES_PAGAMENTO_GERENCIAR', onClick: () => setReasonTarget(row) }]} />} /></DataTableServer></Card>
        <CondicaoPagamentoFormDialog visible={dialogVisible} record={editing} loading={mutations.condicaoSaveMutation.isPending} onHide={() => setDialogVisible(false)} onSubmit={submit} />
        <ReasonDialog visible={Boolean(reasonTarget)} title="Inativar condição de pagamento" loading={mutations.condicaoInativarMutation.isPending} onHide={() => setReasonTarget(null)} onConfirm={inativar} />
    </>;
};
