'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { OperationalGovernancePanel } from '@/components/common/OperationalGovernancePanel';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { StatusTag } from '@/components/data/StatusTag';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { ClienteFormDialog } from '@/features/clientes/components/ClienteFormDialog';
import { useClienteMutations, useClientes } from '@/features/clientes/hooks/useClientesResources';
import { ClienteFormValues, ClienteListQuery, ClienteResponse } from '@/features/clientes/types/clientes.types';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { EntityStatus } from '@/types/erp';

const isActive = (record: ClienteResponse) => Number(record.status) === EntityStatus.Ativo;
const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const filterLocal = (records: ClienteResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => Object.values(record).some((value) => String(value ?? '').toLowerCase().includes(normalized)));
};

type ClienteReasonAction = 'bloquear' | 'desbloquear' | 'inativar';

export const ClientesPage = () => {
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const [filters, setFilters] = useState<ClienteListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [selected, setSelected] = useState<ClienteResponse | null>(null);
    const [reasonState, setReasonState] = useState<{ record: ClienteResponse; action: ClienteReasonAction } | null>(null);
    const listQuery = useClientes(filters);
    const pessoasQuery = usePessoas({ empresaId: filters.empresaId, filialId: filters.filialId });
    const { saveMutation, bloquearMutation, desbloquearMutation, inativarMutation } = useClienteMutations(filters);

    const records = useMemo(() => filterLocal(listQuery.data ?? [], localSearch), [listQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);
    const pessoaLabelMap = useMemo(() => new Map((pessoasQuery.data ?? []).map((pessoa) => [pessoa.id, pessoa.nomeFantasia ? `${pessoa.nomeRazaoSocial} • ${pessoa.nomeFantasia}` : pessoa.nomeRazaoSocial])), [pessoasQuery.data]);

    if (!hasPermission('CLIENTES_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de Clientes exige a permissão CLIENTES_CONSULTAR." />;
    }

    const updateFilter = (name: keyof ClienteListQuery, value: string | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value || null }));
    };

    const save = async (values: ClienteFormValues) => {
        try {
            await saveMutation.mutateAsync({ id: values.id, values });
            toast.success('Cliente salvo', 'Cadastro de cliente gravado com sucesso.');
            setFormVisible(false);
            setSelected(null);
        } catch (error) {
            toast.error('Erro ao salvar cliente', error instanceof Error ? error.message : 'Não foi possível salvar o cliente.');
            throw error;
        }
    };

    const runReasonAction = async (motivo: string) => {
        if (!reasonState) return;
        try {
            if (reasonState.action === 'bloquear') await bloquearMutation.mutateAsync({ id: reasonState.record.id, motivo });
            if (reasonState.action === 'desbloquear') await desbloquearMutation.mutateAsync({ id: reasonState.record.id, motivo });
            if (reasonState.action === 'inativar') await inativarMutation.mutateAsync({ id: reasonState.record.id, motivo });
            toast.success('Operação realizada', 'Motivo registrado com sucesso.');
            setReasonState(null);
        } catch (error) {
            toast.error('Erro operacional', error instanceof Error ? error.message : 'Não foi possível concluir a operação.');
        }
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <span className="p-input-icon-left"><i className="pi pi-search" /><InputText placeholder="Buscar" value={localSearch} onChange={(event) => { setFirst(0); setLocalSearch(event.target.value); }} /></span>
            <PermissionGuard permission="CLIENTES_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo cliente" icon="pi pi-plus" disabled={disabled} onClick={() => { setSelected(null); setFormVisible(true); }} />}</PermissionGuard>
        </div>
    );

    const reasonTitle = reasonState?.action === 'bloquear' ? 'Motivo do bloqueio de crédito' : reasonState?.action === 'desbloquear' ? 'Motivo do desbloqueio de crédito' : 'Motivo da inativação';
    const reasonLabel = reasonState?.action === 'bloquear' ? 'Bloquear' : reasonState?.action === 'desbloquear' ? 'Desbloquear' : 'Inativar';
    const reasonLoading = bloquearMutation.isPending || desbloquearMutation.isPending || inativarMutation.isPending;

    return (
        <>
            <PageHeader title="Clientes" description="Cadastro comercial de clientes com limite de crédito, bloqueio/desbloqueio e inativação com motivo." actions={headerActions} />
            <Message className="w-full mb-3" severity="info" text="Cliente é vinculado a uma pessoa ativa. O backend valida código único por empresa e regras de crédito." />
            <OperationalGovernancePanel title="Governança comercial e de crédito" description="Resumo da carteira de clientes carregada, com controle visual de status e atenção ao bloqueio de crédito." records={records} activeLabel="Operacionais" inactiveLabel="Restritos" complianceNote="Bloqueio, desbloqueio e inativação exigem motivo para preservar rastreabilidade comercial e financeira." sensitiveDataNote="Cliente herda dados pessoais da pessoa vinculada; documentos devem ser exibidos de forma minimizada quando possível." />
            <Card>
                {listQuery.error ? <ApiErrorPanel error={mapApiError(listQuery.error)} /> : null}
                <DataTableServer<ClienteResponse> value={visibleRecords} totalRecords={records.length} loading={listQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum cliente encontrado.">
                    <Column field="codigo" header="Código" />
                    <Column header="Pessoa" body={(row: ClienteResponse) => pessoaLabelMap.get(row.pessoaId) ?? 'Pessoa não carregada'} />
                    <Column header="Limite de crédito" body={(row: ClienteResponse) => formatMoney(row.limiteCredito)} />
                    <Column header="Crédito" body={(row: ClienteResponse) => <Tag value={row.creditoBloqueado ? 'Bloqueado' : 'Liberado'} severity={row.creditoBloqueado ? 'danger' : 'success'} />} />
                    <Column header="Status" body={(row: ClienteResponse) => <StatusTag status={row.status} />} />
                    <Column header="Ações" alignHeader="right" body={(row: ClienteResponse) => <DataTableActions actions={[{ key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'CLIENTES_GERENCIAR', disabled: !isActive(row), onClick: () => { setSelected(row); setFormVisible(true); } }, { key: 'bloquear', label: 'Bloquear', icon: 'pi pi-lock', permission: 'CLIENTES_GERENCIAR', severity: 'warning', disabled: !isActive(row) || row.creditoBloqueado, onClick: () => setReasonState({ record: row, action: 'bloquear' }) }, { key: 'desbloquear', label: 'Desbloquear', icon: 'pi pi-lock-open', permission: 'CLIENTES_GERENCIAR', severity: 'success', disabled: !isActive(row) || !row.creditoBloqueado, onClick: () => setReasonState({ record: row, action: 'desbloquear' }) }, { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', permission: 'CLIENTES_GERENCIAR', severity: 'danger', disabled: !isActive(row), onClick: () => setReasonState({ record: row, action: 'inativar' }) }]} />} />
                </DataTableServer>
                {!listQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum cliente" description="Crie um cadastro ou ajuste os filtros." /> : null}
            </Card>
            <ClienteFormDialog visible={formVisible} record={selected} pessoas={pessoasQuery.data ?? []} loading={saveMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={save} />
            <ReasonDialog visible={Boolean(reasonState)} title={reasonTitle} confirmLabel={reasonLabel} loading={reasonLoading} onHide={() => setReasonState(null)} onConfirm={runReasonAction} />
        </>
    );
};
