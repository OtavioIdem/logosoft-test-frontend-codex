'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';
import { OperationalGovernancePanel } from '@/components/common/OperationalGovernancePanel';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { StatusTag } from '@/components/data/StatusTag';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { FornecedorFormDialog } from '@/features/fornecedores/components/FornecedorFormDialog';
import { useFornecedorMutations, useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import { FornecedorFormValues, FornecedorListQuery, FornecedorResponse } from '@/features/fornecedores/types/fornecedores.types';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { EntityStatus } from '@/types/erp';

const isActive = (record: FornecedorResponse) => Number(record.status) === EntityStatus.Ativo;
const filterLocal = (records: FornecedorResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => Object.values(record).some((value) => String(value ?? '').toLowerCase().includes(normalized)));
};

export const FornecedoresPage = () => {
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const [filters, setFilters] = useState<FornecedorListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [selected, setSelected] = useState<FornecedorResponse | null>(null);
    const [reasonRecord, setReasonRecord] = useState<FornecedorResponse | null>(null);
    const listQuery = useFornecedores(filters);
    const pessoasQuery = usePessoas({ empresaId: filters.empresaId, filialId: filters.filialId });
    const { saveMutation, inativarMutation } = useFornecedorMutations(filters);

    const records = useMemo(() => filterLocal(listQuery.data ?? [], localSearch), [listQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);
    const pessoaLabelMap = useMemo(() => new Map((pessoasQuery.data ?? []).map((pessoa) => [pessoa.id, pessoa.nomeFantasia ? `${pessoa.nomeRazaoSocial} • ${pessoa.nomeFantasia}` : pessoa.nomeRazaoSocial])), [pessoasQuery.data]);

    if (!hasPermission('FORNECEDORES_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de Fornecedores exige a permissão FORNECEDORES_CONSULTAR." />;
    }

    const updateFilter = (name: keyof FornecedorListQuery, value: string | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value || null }));
    };

    const save = async (values: FornecedorFormValues) => {
        try {
            await saveMutation.mutateAsync({ id: values.id, values });
            toast.success('Fornecedor salvo', 'Cadastro de fornecedor gravado com sucesso.');
            setFormVisible(false);
            setSelected(null);
        } catch (error) {
            toast.error('Erro ao salvar fornecedor', error instanceof Error ? error.message : 'Não foi possível salvar o fornecedor.');
            throw error;
        }
    };

    const inativar = async (motivo: string) => {
        if (!reasonRecord) return;
        try {
            await inativarMutation.mutateAsync({ id: reasonRecord.id, motivo });
            toast.success('Fornecedor inativado', 'Motivo registrado e cadastro inativado.');
            setReasonRecord(null);
        } catch (error) {
            toast.error('Erro ao inativar fornecedor', error instanceof Error ? error.message : 'Não foi possível inativar o fornecedor.');
        }
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <span className="p-input-icon-left"><i className="pi pi-search" /><InputText placeholder="Buscar" value={localSearch} onChange={(event) => { setFirst(0); setLocalSearch(event.target.value); }} /></span>
            <PermissionGuard permission="FORNECEDORES_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo fornecedor" icon="pi pi-plus" disabled={disabled} onClick={() => { setSelected(null); setFormVisible(true); }} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Fornecedores" description="Cadastro de fornecedores vinculado ao cadastro mestre de pessoas, com inativação e auditoria operacional por motivo." actions={headerActions} />
            <Message className="w-full mb-3" severity="info" text="Fornecedor é vinculado a uma pessoa ativa. O backend valida código único por empresa e bloqueios de alteração quando inativo." />
            <OperationalGovernancePanel title="Governança de fornecedores" description="Resumo dos fornecedores carregados, mantendo foco em status, vínculo com pessoa e impacto em compras/financeiro." records={records} activeLabel="Aptos" inactiveLabel="Restritos" complianceNote="Fornecedor inativo não deve ser usado em novos pedidos de compra; inativação exige motivo e deve permanecer auditável." sensitiveDataNote="Dados cadastrais do fornecedor podem conter informações pessoais e fiscais da pessoa vinculada." />
            <Card>
                {listQuery.isLoading ? <LoadingState /> : null}
                {listQuery.error ? <ApiErrorPanel error={mapApiError(listQuery.error)} /> : null}
                <DataTableServer<FornecedorResponse> value={visibleRecords} totalRecords={records.length} loading={listQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum fornecedor encontrado.">
                    <Column field="codigo" header="Código" />
                    <Column header="Pessoa" body={(row: FornecedorResponse) => pessoaLabelMap.get(row.pessoaId) ?? 'Pessoa não carregada'} />
                    <Column field="observacao" header="Observação" body={(row: FornecedorResponse) => row.observacao ?? '-'} />
                    <Column header="Status" body={(row: FornecedorResponse) => <StatusTag status={row.status} />} />
                    <Column header="Ações" alignHeader="right" body={(row: FornecedorResponse) => <DataTableActions actions={[{ key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'FORNECEDORES_GERENCIAR', disabled: !isActive(row), onClick: () => { setSelected(row); setFormVisible(true); } }, { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', permission: 'FORNECEDORES_GERENCIAR', severity: 'danger', disabled: !isActive(row), onClick: () => setReasonRecord(row) }]} />} />
                </DataTableServer>
                {!listQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum fornecedor" description="Crie um cadastro ou ajuste os filtros." /> : null}
            </Card>
            <FornecedorFormDialog visible={formVisible} record={selected} pessoas={pessoasQuery.data ?? []} loading={saveMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={save} />
            <ReasonDialog visible={Boolean(reasonRecord)} title="Motivo da inativação" confirmLabel="Inativar" loading={inativarMutation.isPending} onHide={() => setReasonRecord(null)} onConfirm={inativar} />
        </>
    );
};
