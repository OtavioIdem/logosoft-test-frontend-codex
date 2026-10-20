'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
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
import { mapApiError } from '@/lib/http/apiError';
import { useBoletoDetalhe, useBoletoHistorico, useBoletoMutations, useBoletos } from '@/features/bancos/hooks/useBancosResources';
import { BoletoResponse, BoletosListQuery } from '@/features/bancos/types/bancos.types';
import { BoletoDetalheDialog } from '@/features/bancos/components/BancosOperacoesDialogs';
import { boletoPodeCancelar, statusBoletoFilterOptions, statusBoletoLabel, statusBoletoSeverity } from '@/features/bancos/components/bancosLabels';
import { formatMoney, formatMoneyOptional } from '@/lib/formatters/money';
import { useAppToast } from '@/hooks/useAppToast';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

const filterLocal = (records: BoletoResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.numeroDocumento} ${record.nossoNumero}`.toLowerCase().includes(normalized));
};

export const BoletosPage = () => {
    const { hasPermission } = usePermissions();
    const toast = useAppToast();
    const [filters, setFilters] = useState<Partial<BoletosListQuery>>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [cancelarAlvo, setCancelarAlvo] = useState<string | null>(null);
    const [cancelarErro, setCancelarErro] = useState<string | null>(null);
    const [detalheId, setDetalheId] = useState<string | null>(null);

    const boletosQuery = useBoletos(filters.empresaId ? filters as BoletosListQuery : null, hasPermission('BANCOS_CONSULTAR'));
    const detalheQuery = useBoletoDetalhe(detalheId);
    const historicoQuery = useBoletoHistorico(detalheId);
    const { cancelarMutation } = useBoletoMutations();

    const records = useMemo(() => filterLocal(boletosQuery.data ?? [], localSearch), [boletosQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('BANCOS_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Bancos exige a permissão BANCOS_CONSULTAR." />;
    }

    const updateFilter = (name: keyof BoletosListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => {
            if (name === 'empresaId') return { empresaId: typeof value === 'string' && value ? value : undefined, filialId: null, status: current.status ?? null };
            return { ...current, [name]: value === '' ? null : value };
        });
    };

    const cancelar = async (motivo: string) => {
        if (!cancelarAlvo) return;
        try {
            await cancelarMutation.mutateAsync({ id: cancelarAlvo, motivo });
            setCancelarAlvo(null);
            setCancelarErro(null);
            toast.success('Boleto cancelado.');
        } catch (error) {
            setCancelarErro(mapApiError(error).message);
        }
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
            <PageHeader title="Boletos" description="Consulta, cancelamento e histórico de boletos." actions={<div className="flex flex-column md:flex-row gap-2 md:align-items-center"><Button label="Gerar boleto" icon="pi pi-plus" disabled /><div className="flex-1">{headerActions}</div></div>} />
            <Message className="w-full mb-3" severity="warn" text="Geração indisponível: ainda não é possível selecionar uma carteira de cobrança pelo sistema." />
            <Card>
                {boletosQuery.error ? <ApiErrorPanel error={mapApiError(boletosQuery.error)} /> : null}
                {!filters.empresaId ? <EmptyState title="Selecione uma empresa" description="Selecione uma empresa para consultar boletos." action={<span />} /> : <DataTableServer<BoletoResponse> value={visibleRecords} totalRecords={records.length} loading={boletosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum boleto encontrado.">
                    <Column header="Documento / nosso número" body={(row: BoletoResponse) => <div><div>{row.numeroDocumento || 'Sem identificação operacional'}</div><small className="text-color-secondary">Nosso número: {row.nossoNumero}</small></div>} />
                    <Column header="Valor do título" body={(row: BoletoResponse) => formatMoney(row.valorTitulo)} />
                    <Column header="Valor pago" body={(row: BoletoResponse) => formatMoneyOptional(row.valorPago)} />
                    <Column header="Vencimento" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: BoletoResponse) => formatDate(row.dataVencimento)} />
                    <Column header="Status" body={(row: BoletoResponse) => <Tag value={statusBoletoLabel(Number(row.statusBoleto))} severity={statusBoletoSeverity(Number(row.statusBoleto)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: BoletoResponse) => (
                        <DataTableActions actions={[
                            { key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'BANCOS_CONSULTAR', onClick: () => setDetalheId(row.id) },
                            ...(boletoPodeCancelar(Number(row.statusBoleto)) ? [{ key: 'cancelar', label: 'Cancelar', icon: 'pi pi-ban', severity: 'danger' as const, permission: 'BOLETOS_CANCELAR' as const, onClick: () => { setCancelarErro(null); setCancelarAlvo(row.id); } }] : [])
                        ]} />
                    )} />
                </DataTableServer>}
                {Boolean(filters.empresaId) && !boletosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum boleto" description="Ajuste os filtros para consultar boletos já emitidos." /> : null}
            </Card>

            <BoletoDetalheDialog visible={Boolean(detalheId)} boleto={detalheQuery.data ?? null} loading={detalheQuery.isFetching} error={detalheQuery.error ? mapApiError(detalheQuery.error) : null} historico={historicoQuery.data ?? []} historicoLoading={historicoQuery.isFetching} historicoError={historicoQuery.error ? mapApiError(historicoQuery.error) : null} onRetryDetalhe={() => detalheQuery.refetch()} onRetryHistorico={() => historicoQuery.refetch()} onHide={() => setDetalheId(null)} />
            <ReasonDialog visible={Boolean(cancelarAlvo)} title="Cancelar boleto" confirmLabel="Cancelar boleto" maxLength={300} error={cancelarErro} loading={cancelarMutation.isPending} onHide={() => { setCancelarErro(null); setCancelarAlvo(null); }} onConfirm={cancelar} />
        </>
    );
};
