'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { SearchInput } from '@/components/forms/SearchInput';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useFichaTecnica, useFichasTecnicas, useFichaTecnicaMutations } from '@/features/producao/hooks/useProducaoResources';
import { ComponenteFichaTecnicaFormValues, ComponenteFichaTecnicaResponse, FichaTecnicaFormValues, FichaTecnicaResumoResponse, FichasTecnicasListQuery } from '@/features/producao/types/producao.types';
import { ComponenteDialog, FichaTecnicaFormDialog } from '@/features/producao/components/ProducaoDialogs';
import { fichaPodeAtivar, fichaPodeComponentes, fichaPodeInativar, statusFichaFilterOptions, statusFichaLabel, statusFichaSeverity } from '@/features/producao/components/producaoLabels';

const filterLocal = (records: FichaTecnicaResumoResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.codigo} ${record.descricao}`.toLowerCase().includes(normalized));
};

export const FichasTecnicasPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<FichasTecnicasListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [componenteVisible, setComponenteVisible] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const fichasQuery = useFichasTecnicas(filters, hasPermission('PRODUCAO_CONSULTAR'));
    const detalheQuery = useFichaTecnica(selectedId);
    const detalhe = detalheQuery.data ?? null;
    const { criarMutation, componenteMutation, ativarMutation, inativarMutation } = useFichaTecnicaMutations();

    const produtosQuery = useProdutos({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null });
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);
    const produtoLabel = useMemo(() => {
        const map = new Map(produtoOptions.map((option) => [option.value, option.label]));
        return (id: string) => map.get(id) ?? id;
    }, [produtoOptions]);

    const records = useMemo(() => filterLocal(fichasQuery.data ?? [], localSearch), [fichasQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('PRODUCAO_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Produção exige a permissão PRODUCAO_CONSULTAR." />;
    }

    const updateFilter = (name: keyof FichasTecnicasListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const criar = async (values: FichaTecnicaFormValues) => {
        await runWithToast(async () => { const criada = await criarMutation.mutateAsync(values); setFormVisible(false); setSelectedId(criada.id); }, { success: { summary: 'Ficha técnica criada' }, error: { summary: 'Erro ao criar ficha' }, rethrow: true });
    };
    const adicionarComponente = async (values: ComponenteFichaTecnicaFormValues) => {
        if (!selectedId) return;
        await runWithToast(async () => { await componenteMutation.mutateAsync({ id: selectedId, values }); setComponenteVisible(false); }, { success: { summary: 'Componente adicionado' }, error: { summary: 'Erro ao adicionar componente' }, rethrow: true });
    };
    const ativar = () => selectedId && runWithToast(() => ativarMutation.mutateAsync(selectedId), { success: { summary: 'Ficha ativada' }, error: { summary: 'Erro ao ativar ficha' } });
    const inativar = () => selectedId && runWithToast(() => inativarMutation.mutateAsync(selectedId), { success: { summary: 'Ficha inativada' }, error: { summary: 'Erro ao inativar ficha' } });

    const status = detalhe ? Number(detalhe.status) : 0;

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusFichaFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <SearchInput ariaLabel="Buscar ficha" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="PRODUCAO_FICHA_TECNICA_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Nova ficha" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Fichas técnicas" description="Estrutura de produto (BOM): componentes e perdas por ficha." actions={headerActions} />
            <Card>
                {fichasQuery.error ? <ApiErrorPanel error={mapApiError(fichasQuery.error)} /> : null}
                <DataTableServer<FichaTecnicaResumoResponse> value={visibleRecords} totalRecords={records.length} loading={fichasQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma ficha técnica encontrada.">
                    <Column field="codigo" header="Código" />
                    <Column field="descricao" header="Descrição" />
                    <Column header="Produto" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: FichaTecnicaResumoResponse) => produtoLabel(row.produtoId)} />
                    <Column header="Qtd. base" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: FichaTecnicaResumoResponse) => row.quantidadeBase.toLocaleString('pt-BR')} />
                    <Column header="Status" body={(row: FichaTecnicaResumoResponse) => <Tag value={statusFichaLabel(Number(row.status))} severity={statusFichaSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: FichaTecnicaResumoResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'PRODUCAO_CONSULTAR', onClick: () => setSelectedId(row.id) }]} />} />
                </DataTableServer>
                {!fichasQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma ficha" description="Crie uma ficha técnica ou ajuste os filtros." /> : null}
            </Card>

            {detalhe ? (
                <Card title={`Ficha: ${detalhe.codigo} — ${detalhe.descricao}`} className="mt-3">
                    <div className="flex gap-2 flex-wrap mb-3 align-items-center">
                        <Tag value={statusFichaLabel(status)} severity={statusFichaSeverity(status) ?? undefined} />
                        <span className="text-color-secondary">{produtoLabel(detalhe.produtoId)} · base {detalhe.quantidadeBase.toLocaleString('pt-BR')}{detalhe.versao ? ` · v${detalhe.versao}` : ''}</span>
                        <div className="flex-1" />
                        {fichaPodeComponentes(status) ? <PermissionGuard permission="PRODUCAO_FICHA_TECNICA_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Adicionar componente" icon="pi pi-plus" size="small" severity="secondary" disabled={disabled} onClick={() => setComponenteVisible(true)} />}</PermissionGuard> : null}
                        {fichaPodeAtivar(status) ? <PermissionGuard permission="PRODUCAO_FICHA_TECNICA_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Ativar" icon="pi pi-check" size="small" severity="success" disabled={disabled} loading={ativarMutation.isPending} onClick={ativar} />}</PermissionGuard> : null}
                        {fichaPodeInativar(status) ? <PermissionGuard permission="PRODUCAO_FICHA_TECNICA_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Inativar" icon="pi pi-ban" size="small" severity="danger" outlined disabled={disabled} loading={inativarMutation.isPending} onClick={inativar} />}</PermissionGuard> : null}
                    </div>
                    <DataTable value={detalhe.componentes} dataKey="id" emptyMessage="Nenhum componente." responsiveLayout="scroll" stripedRows size="small">
                        <Column header="Componente" body={(item: ComponenteFichaTecnicaResponse) => produtoLabel(item.produtoId)} />
                        <Column header="Quantidade" body={(item: ComponenteFichaTecnicaResponse) => item.quantidade.toLocaleString('pt-BR')} />
                        <Column header="Perda" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: ComponenteFichaTecnicaResponse) => (item.perdaPercentual != null ? `${item.perdaPercentual}%` : '—')} />
                        <Column field="observacao" header="Observação" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(item: ComponenteFichaTecnicaResponse) => item.observacao || '—'} />
                    </DataTable>
                </Card>
            ) : null}

            <FichaTecnicaFormDialog visible={formVisible} loading={criarMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={criar} />
            <ComponenteDialog visible={componenteVisible} loading={componenteMutation.isPending} produtoOptions={produtoOptions} produtoLoading={produtosQuery.isFetching} onHide={() => setComponenteVisible(false)} onSubmit={adicionarComponente} />
        </>
    );
};
