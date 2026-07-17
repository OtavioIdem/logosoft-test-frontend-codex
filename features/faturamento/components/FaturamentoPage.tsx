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
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAppToast } from '@/hooks/useAppToast';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useFaturamentoMutations, useFaturamentos } from '@/features/faturamento/hooks/useFaturamentoResources';
import { FaturamentoResponse, FaturamentosListQuery, PrepararFaturamentoFormValues } from '@/features/faturamento/types/faturamento.types';
import { PrepararFaturamentoDialog } from '@/features/faturamento/components/FaturamentoDialogs';
import { statusFaturamentoLabel, statusFaturamentoOptions, statusFaturamentoSeverity } from '@/features/faturamento/components/faturamentoLabels';

const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

export const FaturamentoPage = () => {
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const toast = useAppToast();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<Pick<FaturamentosListQuery, 'empresaId' | 'filialId' | 'etapa'>>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [prepararVisible, setPrepararVisible] = useState(false);

    const page = Math.floor(first / rows) + 1;
    const listQuery = useMemo<FaturamentosListQuery>(() => ({ ...filters, page, pageSize: rows }), [filters, page, rows]);
    const faturamentosQuery = useFaturamentos(listQuery, hasPermission('FATURAMENTO_CONSULTAR'));
    const { prepararMutation } = useFaturamentoMutations();

    const paged = faturamentosQuery.data;
    const faturamentos = paged?.items ?? [];
    const totalRecords = paged?.totalItems ?? 0;

    if (!hasPermission('FATURAMENTO_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de Faturamento exige a permissão FATURAMENTO_CONSULTAR." />;
    }

    const updateFilter = (name: 'empresaId' | 'filialId' | 'etapa', value: string | number | null) => { setFirst(0); setFilters((c) => ({ ...c, [name]: value === '' ? null : value })); };

    const preparar = async (values: PrepararFaturamentoFormValues) => {
        await runWithToast(
            async () => {
                const result = await prepararMutation.mutateAsync(values);
                setPrepararVisible(false);
                if (result.jaExistia) toast.info('Faturamento já existia', 'Reaproveitando o faturamento do pedido.');
                if (result.alertas?.length) toast.warn('Alertas do faturamento', result.alertas.join(' • '));
                router.push(`/faturamento/${result.faturamento.id}`);
            },
            { success: { summary: 'Faturamento preparado' }, error: { summary: 'Erro ao preparar faturamento', detail: 'Não foi possível preparar o faturamento.' }, rethrow: true }
        );
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.etapa ?? null} options={statusFaturamentoOptions} onChange={(event) => updateFilter('etapa', event.value)} aria-label="Filtrar por etapa" />
            <PermissionGuard permission="FATURAMENTO_PREPARAR" mode="disable">{({ disabled }) => <Button label="Preparar faturamento" icon="pi pi-plus" disabled={disabled} onClick={() => setPrepararVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Faturamento" description="Orquestra pedido de venda → nota fiscal → SEFAZ → estoque → conta a receber." actions={headerActions} />
            <Card>
                {faturamentosQuery.error ? <ApiErrorPanel error={mapApiError(faturamentosQuery.error)} /> : null}
                <DataTableServer<FaturamentoResponse> value={faturamentos} totalRecords={totalRecords} loading={faturamentosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum faturamento encontrado.">
                    <Column header="Pedido" body={(row: FaturamentoResponse) => row.pedidoVendaId} />
                    <Column header="Valor" body={(row: FaturamentoResponse) => formatMoney(row.valorTotal)} />
                    <Column header="Confirmado" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: FaturamentoResponse) => formatDateTime(row.confirmadoEm)} />
                    <Column header="Etapa" body={(row: FaturamentoResponse) => <Tag value={statusFaturamentoLabel(Number(row.etapa))} severity={statusFaturamentoSeverity(Number(row.etapa)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: FaturamentoResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'FATURAMENTO_CONSULTAR', onClick: () => router.push(`/faturamento/${row.id}`) }]} />} />
                </DataTableServer>
                {!faturamentosQuery.isLoading && totalRecords === 0 ? <EmptyState title="Nenhum faturamento" description="Prepare um faturamento a partir de um pedido de venda." /> : null}
            </Card>

            <PrepararFaturamentoDialog visible={prepararVisible} loading={prepararMutation.isPending} empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onHide={() => setPrepararVisible(false)} onSubmit={preparar} />
        </>
    );
};
