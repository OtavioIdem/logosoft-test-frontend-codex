'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { OperationalGovernancePanel } from '@/components/common/OperationalGovernancePanel';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { SearchInput } from '@/components/forms/SearchInput';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { StatusTag } from '@/components/data/StatusTag';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import { CodigoBarrasDialog, ProdutoFornecedorDialog } from '@/features/produtos/components/ProdutoComplementoDialogs';
import { ProdutoFormDialog } from '@/features/produtos/components/ProdutoFormDialog';
import { useProdutoMutations, useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { CodigoBarrasFormValues, ProdutoFormValues, ProdutoFornecedorFormValues, ProdutoListQuery, ProdutoResponse } from '@/features/produtos/types/produtos.types';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { EntityStatus, TipoProduto } from '@/types/erp';

const isActive = (record: ProdutoResponse) => Number(record.status) === EntityStatus.Ativo;
const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const filterLocal = (records: ProdutoResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => Object.values(record).some((value) => String(value ?? '').toLowerCase().includes(normalized)));
};

const tipoProdutoLabel = (tipo: number | TipoProduto) => {
    const map: Record<number, string> = {
        [TipoProduto.Mercadoria]: 'Mercadoria',
        [TipoProduto.Servico]: 'Serviço',
        [TipoProduto.MateriaPrima]: 'Matéria-prima',
        [TipoProduto.ProdutoAcabado]: 'Produto acabado',
        [TipoProduto.UsoConsumo]: 'Uso e consumo',
        [TipoProduto.AtivoImobilizado]: 'Ativo imobilizado',
        [TipoProduto.Outro]: 'Outro'
    };
    return map[Number(tipo)] ?? String(tipo);
};

type ComplementoState = { kind: 'codigo' | 'fornecedor'; record: ProdutoResponse } | null;

export const ProdutosPage = () => {
    const runWithToast = useMutationWithToast();
    const { hasPermission } = usePermissions();
    const [filters, setFilters] = useState<ProdutoListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [selected, setSelected] = useState<ProdutoResponse | null>(null);
    const [reasonRecord, setReasonRecord] = useState<ProdutoResponse | null>(null);
    const [complementoState, setComplementoState] = useState<ComplementoState>(null);

    const produtosQuery = useProdutos(filters);
    const fornecedoresQuery = useFornecedores({ empresaId: filters.empresaId, filialId: filters.filialId });
    const { saveMutation, precoCustoMutation, dadosFiscaisMutation, codigoBarrasMutation, fornecedorMutation, inativarMutation } = useProdutoMutations();

    const records = useMemo(() => filterLocal(produtosQuery.data ?? [], localSearch), [produtosQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('PRODUTOS_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de Produtos exige a permissão PRODUTOS_CONSULTAR." />;
    }

    const updateFilter = (name: keyof ProdutoListQuery, value: string | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value || null }));
    };

    const save = async (values: ProdutoFormValues) => {
        await runWithToast(
            async () => {
                const saved = await saveMutation.mutateAsync({ id: values.id, values });
                const produtoId = saved.id;

                if (values.id) {
                    await precoCustoMutation.mutateAsync({ id: produtoId, values: { precoVendaBase: values.precoVendaBase, custoReferencial: values.custoReferencial } });
                    if (hasPermission('PRODUTOS_DADOS_FISCAIS_GERENCIAR')) {
                        await dadosFiscaisMutation.mutateAsync({ id: produtoId, values: { ncm: values.ncm, cest: values.cest, origemMercadoriaCodigo: values.origemMercadoriaCodigo, tipoItemFiscal: values.tipoItemFiscal, unidadeTributavelId: values.unidadeTributavelId, codigoFiscalExterno: values.codigoFiscalExterno } });
                    }
                } else if (hasPermission('PRODUTOS_DADOS_FISCAIS_GERENCIAR')) {
                    await dadosFiscaisMutation.mutateAsync({ id: produtoId, values: { ncm: values.ncm, cest: values.cest, origemMercadoriaCodigo: values.origemMercadoriaCodigo, tipoItemFiscal: values.tipoItemFiscal, unidadeTributavelId: values.unidadeTributavelId, codigoFiscalExterno: values.codigoFiscalExterno } });
                }

                setFormVisible(false);
                setSelected(null);
            },
            { success: { summary: 'Produto salvo', detail: 'Cadastro do produto gravado com sucesso.' }, error: { summary: 'Erro ao salvar produto', detail: 'Não foi possível salvar o produto.' }, rethrow: true }
        );
    };

    const inativar = async (motivo: string) => {
        if (!reasonRecord) return;
        await runWithToast(
            async () => {
                await inativarMutation.mutateAsync({ id: reasonRecord.id, motivo });
                setReasonRecord(null);
            },
            { success: { summary: 'Produto inativado', detail: 'Motivo registrado com sucesso.' }, error: { summary: 'Erro ao inativar produto', detail: 'Não foi possível inativar o produto.' } }
        );
    };

    const adicionarCodigo = async (values: CodigoBarrasFormValues) => {
        if (!complementoState) return;
        await runWithToast(
            async () => {
                await codigoBarrasMutation.mutateAsync({ id: complementoState.record.id, values });
                setComplementoState(null);
            },
            { success: { summary: 'Código adicionado', detail: 'Código de barras vinculado ao produto.' }, error: { summary: 'Erro ao adicionar código', detail: 'Não foi possível adicionar o código de barras.' }, rethrow: true }
        );
    };

    const vincularFornecedor = async (values: ProdutoFornecedorFormValues) => {
        if (!complementoState) return;
        await runWithToast(
            async () => {
                await fornecedorMutation.mutateAsync({ id: complementoState.record.id, values });
                setComplementoState(null);
            },
            { success: { summary: 'Fornecedor vinculado', detail: 'Fornecedor vinculado ao produto.' }, error: { summary: 'Erro ao vincular fornecedor', detail: 'Não foi possível vincular fornecedor.' }, rethrow: true }
        );
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <SearchInput ariaLabel="Buscar produtos" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="PRODUTOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo produto" icon="pi pi-plus" disabled={disabled} onClick={() => { setSelected(null); setFormVisible(true); }} />}</PermissionGuard>
        </div>
    );

    const mutationLoading = saveMutation.isPending || precoCustoMutation.isPending || dadosFiscaisMutation.isPending;

    return (
        <>
            <PageHeader title="Produtos" description="Cadastro de produtos com dados comerciais, fiscais, códigos de barras e fornecedor." actions={headerActions} />
            <Message className="w-full mb-3" severity="info" text="Produto inativo não deve ser comprado, vendido ou movimentado. O backend valida unicidade de código, preço/custo não negativos e vínculo obrigatório com unidade." />
            <OperationalGovernancePanel title="Governança de catálogo" description="Resumo dos produtos carregados, com foco em disponibilidade operacional, dados fiscais e impacto em vendas, compras e estoque." records={records} activeLabel="Disponíveis" inactiveLabel="Bloqueados" complianceNote="Produtos inativos não devem ser utilizados em venda, compra ou movimentação; preço, custo e dados fiscais seguem validação do backend." />
            <Card>
                {produtosQuery.error ? <ApiErrorPanel error={mapApiError(produtosQuery.error)} /> : null}
                <DataTableServer<ProdutoResponse> value={visibleRecords} totalRecords={records.length} loading={produtosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum produto encontrado.">
                    <Column field="codigo" header="Código" />
                    <Column field="descricao" header="Descrição" />
                    <Column header="Tipo" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: ProdutoResponse) => tipoProdutoLabel(row.tipoProduto)} />
                    <Column header="Preço" body={(row: ProdutoResponse) => formatMoney(row.precoVendaBase)} />
                    <Column header="Custo" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: ProdutoResponse) => formatMoney(row.custoReferencial)} />
                    <Column header="Operação" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: ProdutoResponse) => <div className="flex gap-1 flex-wrap"><Tag value={row.controlaEstoque ? 'Estoque' : 'Sem estoque'} severity={row.controlaEstoque ? 'info' : undefined} /><Tag value={row.permiteVenda ? 'Venda' : 'Venda bloqueada'} severity={row.permiteVenda ? 'success' : 'warning'} /><Tag value={row.permiteCompra ? 'Compra' : 'Compra bloqueada'} severity={row.permiteCompra ? 'success' : 'warning'} /></div>} />
                    <Column header="Status" body={(row: ProdutoResponse) => <StatusTag status={row.status} />} />
                    <Column header="Ações" alignHeader="right" body={(row: ProdutoResponse) => <DataTableActions actions={[{ key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'PRODUTOS_GERENCIAR', disabled: !isActive(row), onClick: () => { setSelected(row); setFormVisible(true); } }, { key: 'codigo', label: 'Código', icon: 'pi pi-barcode', permission: 'PRODUTOS_GERENCIAR', disabled: !isActive(row), onClick: () => setComplementoState({ kind: 'codigo', record: row }) }, { key: 'fornecedor', label: 'Fornecedor', icon: 'pi pi-truck', permission: 'PRODUTOS_GERENCIAR', disabled: !isActive(row), onClick: () => setComplementoState({ kind: 'fornecedor', record: row }) }, { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', permission: 'PRODUTOS_INATIVAR', severity: 'danger', disabled: !isActive(row), onClick: () => setReasonRecord(row) }]} />} />
                </DataTableServer>
                {!produtosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum produto" description="Crie um cadastro ou ajuste os filtros." /> : null}
            </Card>
            <ProdutoFormDialog visible={formVisible} record={selected} loading={mutationLoading} onHide={() => setFormVisible(false)} onSubmit={save} />
            <CodigoBarrasDialog visible={complementoState?.kind === 'codigo'} loading={codigoBarrasMutation.isPending} onHide={() => setComplementoState(null)} onSubmit={adicionarCodigo} />
            <ProdutoFornecedorDialog visible={complementoState?.kind === 'fornecedor'} fornecedores={fornecedoresQuery.data ?? []} loading={fornecedorMutation.isPending} onHide={() => setComplementoState(null)} onSubmit={vincularFornecedor} />
            <ReasonDialog visible={Boolean(reasonRecord)} title="Motivo da inativação" confirmLabel="Inativar" loading={inativarMutation.isPending} onHide={() => setReasonRecord(null)} onConfirm={inativar} />
        </>
    );
};
