'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
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
import { useSolicitacoesCompra, useSolicitacoesCompraMutations } from '@/features/compras-avancado/hooks/useComprasAvancadoResources';
import { CriarSolicitacaoFormValues, SolicitacaoCompraResponse, SolicitacoesListQuery } from '@/features/compras-avancado/types/comprasAvancado.types';
import { CriarSolicitacaoDialog } from '@/features/compras-avancado/components/SolicitacaoDialogs';
import { statusSolicitacaoLabel, statusSolicitacaoOptions, statusSolicitacaoSeverity } from '@/features/compras-avancado/components/comprasAvancadoLabels';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');
const filterLocal = (records: SolicitacaoCompraResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.numero} ${record.solicitante}`.toLowerCase().includes(normalized));
};

export const SolicitacoesCompraPage = () => {
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<SolicitacoesListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);

    const solicitacoesQuery = useSolicitacoesCompra(filters, hasPermission('COMPRAS_SOLICITACOES_CONSULTAR'));
    const { criarMutation } = useSolicitacoesCompraMutations();

    const records = useMemo(() => filterLocal(solicitacoesQuery.data ?? [], localSearch), [solicitacoesQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('COMPRAS_SOLICITACOES_CONSULTAR')) {
        return <UnauthorizedState description="Solicitações de compra exigem COMPRAS_SOLICITACOES_CONSULTAR." />;
    }

    const updateFilter = (name: keyof SolicitacoesListQuery, value: string | number | null) => { setFirst(0); setFilters((c) => ({ ...c, [name]: value === '' ? null : value })); };

    const criar = async (values: CriarSolicitacaoFormValues) => {
        await runWithToast(
            async () => {
                const criada = await criarMutation.mutateAsync(values);
                setFormVisible(false);
                router.push(`/compras/solicitacoes/${criada.id}`);
            },
            { success: { summary: 'Solicitação criada', detail: `Solicitação ${values.numero} aberta.` }, error: { summary: 'Erro ao criar solicitação', detail: 'Não foi possível criar a solicitação.' }, rethrow: true }
        );
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusSolicitacaoOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <SearchInput ariaLabel="Buscar solicitação" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="COMPRAS_SOLICITACOES_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Nova solicitação" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Solicitações de compra" description="Abertura → itens → aprovação (habilita cotação)." actions={headerActions} />
            <Card>
                {solicitacoesQuery.error ? <ApiErrorPanel error={mapApiError(solicitacoesQuery.error)} /> : null}
                <DataTableServer<SolicitacaoCompraResponse> value={visibleRecords} totalRecords={records.length} loading={solicitacoesQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma solicitação encontrada.">
                    <Column field="numero" header="Número" />
                    <Column field="solicitante" header="Solicitante" />
                    <Column header="Data" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: SolicitacaoCompraResponse) => formatDate(row.dataSolicitacao)} />
                    <Column header="Itens" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: SolicitacaoCompraResponse) => row.itens.length} />
                    <Column header="Status" body={(row: SolicitacaoCompraResponse) => <Tag value={statusSolicitacaoLabel(Number(row.statusSolicitacao))} severity={statusSolicitacaoSeverity(Number(row.statusSolicitacao)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: SolicitacaoCompraResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'COMPRAS_SOLICITACOES_CONSULTAR', onClick: () => router.push(`/compras/solicitacoes/${row.id}`) }]} />} />
                </DataTableServer>
                {!solicitacoesQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma solicitação" description="Crie uma solicitação ou ajuste os filtros." /> : null}
            </Card>
            <CriarSolicitacaoDialog visible={formVisible} loading={criarMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={criar} />
        </>
    );
};
