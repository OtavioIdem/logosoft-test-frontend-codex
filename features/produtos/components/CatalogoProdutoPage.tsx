'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { SearchInput } from '@/components/forms/SearchInput';
import { Message } from 'primereact/message';
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
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { CatalogoProdutoFormDialog } from '@/features/produtos/components/CatalogoProdutoFormDialog';
import { useCategoriaProdutoMutations, useCategoriasProduto, useMarcaMutations, useMarcas, useUnidadeMedidaMutations, useUnidadesMedida } from '@/features/produtos/hooks/useProdutosResources';
import { CatalogoListQuery, CategoriaProdutoResponse, MarcaResponse, UnidadeMedidaResponse } from '@/features/produtos/types/produtos.types';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { EntityStatus, PermissionCode } from '@/types/erp';

type CatalogoKind = 'categoria' | 'unidade' | 'marca';
type CatalogoRecord = CategoriaProdutoResponse | UnidadeMedidaResponse | MarcaResponse;

type Config = {
    title: string;
    description: string;
    createLabel: string;
    permission: PermissionCode;
    managePermission: PermissionCode;
};

const configMap: Record<CatalogoKind, Config> = {
    categoria: { title: 'Categorias de produto', description: 'Cadastro de categorias com código único por empresa e inativação controlada.', createLabel: 'Nova categoria', permission: 'PRODUTOS_CONSULTAR', managePermission: 'CATEGORIAS_PRODUTO_GERENCIAR' },
    unidade: { title: 'Unidades de medida', description: 'Cadastro de siglas, casas decimais e permissão de fracionamento.', createLabel: 'Nova unidade', permission: 'PRODUTOS_CONSULTAR', managePermission: 'UNIDADES_MEDIDA_GERENCIAR' },
    marca: { title: 'Marcas', description: 'Cadastro de marcas comerciais utilizadas no catálogo de produtos.', createLabel: 'Nova marca', permission: 'PRODUTOS_CONSULTAR', managePermission: 'MARCAS_GERENCIAR' }
};

const isActive = (record: CatalogoRecord) => Number(record.status) === EntityStatus.Ativo;
const filterLocal = (records: CatalogoRecord[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => Object.values(record).some((value) => String(value ?? '').toLowerCase().includes(normalized)));
};

export const CatalogoProdutoPage = ({ kind }: { kind: CatalogoKind }) => {
    const runWithToast = useMutationWithToast();
    const { hasPermission } = usePermissions();
    const config = configMap[kind];
    const [filters, setFilters] = useState<CatalogoListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [selected, setSelected] = useState<CatalogoRecord | null>(null);
    const [reasonRecord, setReasonRecord] = useState<CatalogoRecord | null>(null);

    const categoriaQuery = useCategoriasProduto(filters);
    const unidadeQuery = useUnidadesMedida(filters);
    const marcaQuery = useMarcas(filters);
    const categoriaMutations = useCategoriaProdutoMutations();
    const unidadeMutations = useUnidadeMedidaMutations();
    const marcaMutations = useMarcaMutations();

    const query = kind === 'categoria' ? categoriaQuery : kind === 'unidade' ? unidadeQuery : marcaQuery;
    const mutations = kind === 'categoria' ? categoriaMutations : kind === 'unidade' ? unidadeMutations : marcaMutations;

    const records = useMemo(() => filterLocal((query.data ?? []) as CatalogoRecord[], localSearch), [query.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission(config.permission)) {
        return <UnauthorizedState description={`A rotina exige a permissão ${config.permission}.`} />;
    }

    const updateFilter = (name: keyof CatalogoListQuery, value: string | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value || null }));
    };

    const save = async (values: Record<string, unknown>) => {
        await runWithToast(
            async () => {
                await mutations.saveMutation.mutateAsync({ id: typeof values.id === 'string' ? values.id : undefined, values });
                setFormVisible(false);
                setSelected(null);
            },
            { success: { summary: 'Cadastro salvo', detail: `${config.title} atualizado com sucesso.` }, error: { summary: 'Erro ao salvar cadastro', detail: 'Não foi possível salvar o cadastro.' }, rethrow: true }
        );
    };

    const inativar = async (motivo: string) => {
        if (!reasonRecord) return;
        await runWithToast(
            async () => {
                await mutations.inativarMutation.mutateAsync({ id: reasonRecord.id, motivo });
                setReasonRecord(null);
            },
            { success: { summary: 'Cadastro inativado', detail: 'Motivo registrado com sucesso.' }, error: { summary: 'Erro ao inativar cadastro', detail: 'Não foi possível inativar o cadastro.' } }
        );
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <SearchInput ariaLabel="Buscar no catálogo" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission={config.managePermission} mode="disable">{({ disabled }) => <Button label={config.createLabel} icon="pi pi-plus" disabled={disabled} onClick={() => { setSelected(null); setFormVisible(true); }} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title={config.title} description={config.description} actions={headerActions} />
            <Message className="w-full mb-3" severity="info" text="O backend valida unicidade por empresa e impede alteração de registros inativos." />
            <OperationalGovernancePanel title="Governança do cadastro auxiliar" description="Resumo dos registros carregados para manter categorias, unidades e marcas consistentes com o catálogo de produtos." records={records} complianceNote="Registros auxiliares inativos não devem ser selecionados em novos produtos; alterações permanecem controladas por permissão e validação do backend." />
            <Card>
                {query.error ? <ApiErrorPanel error={mapApiError(query.error)} /> : null}
                <DataTableServer<CatalogoRecord> value={visibleRecords} totalRecords={records.length} loading={query.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum registro encontrado.">
                    {kind === 'categoria' ? <Column field="codigo" header="Código" /> : null}
                    {kind === 'unidade' ? <Column field="sigla" header="Sigla" /> : null}
                    <Column field={kind === 'unidade' ? 'descricao' : 'nome'} header={kind === 'unidade' ? 'Descrição' : 'Nome'} />
                    {kind === 'unidade' ? <Column field="casasDecimais" header="Casas decimais" /> : null}
                    {kind === 'unidade' ? <Column header="Fracionado" body={(row: UnidadeMedidaResponse) => (row.permiteFracionado ? 'Sim' : 'Não')} /> : null}
                    <Column header="Status" body={(row: CatalogoRecord) => <StatusTag status={row.status} />} />
                    <Column header="Ações" alignHeader="right" body={(row: CatalogoRecord) => <DataTableActions actions={[{ key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: config.managePermission, disabled: !isActive(row), onClick: () => { setSelected(row); setFormVisible(true); } }, { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', permission: config.managePermission, severity: 'danger', disabled: !isActive(row), onClick: () => setReasonRecord(row) }]} />} />
                </DataTableServer>
                {!query.isLoading && records.length === 0 ? <EmptyState title="Nenhum registro" description="Crie um cadastro ou ajuste os filtros." /> : null}
            </Card>
            <CatalogoProdutoFormDialog kind={kind} visible={formVisible} record={selected} loading={mutations.saveMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={save} />
            <ReasonDialog visible={Boolean(reasonRecord)} title="Motivo da inativação" confirmLabel="Inativar" loading={mutations.inativarMutation.isPending} onHide={() => setReasonRecord(null)} onConfirm={inativar} />
        </>
    );
};
