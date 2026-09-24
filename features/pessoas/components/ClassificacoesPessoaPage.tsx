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
import { ClassificacaoPessoaFormDialog } from '@/features/pessoas/components/ClassificacaoPessoaFormDialog';
import { useClassificacaoPessoaMutations, useClassificacoesPessoa } from '@/features/pessoas/hooks/useClassificacoesPessoa';
import { ClassificacaoPessoaFormValues, ClassificacaoPessoaResponse } from '@/features/pessoas/types/pessoas.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { EntityStatus } from '@/types/erp';

const filterLocal = (items: ClassificacaoPessoaResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => [item.codigo, item.nome].some((value) => value.toLowerCase().includes(normalized)));
};

export const ClassificacoesPessoaPage = () => {
    const { hasPermission } = usePermissions();
    const toast = useAppToast();
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [editing, setEditing] = useState<ClassificacaoPessoaResponse | null>(null);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [reasonTarget, setReasonTarget] = useState<ClassificacaoPessoaResponse | null>(null);
    const query = useClassificacoesPessoa(empresaId);
    const mutations = useClassificacaoPessoaMutations();
    const records = useMemo(() => filterLocal(query.data ?? [], search), [query.data, search]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [first, records, rows]);

    // D68: rota e menu exigem PESSOAS_CONSULTAR (o GET não abre com só CLASSIFICACOES_PESSOA_GERENCIAR) —
    // não aceitar a permissão de gerenciar sozinha, diferente da ilusão registrada no molde de Condições
    // de Pagamento.
    if (!hasPermission('PESSOAS_CONSULTAR')) return <UnauthorizedState description="Classificações de pessoa exigem a permissão PESSOAS_CONSULTAR." />;

    const submit = (values: ClassificacaoPessoaFormValues) => {
        mutations.saveMutation.mutate(
            { id: editing?.id, values },
            { onSuccess: () => { toast.success('Classificação salva.'); setDialogVisible(false); }, onError: (error) => toast.error('Erro ao salvar', mapApiError(error).message) }
        );
    };
    const inativar = (motivo: string) => {
        if (!reasonTarget) return;
        mutations.inativarMutation.mutate(
            { id: reasonTarget.id, empresaId: reasonTarget.empresaId, motivo },
            { onSuccess: () => { toast.success('Classificação inativada.'); setReasonTarget(null); }, onError: (error) => toast.error('Erro ao inativar', mapApiError(error).message) }
        );
    };

    return (
        <>
            <PageHeader
                title="Classificações de pessoa"
                description="Categorize pessoas para uso em regras comerciais e relatórios."
                actions={
                    <div className="flex flex-column md:flex-row gap-2">
                        <EmpresaFilialFilter empresaId={empresaId} filialId={null} onEmpresaChange={setEmpresaId} onFilialChange={() => undefined} showFilial={false} />
                        <SearchInput ariaLabel="Buscar classificações" defaultValue={search} onChange={(term) => { setSearch(term); setFirst(0); }} />
                        <PermissionGuard permission="CLASSIFICACOES_PESSOA_GERENCIAR" mode="disable">
                            {({ disabled }) => (
                                <Button
                                    label="Nova classificação"
                                    icon="pi pi-plus"
                                    disabled={disabled}
                                    tooltip={disabled ? 'Requer a permissão Classificações · Gerenciar.' : undefined}
                                    onClick={() => { setEditing(null); setDialogVisible(true); }}
                                />
                            )}
                        </PermissionGuard>
                    </div>
                }
            />
            <Card>
                {query.error ? <ApiErrorPanel error={mapApiError(query.error)} /> : null}
                <DataTableServer<ClassificacaoPessoaResponse>
                    value={visibleRecords}
                    totalRecords={records.length}
                    first={first}
                    rows={rows}
                    loading={query.isFetching}
                    emptyMessage="Nenhuma classificação cadastrada."
                    onPage={(event) => { setFirst(event.first); setRows(event.rows); }}
                >
                    <Column field="codigo" header="Código" />
                    <Column field="nome" header="Nome" />
                    <Column header="Descrição" body={(row: ClassificacaoPessoaResponse) => row.descricao || '—'} />
                    <Column header="Status" body={(row: ClassificacaoPessoaResponse) => <StatusTag status={row.status} />} />
                    <Column
                        header="Ações"
                        body={(row: ClassificacaoPessoaResponse) => (
                            <DataTableActions
                                actions={[
                                    { key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'CLASSIFICACOES_PESSOA_GERENCIAR', disabled: row.status !== EntityStatus.Ativo, onClick: () => { setEditing(row); setDialogVisible(true); } },
                                    { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', severity: 'danger', permission: 'CLASSIFICACOES_PESSOA_GERENCIAR', disabled: row.status !== EntityStatus.Ativo, onClick: () => setReasonTarget(row) }
                                ]}
                            />
                        )}
                    />
                </DataTableServer>
            </Card>
            <ClassificacaoPessoaFormDialog visible={dialogVisible} record={editing} loading={mutations.saveMutation.isPending} onHide={() => setDialogVisible(false)} onSubmit={submit} />
            <ReasonDialog
                visible={Boolean(reasonTarget)}
                title={`Inativar classificação "${reasonTarget?.nome ?? ''}"`}
                confirmLabel="Inativar"
                warning="Esta classificação não poderá ser reativada nem editada pela aplicação depois de inativada."
                loading={mutations.inativarMutation.isPending}
                onHide={() => setReasonTarget(null)}
                onConfirm={inativar}
            />
        </>
    );
};
