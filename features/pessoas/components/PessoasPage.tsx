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
import { LoadingState } from '@/components/feedback/LoadingState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PessoaFormDialog } from '@/features/pessoas/components/PessoaFormDialog';
import { usePessoaMutations, usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { PessoaFormValues, PessoaListQuery, PessoaResponse } from '@/features/pessoas/types/pessoas.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { maskDocument } from '@/lib/formatters/privacy';
import { EntityStatus, TipoPessoa } from '@/types/erp';

const tipoPessoaLabel = (tipo: TipoPessoa) => (tipo === TipoPessoa.Fisica ? 'Física' : 'Jurídica');
const isActive = (record: PessoaResponse) => Number(record.status) === EntityStatus.Ativo;
const filterLocal = (records: PessoaResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => Object.values(record).some((value) => String(value ?? '').toLowerCase().includes(normalized)));
};

export const PessoasPage = () => {
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const [filters, setFilters] = useState<PessoaListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [selected, setSelected] = useState<PessoaResponse | null>(null);
    const [reasonRecord, setReasonRecord] = useState<PessoaResponse | null>(null);
    const listQuery = usePessoas(filters);
    const { saveMutation, inativarMutation } = usePessoaMutations(filters);

    const records = useMemo(() => filterLocal(listQuery.data ?? [], localSearch), [listQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('PESSOAS_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de Pessoas exige a permissão PESSOAS_CONSULTAR." />;
    }

    const updateFilter = (name: keyof PessoaListQuery, value: string | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value || null }));
    };

    const openCreate = () => {
        setSelected(null);
        setFormVisible(true);
    };

    const save = async (values: PessoaFormValues) => {
        try {
            await saveMutation.mutateAsync({ id: values.id, values });
            toast.success('Pessoa salva', 'Cadastro de pessoa gravado com sucesso.');
            setFormVisible(false);
            setSelected(null);
        } catch (error) {
            toast.error('Erro ao salvar pessoa', error instanceof Error ? error.message : 'Não foi possível salvar a pessoa.');
            throw error;
        }
    };

    const inativar = async (motivo: string) => {
        if (!reasonRecord) return;
        try {
            await inativarMutation.mutateAsync({ id: reasonRecord.id, motivo });
            toast.success('Pessoa inativada', 'Motivo registrado e cadastro inativado.');
            setReasonRecord(null);
        } catch (error) {
            toast.error('Erro ao inativar pessoa', error instanceof Error ? error.message : 'Não foi possível inativar a pessoa.');
        }
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText placeholder="Buscar" value={localSearch} onChange={(event) => { setFirst(0); setLocalSearch(event.target.value); }} />
            </span>
            <PermissionGuard permission="PESSOAS_GERENCIAR" mode="disable">
                {({ disabled }) => <Button label="Nova pessoa" icon="pi pi-plus" disabled={disabled} onClick={openCreate} />}
            </PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Pessoas" description="Cadastro mestre de pessoas físicas e jurídicas com CPF/CNPJ, CNPJ alfanumérico, LGPD visual e inativação com motivo." actions={headerActions} />
            <Message className="w-full mb-3" severity="info" text="CPF/CNPJ é preservado no payload; o backend continua sendo a fonte final de validação documental." />
            <OperationalGovernancePanel title="Governança de dados pessoais" description="Resumo da base de pessoas carregada, com atenção a status, documentos e uso compartilhado por clientes, fornecedores e demais módulos." records={records} complianceNote="Pessoa inativa não deve ser alterada nem vinculada a novos papéis operacionais; a validação definitiva permanece no backend." sensitiveDataNote="Documentos pessoais são mascarados na listagem e devem ser exibidos integralmente apenas quando houver permissão e necessidade operacional." />
            <Card>
                {listQuery.isLoading ? <LoadingState /> : null}
                {listQuery.error ? <ApiErrorPanel error={mapApiError(listQuery.error)} /> : null}
                <DataTableServer<PessoaResponse> value={visibleRecords} totalRecords={records.length} loading={listQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma pessoa encontrada.">
                    <Column header="Tipo" body={(row: PessoaResponse) => <Tag value={tipoPessoaLabel(row.tipoPessoa)} severity="info" />} />
                    <Column field="nomeRazaoSocial" header="Nome/Razão social" />
                    <Column field="nomeFantasia" header="Fantasia/Apelido" body={(row: PessoaResponse) => row.nomeFantasia ?? '-'} />
                    <Column header="Documento" body={(row: PessoaResponse) => maskDocument(row.documento)} />
                    <Column header="Status" body={(row: PessoaResponse) => <StatusTag status={row.status} />} />
                    <Column header="Ações" alignHeader="right" body={(row: PessoaResponse) => <DataTableActions actions={[{ key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'PESSOAS_GERENCIAR', disabled: !isActive(row), onClick: () => { setSelected(row); setFormVisible(true); } }, { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', permission: 'PESSOAS_GERENCIAR', severity: 'danger', disabled: !isActive(row), onClick: () => setReasonRecord(row) }]} />} />
                </DataTableServer>
                {!listQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma pessoa" description="Crie um cadastro ou ajuste os filtros." /> : null}
            </Card>
            <PessoaFormDialog visible={formVisible} record={selected} loading={saveMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={save} />
            <ReasonDialog visible={Boolean(reasonRecord)} title="Motivo da inativação" confirmLabel="Inativar" loading={inativarMutation.isPending} onHide={() => setReasonRecord(null)} onConfirm={inativar} />
        </>
    );
};
