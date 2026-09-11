'use client';

import { useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { SearchInput } from '@/components/forms/SearchInput';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { bancosApi } from '@/features/bancos/api/bancosApi';
import { useBoletoHistorico, useBoletoMutations, useBoletos } from '@/features/bancos/hooks/useBancosResources';
import { BoletoResponse, BoletoResumoResponse, BoletosListQuery } from '@/features/bancos/types/bancos.types';
import { BoletoDetalheDialog } from '@/features/bancos/components/BancosOperacoesDialogs';
import { boletoPodeCancelar, statusBoletoFilterOptions, statusBoletoLabel, statusBoletoSeverity } from '@/features/bancos/components/bancosLabels';
import { formatMoney } from '@/lib/formatters/money';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

const filterLocal = (records: BoletoResumoResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.numeroDocumento ?? ''} ${record.nossoNumero ?? ''}`.toLowerCase().includes(normalized));
};

export const BoletosPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<BoletosListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [cancelarAlvo, setCancelarAlvo] = useState<string | null>(null);
    const [detalhe, setDetalhe] = useState<BoletoResponse | null>(null);

    const boletosQuery = useBoletos(filters, hasPermission('BANCOS_CONSULTAR'));
    const historicoQuery = useBoletoHistorico(detalhe?.id ?? null);
    const { cancelarMutation } = useBoletoMutations();

    const records = useMemo(() => filterLocal(boletosQuery.data ?? [], localSearch), [boletosQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('BANCOS_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Bancos exige a permissão BANCOS_CONSULTAR." />;
    }

    const updateFilter = (name: keyof BoletosListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const cancelar = async (motivo: string) => {
        if (!cancelarAlvo) return;
        await runWithToast(async () => { await cancelarMutation.mutateAsync({ id: cancelarAlvo, motivo }); setCancelarAlvo(null); }, { success: { summary: 'Boleto cancelado' }, error: { summary: 'Erro ao cancelar boleto' }, rethrow: true });
    };
    const abrirDetalhe = async (id: string) => {
        await runWithToast(async () => { const boleto = await bancosApi.obterBoleto(id); setDetalhe(boleto); }, { success: { summary: '' }, error: { summary: 'Erro ao carregar boleto' } });
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusBoletoFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <SearchInput ariaLabel="Buscar boleto" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
        </div>
    );

    return (
        <>
            <PageHeader title="Boletos" description="Emissão, cancelamento e consulta de boletos (linha digitável e histórico)." actions={headerActions} />
            <Message className="w-full mb-3" severity="warn" text="Geração de boleto indisponível: o backend atual não oferece consulta de carteiras para selecionar a carteira de cobrança." />
            <Card>
                {boletosQuery.error ? <ApiErrorPanel error={mapApiError(boletosQuery.error)} /> : null}
                <DataTableServer<BoletoResumoResponse> value={visibleRecords} totalRecords={records.length} loading={boletosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum boleto encontrado.">
                    <Column header="Documento" body={(row: BoletoResumoResponse) => row.numeroDocumento || row.nossoNumero || row.id.slice(0, 8)} />
                    {/* row.valor não existe no contrato (BoletoResponse só tem valorTitulo/valorPago) — correção de campo é da b54.c1, D5 */}
                    <Column header="Valor" body={(row: BoletoResumoResponse) => formatMoney(row.valor)} />
                    <Column header="Vencimento" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: BoletoResumoResponse) => formatDate(row.vencimento)} />
                    <Column header="Status" body={(row: BoletoResumoResponse) => <Tag value={statusBoletoLabel(Number(row.status))} severity={statusBoletoSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: BoletoResumoResponse) => (
                        <DataTableActions actions={[
                            { key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'BANCOS_CONSULTAR', onClick: () => abrirDetalhe(row.id) },
                            ...(boletoPodeCancelar(Number(row.status)) ? [{ key: 'cancelar', label: 'Cancelar', icon: 'pi pi-ban', severity: 'danger' as const, permission: 'BOLETOS_CANCELAR' as const, onClick: () => setCancelarAlvo(row.id) }] : [])
                        ]} />
                    )} />
                </DataTableServer>
                {!boletosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum boleto" description="Ajuste os filtros para consultar boletos já emitidos." /> : null}
            </Card>

            <BoletoDetalheDialog visible={Boolean(detalhe)} boleto={detalhe} historico={historicoQuery.data ?? []} historicoLoading={historicoQuery.isFetching} onHide={() => setDetalhe(null)} />
            <ReasonDialog visible={Boolean(cancelarAlvo)} title="Cancelar boleto" confirmLabel="Cancelar boleto" loading={cancelarMutation.isPending} onHide={() => setCancelarAlvo(null)} onConfirm={cancelar} />
        </>
    );
};
