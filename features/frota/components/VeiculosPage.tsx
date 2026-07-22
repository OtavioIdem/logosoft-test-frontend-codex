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
import { useVeiculoMutations, useVeiculos } from '@/features/frota/hooks/useFrotaResources';
import { VeiculoFormValues, VeiculoResponse, VeiculosListQuery } from '@/features/frota/types/frota.types';
import { VeiculoFormDialog } from '@/features/frota/components/VeiculoFormDialog';
import { combustivelLabel, statusVeiculoFilterOptions, statusVeiculoLabel, statusVeiculoSeverity, tipoVeiculoFilterOptions, tipoVeiculoLabel } from '@/features/frota/components/frotaLabels';

const filterLocal = (records: VeiculoResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.placa} ${record.modelo} ${record.marca ?? ''}`.toLowerCase().includes(normalized));
};

export const VeiculosPage = () => {
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<VeiculosListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);

    const veiculosQuery = useVeiculos(filters, hasPermission('FROTA_CONSULTAR'));
    const { criarMutation } = useVeiculoMutations();

    const records = useMemo(() => filterLocal(veiculosQuery.data ?? [], localSearch), [veiculosQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('FROTA_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de Frota exige a permissão FROTA_CONSULTAR." />;
    }

    const updateFilter = (name: keyof VeiculosListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const criar = async (values: VeiculoFormValues) => {
        await runWithToast(
            async () => {
                const criado = await criarMutation.mutateAsync(values);
                setFormVisible(false);
                router.push(`/frota/veiculos/${criado.id}`);
            },
            { success: { summary: 'Veículo cadastrado', detail: `Placa ${values.placa} adicionada à frota.` }, error: { summary: 'Erro ao cadastrar veículo', detail: 'Não foi possível cadastrar o veículo.' }, rethrow: true }
        );
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.tipo ?? null} options={tipoVeiculoFilterOptions} onChange={(event) => updateFilter('tipo', event.value)} aria-label="Filtrar por tipo" />
            <Dropdown value={filters.status ?? null} options={statusVeiculoFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <SearchInput ariaLabel="Buscar veículo" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="FROTA_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo veículo" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Veículos" description="Cadastro da frota, abastecimentos, manutenções, despesas e documentos." actions={headerActions} />
            <Card>
                {veiculosQuery.error ? <ApiErrorPanel error={mapApiError(veiculosQuery.error)} /> : null}
                <DataTableServer<VeiculoResponse> value={visibleRecords} totalRecords={records.length} loading={veiculosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum veículo encontrado.">
                    <Column field="placa" header="Placa" />
                    <Column field="modelo" header="Modelo" />
                    <Column header="Tipo" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: VeiculoResponse) => tipoVeiculoLabel(Number(row.tipo))} />
                    <Column header="Combustível" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: VeiculoResponse) => combustivelLabel(Number(row.combustivel))} />
                    <Column header="Odômetro" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: VeiculoResponse) => row.odometroAtual.toLocaleString('pt-BR')} />
                    <Column header="Status" body={(row: VeiculoResponse) => <Tag value={statusVeiculoLabel(Number(row.status))} severity={statusVeiculoSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: VeiculoResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'FROTA_CONSULTAR', onClick: () => router.push(`/frota/veiculos/${row.id}`) }]} />} />
                </DataTableServer>
                {!veiculosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum veículo" description="Cadastre um veículo ou ajuste os filtros." /> : null}
            </Card>
            <VeiculoFormDialog visible={formVisible} loading={criarMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={criar} />
        </>
    );
};
