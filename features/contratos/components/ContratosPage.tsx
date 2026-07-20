'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { SearchInput } from '@/components/forms/SearchInput';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useContrato, useContratos, useContratoMutations } from '@/features/contratos/hooks/useContratosResources';
import { ContratoFormValues, ContratoResponse, ContratosListQuery, GerarFaturamentoFormValues } from '@/features/contratos/types/contratos.types';
import { ContratoFormDialog, GerarFaturamentoDialog, ReajustarDialog, RenovarDialog } from '@/features/contratos/components/ContratosDialogs';
import {
    contratoPodeAprovar,
    contratoPodeCancelar,
    contratoPodeEncerrar,
    contratoPodeFaturar,
    contratoPodeReajustar,
    contratoPodeRenovar,
    isFaturamentoConsumo,
    periodicidadeLabel,
    statusContratoFilterOptions,
    statusContratoLabel,
    statusContratoSeverity,
    tipoFaturamentoLabel
} from '@/features/contratos/components/contratosLabels';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');
const formatMoney = (value?: number | null) => (value == null ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

const filterLocal = (records: ContratoResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.numero} ${record.descricao}`.toLowerCase().includes(normalized));
};

type DialogKind = 'criar' | 'faturar' | 'reajustar' | 'renovar' | 'encerrar' | 'cancelar' | null;

export const ContratosPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<ContratosListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dialog, setDialog] = useState<DialogKind>(null);
    const [ultimoFaturamento, setUltimoFaturamento] = useState<{ competencia: string; contaReceberId: string; valorTotal: number } | null>(null);

    const contratosQuery = useContratos(filters, hasPermission('CONTRATOS_CONSULTAR'));
    const detalheQuery = useContrato(selectedId);
    const detalhe = detalheQuery.data ?? null;
    const { criarMutation, aprovarMutation, reajustarMutation, renovarMutation, encerrarMutation, cancelarMutation, faturamentoMutation } = useContratoMutations();

    const records = useMemo(() => filterLocal(contratosQuery.data ?? [], localSearch), [contratosQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('CONTRATOS_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Contratos exige a permissão CONTRATOS_CONSULTAR." />;
    }

    const updateFilter = (name: keyof ContratosListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };
    const close = () => setDialog(null);

    const criar = async (values: ContratoFormValues) => {
        await runWithToast(async () => { const criado = await criarMutation.mutateAsync(values); close(); setSelectedId(criado.id); }, { success: { summary: 'Contrato criado' }, error: { summary: 'Erro ao criar contrato' }, rethrow: true });
    };
    const aprovar = () => selectedId && runWithToast(() => aprovarMutation.mutateAsync(selectedId), { success: { summary: 'Contrato aprovado' }, error: { summary: 'Erro ao aprovar contrato' } });
    const faturar = async (values: GerarFaturamentoFormValues) => {
        if (!selectedId) return;
        await runWithToast(async () => { const resultado = await faturamentoMutation.mutateAsync({ id: selectedId, values }); setUltimoFaturamento({ competencia: resultado.competencia, contaReceberId: resultado.contaReceberId, valorTotal: resultado.valorTotal }); close(); }, { success: { summary: 'Faturamento gerado', detail: 'Conta a receber criada.' }, error: { summary: 'Erro ao gerar faturamento (duplicidade por competência é bloqueada)' }, rethrow: true });
    };
    const reajustar = async (percentual: number) => {
        if (!selectedId) return;
        await runWithToast(async () => { await reajustarMutation.mutateAsync({ id: selectedId, percentual }); close(); }, { success: { summary: 'Contrato reajustado' }, error: { summary: 'Erro ao reajustar' }, rethrow: true });
    };
    const renovar = async (novaDataFim: Date) => {
        if (!selectedId) return;
        await runWithToast(async () => { await renovarMutation.mutateAsync({ id: selectedId, novaDataFim }); close(); }, { success: { summary: 'Contrato renovado' }, error: { summary: 'Erro ao renovar' }, rethrow: true });
    };
    const encerrar = async (motivo: string) => {
        if (!selectedId) return;
        await runWithToast(async () => { await encerrarMutation.mutateAsync({ id: selectedId, motivo }); close(); }, { success: { summary: 'Contrato encerrado' }, error: { summary: 'Erro ao encerrar' }, rethrow: true });
    };
    const cancelar = async (motivo: string) => {
        if (!selectedId) return;
        await runWithToast(async () => { await cancelarMutation.mutateAsync({ id: selectedId, motivo }); close(); }, { success: { summary: 'Contrato cancelado' }, error: { summary: 'Erro ao cancelar' }, rethrow: true });
    };

    const status = detalhe ? Number(detalhe.status) : 0;
    const consumo = detalhe ? isFaturamentoConsumo(Number(detalhe.tipoFaturamento)) : false;

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusContratoFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <SearchInput ariaLabel="Buscar contrato" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="CONTRATOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo contrato" icon="pi pi-plus" disabled={disabled} onClick={() => setDialog('criar')} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Contratos" description="Contratos com faturamento recorrente ou por consumo; gere a fatura por competência." actions={headerActions} />
            <Card>
                {contratosQuery.error ? <ApiErrorPanel error={mapApiError(contratosQuery.error)} /> : null}
                <DataTableServer<ContratoResponse> value={visibleRecords} totalRecords={records.length} loading={contratosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum contrato encontrado.">
                    <Column field="numero" header="Número" />
                    <Column field="descricao" header="Descrição" />
                    <Column header="Faturamento" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: ContratoResponse) => tipoFaturamentoLabel(Number(row.tipoFaturamento))} />
                    <Column header="Periodicidade" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: ContratoResponse) => periodicidadeLabel(Number(row.periodicidade))} />
                    <Column header="Status" body={(row: ContratoResponse) => <Tag value={statusContratoLabel(Number(row.status))} severity={statusContratoSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: ContratoResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'CONTRATOS_CONSULTAR', onClick: () => { setSelectedId(row.id); setUltimoFaturamento(null); } }]} />} />
                </DataTableServer>
                {!contratosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum contrato" description="Crie um contrato ou ajuste os filtros." /> : null}
            </Card>

            {detalhe ? (
                <Card title={`Contrato ${detalhe.numero}`} className="mt-3">
                    <div className="flex gap-2 flex-wrap mb-3 align-items-center">
                        <Tag value={statusContratoLabel(status)} severity={statusContratoSeverity(status) ?? undefined} />
                        <span className="text-color-secondary">{tipoFaturamentoLabel(Number(detalhe.tipoFaturamento))} · {periodicidadeLabel(Number(detalhe.periodicidade))} · venc. dia {detalhe.diaVencimento}</span>
                        <div className="flex-1" />
                        {contratoPodeAprovar(status) ? <PermissionGuard permission="CONTRATOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Aprovar" icon="pi pi-check" size="small" severity="success" disabled={disabled} loading={aprovarMutation.isPending} onClick={aprovar} />}</PermissionGuard> : null}
                        {contratoPodeFaturar(status) ? <PermissionGuard permission="CONTRATOS_FATURAR" mode="disable">{({ disabled }) => <Button label="Gerar faturamento" icon="pi pi-dollar" size="small" disabled={disabled} onClick={() => setDialog('faturar')} />}</PermissionGuard> : null}
                        {contratoPodeReajustar(status) ? <PermissionGuard permission="CONTRATOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Reajustar" icon="pi pi-percentage" size="small" severity="secondary" disabled={disabled} onClick={() => setDialog('reajustar')} />}</PermissionGuard> : null}
                        {contratoPodeRenovar(status) ? <PermissionGuard permission="CONTRATOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Renovar" icon="pi pi-refresh" size="small" severity="secondary" disabled={disabled} onClick={() => setDialog('renovar')} />}</PermissionGuard> : null}
                        {contratoPodeEncerrar(status) ? <PermissionGuard permission="CONTRATOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Encerrar" icon="pi pi-flag" size="small" severity="warning" disabled={disabled} onClick={() => setDialog('encerrar')} />}</PermissionGuard> : null}
                        {contratoPodeCancelar(status) ? <PermissionGuard permission="CONTRATOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Cancelar" icon="pi pi-ban" size="small" severity="danger" outlined disabled={disabled} onClick={() => setDialog('cancelar')} />}</PermissionGuard> : null}
                    </div>

                    {ultimoFaturamento ? <Message className="w-full mb-3" severity="success" text={`Faturamento ${ultimoFaturamento.competencia} gerado — conta a receber ${ultimoFaturamento.contaReceberId} (${formatMoney(ultimoFaturamento.valorTotal)}).`} /> : null}

                    <div className="grid">
                        <div className="col-12"><span className="block text-color-secondary text-sm">Descrição</span>{detalhe.descricao}</div>
                        <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Início</span>{formatDate(detalhe.dataInicio)}</div>
                        <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Fim</span>{formatDate(detalhe.dataFim)}</div>
                        {consumo ? (
                            <>
                                <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Franquia</span>{formatMoney(detalhe.franquia)}</div>
                                <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Valor excedente</span>{formatMoney(detalhe.valorExcedente)}</div>
                            </>
                        ) : (
                            <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Valor fixo</span><strong>{formatMoney(detalhe.valorFixo)}</strong></div>
                        )}
                    </div>
                </Card>
            ) : null}

            <ContratoFormDialog visible={dialog === 'criar'} loading={criarMutation.isPending} onHide={close} onSubmit={criar} />
            <GerarFaturamentoDialog visible={dialog === 'faturar'} loading={faturamentoMutation.isPending} consumo={consumo} onHide={close} onSubmit={faturar} />
            <ReajustarDialog visible={dialog === 'reajustar'} loading={reajustarMutation.isPending} onHide={close} onSubmit={reajustar} />
            <RenovarDialog visible={dialog === 'renovar'} loading={renovarMutation.isPending} onHide={close} onSubmit={renovar} />
            <ReasonDialog visible={dialog === 'encerrar'} title="Encerrar contrato" confirmLabel="Encerrar" loading={encerrarMutation.isPending} onHide={close} onConfirm={encerrar} />
            <ReasonDialog visible={dialog === 'cancelar'} title="Cancelar contrato" confirmLabel="Cancelar contrato" loading={cancelarMutation.isPending} onHide={close} onConfirm={cancelar} />
        </>
    );
};
