'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { Tag } from 'primereact/tag';
import { SearchInput } from '@/components/forms/SearchInput';
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
import { FornecedorFormDialog } from '@/features/fornecedores/components/FornecedorFormDialog';
import { useFornecedorMutations, useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import { ConfigurarCompraFornecedorRequest, FornecedorFormValues, FornecedorListQuery, FornecedorResponse } from '@/features/fornecedores/types/fornecedores.types';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { EntityStatus } from '@/types/erp';

const isActive = (record: FornecedorResponse) => Number(record.status) === EntityStatus.Ativo;
const filterLocal = (records: FornecedorResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => Object.values(record).some((value) => String(value ?? '').toLowerCase().includes(normalized)));
};

const isFilled = (value: unknown) => (typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined);

// PUT .../configuracao-compra substitui o bloco inteiro (D62): mesmo mecanismo de disparo e de
// fallback explícito (`?? null`) do Cliente — ver `ClientesPage.tsx`.
const configuracaoCompraEstaEmBranco = (values: FornecedorFormValues) => !isFilled(values.condicaoPagamentoPadraoId) && !isFilled(values.prazoEntregaMedio) && !isFilled(values.categoriaFornecimento);

const buildConfiguracaoCompraValues = (values: FornecedorFormValues): ConfigurarCompraFornecedorRequest => ({
    condicaoPagamentoPadraoId: values.condicaoPagamentoPadraoId ?? null,
    prazoEntregaMedio: values.prazoEntregaMedio ?? null,
    categoriaFornecimento: values.categoriaFornecimento ?? null
});

export const FornecedoresPage = () => {
    const runWithToast = useMutationWithToast();
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const [filters, setFilters] = useState<FornecedorListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [selected, setSelected] = useState<FornecedorResponse | null>(null);
    const [reasonRecord, setReasonRecord] = useState<FornecedorResponse | null>(null);
    const [homologarRecord, setHomologarRecord] = useState<FornecedorResponse | null>(null);
    const [revogarRecord, setRevogarRecord] = useState<FornecedorResponse | null>(null);
    const listQuery = useFornecedores(filters);
    const pessoasQuery = usePessoas({ empresaId: filters.empresaId, filialId: filters.filialId });
    const { saveMutation, inativarMutation, configurarCompraMutation, homologarMutation, revogarMutation } = useFornecedorMutations(filters);

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
        // Mesma orquestração de `ClientesPage.tsx`: cadastro e configuração de compra são chamadas
        // separadas; se o cadastro grava e só a configuração falha, a mensagem não pode negar o que
        // já aconteceu.
        const saved = await runWithToast(() => saveMutation.mutateAsync({ id: values.id, values }), {
            error: { summary: 'Erro ao salvar fornecedor', detail: 'Não foi possível salvar o fornecedor.' },
            rethrow: true
        });
        if (!saved) return;

        const fornecedorId = saved.id;
        const isEdicao = Boolean(values.id);
        const disparaConfiguracaoCompra = isEdicao || !configuracaoCompraEstaEmBranco(values);

        if (disparaConfiguracaoCompra) {
            try {
                await configurarCompraMutation.mutateAsync({ id: fornecedorId, values: buildConfiguracaoCompraValues(values) });
            } catch (error) {
                const apiError = mapApiError(error);
                toast.error('Fornecedor salvo, mas a configuração de compra não foi gravada', `O cadastro do fornecedor foi gravado. ${apiError.message}`);
                throw error;
            }
        }

        toast.success('Fornecedor salvo', 'Cadastro de fornecedor gravado com sucesso.');
        setFormVisible(false);
        setSelected(null);
    };

    const inativar = async (motivo: string) => {
        if (!reasonRecord) return;
        await runWithToast(
            async () => {
                await inativarMutation.mutateAsync({ id: reasonRecord.id, motivo });
                setReasonRecord(null);
            },
            { success: { summary: 'Fornecedor inativado', detail: 'Motivo registrado com sucesso.' }, error: { summary: 'Erro ao inativar fornecedor', detail: 'Não foi possível inativar o fornecedor.' } }
        );
    };

    // Homologar não tem motivo — o `POST` não tem corpo, e o backend não grava nada além do estado
    // (D63). Só revogar usa `ReasonDialog`, porque só a revogação exige motivo no backend.
    const homologar = async () => {
        if (!homologarRecord) return;
        await runWithToast(
            async () => {
                await homologarMutation.mutateAsync(homologarRecord.id);
                setHomologarRecord(null);
            },
            { success: { summary: 'Fornecedor homologado', detail: 'Homologação registrada com sucesso.' }, error: { summary: 'Erro ao homologar fornecedor', detail: 'Não foi possível homologar o fornecedor.' } }
        );
    };

    const revogarHomologacao = async (motivo: string) => {
        if (!revogarRecord) return;
        await runWithToast(
            async () => {
                await revogarMutation.mutateAsync({ id: revogarRecord.id, motivo });
                setRevogarRecord(null);
            },
            { success: { summary: 'Homologação revogada', detail: 'Motivo registrado e homologação revogada.' }, error: { summary: 'Erro ao revogar homologação', detail: 'Não foi possível revogar a homologação.' } }
        );
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <SearchInput ariaLabel="Buscar fornecedores" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="FORNECEDORES_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo fornecedor" icon="pi pi-plus" disabled={disabled} onClick={() => { setSelected(null); setFormVisible(true); }} />}</PermissionGuard>
        </div>
    );

    const formLoading = saveMutation.isPending || configurarCompraMutation.isPending;

    return (
        <>
            <PageHeader title="Fornecedores" description="Cadastro de fornecedores vinculado ao cadastro mestre de pessoas, com inativação e auditoria operacional por motivo." actions={headerActions} />
            <OperationalGovernancePanel title="Governança de fornecedores" description="Resumo dos fornecedores carregados, mantendo foco em status, vínculo com pessoa e impacto em compras/financeiro." records={records} activeLabel="Aptos" inactiveLabel="Restritos" complianceNote="Fornecedor inativo não deve ser usado em novos pedidos de compra; inativação exige motivo e deve permanecer auditável." sensitiveDataNote="Dados cadastrais do fornecedor podem conter informações pessoais e fiscais da pessoa vinculada." />
            <Card>
                {listQuery.error ? <ApiErrorPanel error={mapApiError(listQuery.error)} /> : null}
                <DataTableServer<FornecedorResponse> value={visibleRecords} totalRecords={records.length} loading={listQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum fornecedor encontrado.">
                    <Column field="codigo" header="Código" />
                    <Column header="Pessoa" body={(row: FornecedorResponse) => pessoaLabelMap.get(row.pessoaId) ?? 'Pessoa não carregada'} />
                    <Column field="observacao" header="Observação" body={(row: FornecedorResponse) => row.observacao ?? '-'} />
                    <Column header="Homologado" body={(row: FornecedorResponse) => <Tag value={row.homologado ? 'Homologado' : 'Não homologado'} severity={row.homologado ? 'success' : 'warning'} />} />
                    <Column header="Status" body={(row: FornecedorResponse) => <StatusTag status={row.status} />} />
                    <Column header="Ações" alignHeader="right" body={(row: FornecedorResponse) => <DataTableActions actions={[{ key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'FORNECEDORES_GERENCIAR', disabled: !isActive(row), onClick: () => { setSelected(row); setFormVisible(true); } }, { key: 'homologar', label: 'Homologar', icon: 'pi pi-verified', permission: 'FORNECEDORES_GERENCIAR', severity: 'success', disabled: !isActive(row) || row.homologado, onClick: () => setHomologarRecord(row) }, { key: 'revogar-homologacao', label: 'Revogar homologação', icon: 'pi pi-times-circle', permission: 'FORNECEDORES_GERENCIAR', severity: 'warning', disabled: !isActive(row) || !row.homologado, onClick: () => setRevogarRecord(row) }, { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', permission: 'FORNECEDORES_GERENCIAR', severity: 'danger', disabled: !isActive(row), onClick: () => setReasonRecord(row) }]} />} />
                </DataTableServer>
                {!listQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum fornecedor" description="Crie um cadastro ou ajuste os filtros." /> : null}
            </Card>
            <FornecedorFormDialog visible={formVisible} record={selected} pessoas={pessoasQuery.data ?? []} loading={formLoading} onHide={() => setFormVisible(false)} onSubmit={save} />
            <ReasonDialog visible={Boolean(reasonRecord)} title="Motivo da inativação" confirmLabel="Inativar" loading={inativarMutation.isPending} onHide={() => setReasonRecord(null)} onConfirm={inativar} />
            <ReasonDialog visible={Boolean(revogarRecord)} title="Motivo da revogação de homologação" confirmLabel="Revogar homologação" loading={revogarMutation.isPending} onHide={() => setRevogarRecord(null)} onConfirm={revogarHomologacao} />
            <ConfirmDialog
                visible={Boolean(homologarRecord)}
                onHide={() => setHomologarRecord(null)}
                header="Homologar fornecedor"
                message={`Homologar o fornecedor ${homologarRecord?.codigo ?? ''}? Fornecedores homologados ficam aptos a receber pedidos de compra conforme a política da empresa.`}
                icon="pi pi-question-circle"
                acceptLabel="Homologar"
                rejectLabel="Cancelar"
                acceptClassName="p-button-success"
                accept={homologar}
            />
        </>
    );
};
