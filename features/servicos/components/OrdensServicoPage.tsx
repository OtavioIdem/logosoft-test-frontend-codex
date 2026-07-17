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
import { useOrdensServico, useOrdensServicoMutations } from '@/features/servicos/hooks/useServicosResources';
import { OrdemServicoFormValues, OrdemServicoResponse, OrdensServicoListQuery, StatusOrdemServico } from '@/features/servicos/types/servicos.types';
import { OrdemServicoFormDialog } from '@/features/servicos/components/OrdemServicoFormDialog';
import { prioridadeLabel, prioridadeSeverity, statusOrdemServicoLabel, statusOrdemServicoSeverity } from '@/features/servicos/components/servicosLabels';

const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const statusFilterOptions = [
    { label: 'Todos os status', value: null },
    { label: 'Aberta', value: StatusOrdemServico.Aberta },
    { label: 'Triagem', value: StatusOrdemServico.Triagem },
    { label: 'Planejada', value: StatusOrdemServico.Planejada },
    { label: 'Em execução', value: StatusOrdemServico.EmExecucao },
    { label: 'Encerrada', value: StatusOrdemServico.EncerradaTecnicamente },
    { label: 'Faturada', value: StatusOrdemServico.Faturada },
    { label: 'Cancelada', value: StatusOrdemServico.Cancelada }
];

const filterLocal = (records: OrdemServicoResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.numero} ${record.descricao}`.toLowerCase().includes(normalized));
};

export const OrdensServicoPage = () => {
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<OrdensServicoListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);

    const ordensQuery = useOrdensServico(filters, hasPermission('SERVICOS_CONSULTAR'));
    const { criarMutation } = useOrdensServicoMutations();

    const records = useMemo(() => filterLocal(ordensQuery.data ?? [], localSearch), [ordensQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('SERVICOS_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de Serviços exige a permissão SERVICOS_CONSULTAR." />;
    }

    const updateFilter = (name: keyof OrdensServicoListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const criar = async (values: OrdemServicoFormValues) => {
        await runWithToast(
            async () => {
                const criada = await criarMutation.mutateAsync(values);
                setFormVisible(false);
                router.push(`/servicos/ordens/${criada.id}`);
            },
            { success: { summary: 'OS criada', detail: `Ordem de serviço ${values.numero} aberta.` }, error: { summary: 'Erro ao criar OS', detail: 'Não foi possível criar a ordem de serviço.' }, rethrow: true }
        );
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <SearchInput ariaLabel="Buscar OS" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="SERVICOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Nova OS" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Ordens de serviço" description="Abertura, triagem, planejamento, execução, encerramento e faturamento de OS." actions={headerActions} />
            <Card>
                {ordensQuery.error ? <ApiErrorPanel error={mapApiError(ordensQuery.error)} /> : null}
                <DataTableServer<OrdemServicoResponse> value={visibleRecords} totalRecords={records.length} loading={ordensQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma ordem de serviço encontrada.">
                    <Column field="numero" header="Número" />
                    <Column header="Descrição" body={(row: OrdemServicoResponse) => row.descricao} />
                    <Column header="Prioridade" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: OrdemServicoResponse) => <Tag value={prioridadeLabel(Number(row.prioridade))} severity={prioridadeSeverity(Number(row.prioridade)) ?? undefined} />} />
                    <Column header="Total" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: OrdemServicoResponse) => formatMoney(row.valorTotal)} />
                    <Column header="Status" body={(row: OrdemServicoResponse) => <Tag value={statusOrdemServicoLabel(Number(row.statusOS))} severity={statusOrdemServicoSeverity(Number(row.statusOS)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: OrdemServicoResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'SERVICOS_CONSULTAR', onClick: () => router.push(`/servicos/ordens/${row.id}`) }]} />} />
                </DataTableServer>
                {!ordensQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma OS" description="Crie uma ordem de serviço ou ajuste os filtros." /> : null}
            </Card>
            <OrdemServicoFormDialog visible={formVisible} loading={criarMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={criar} />
        </>
    );
};
