'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { PermissionCode } from '@/types/erp';
import { useContaAvancado, useContasAvancado, useContasAvancadoMutations } from '@/features/financeiro-avancado/hooks/useFinanceiroAvancadoResources';
import { BaixarContaFormValues, ContaFinanceiraResumoResponse, ContasListQuery, CriarContaFormValues, EstornarBaixaFormValues, TipoConta } from '@/features/financeiro-avancado/types/financeiroAvancado.types';
import { BaixarContaDialog, CriarContaDialog, EstornarBaixaDialog } from '@/features/financeiro-avancado/components/ContaDialogs';
import { contaPodeBaixar, contaPodeCancelar, statusContaLabel, statusContaOptions, statusContaSeverity } from '@/features/financeiro-avancado/components/financeiroAvancadoLabels';

const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

export const ContasAvancadoTab = ({ tipo, baixarPermission, gerenciarPermission }: { tipo: TipoConta; baixarPermission: PermissionCode; gerenciarPermission: PermissionCode }) => {
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<Pick<ContasListQuery, 'empresaId' | 'filialId' | 'status'>>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dialog, setDialog] = useState<'criar' | 'baixar' | 'estornar' | 'cancelar' | null>(null);

    const page = Math.floor(first / rows) + 1;
    const listQuery = useMemo<ContasListQuery>(() => ({ ...filters, page, pageSize: rows }), [filters, page, rows]);
    const contasQuery = useContasAvancado(tipo, listQuery);
    const detalheQuery = useContaAvancado(selectedId);
    const conta = detalheQuery.data ?? null;
    const { criarMutation, baixarMutation, estornarMutation, cancelarMutation } = useContasAvancadoMutations();

    const paged = contasQuery.data;
    const contas = paged?.items ?? [];
    const totalRecords = paged?.totalItems ?? 0;

    const updateFilter = (name: 'empresaId' | 'filialId' | 'status', value: string | number | null) => { setFirst(0); setFilters((c) => ({ ...c, [name]: value === '' ? null : value })); };
    const close = () => setDialog(null);

    const criar = async (values: CriarContaFormValues) => {
        await runWithToast(async () => { const criada = await criarMutation.mutateAsync({ tipo, values }); close(); setSelectedId(criada.id); }, { success: { summary: 'Conta criada' }, error: { summary: 'Erro ao criar conta' }, rethrow: true });
    };
    const baixar = async (values: BaixarContaFormValues) => {
        if (!selectedId) return;
        await runWithToast(async () => { await baixarMutation.mutateAsync({ tipo, id: selectedId, values }); close(); }, { success: { summary: 'Baixa registrada', detail: 'Contabilização disparada automaticamente pelo backend.' }, error: { summary: 'Erro ao baixar' }, rethrow: true });
    };
    const estornar = async (values: EstornarBaixaFormValues) => {
        if (!selectedId) return;
        await runWithToast(async () => { await estornarMutation.mutateAsync({ tipo, id: selectedId, values }); close(); }, { success: { summary: 'Baixa estornada', detail: 'Estorno contábil automático pelo backend.' }, error: { summary: 'Erro ao estornar' }, rethrow: true });
    };
    const cancelar = async (motivo: string) => {
        if (!selectedId) return;
        await runWithToast(async () => { await cancelarMutation.mutateAsync({ tipo, id: selectedId, motivo }); close(); }, { success: { summary: 'Conta cancelada' }, error: { summary: 'Erro ao cancelar' }, rethrow: true });
    };

    const status = conta ? Number(conta.status) : 0;

    return (
        <>
            <div className="flex flex-column md:flex-row gap-2 md:align-items-center mb-3">
                <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
                <Dropdown value={filters.status ?? null} options={statusContaOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
                <PermissionGuard permission={gerenciarPermission} mode="disable">{({ disabled }) => <Button label={tipo === 'receber' ? 'Nova conta a receber' : 'Nova conta a pagar'} icon="pi pi-plus" disabled={disabled} onClick={() => setDialog('criar')} />}</PermissionGuard>
            </div>

            {contasQuery.error ? <ApiErrorPanel error={mapApiError(contasQuery.error)} /> : null}
            <DataTableServer<ContaFinanceiraResumoResponse> value={contas} totalRecords={totalRecords} loading={contasQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma conta encontrada.">
                <Column field="descricao" header="Descrição" />
                <Column header="Valor" body={(row: ContaFinanceiraResumoResponse) => formatMoney(row.valorOriginal)} />
                <Column header="Saldo" body={(row: ContaFinanceiraResumoResponse) => formatMoney(row.saldo)} />
                <Column header="Vencimento" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: ContaFinanceiraResumoResponse) => formatDate(row.dataVencimento)} />
                <Column header="Status" body={(row: ContaFinanceiraResumoResponse) => <Tag value={statusContaLabel(Number(row.status))} severity={statusContaSeverity(Number(row.status)) ?? undefined} />} />
                <Column header="Ações" alignHeader="right" body={(row: ContaFinanceiraResumoResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'FINANCEIRO_CONSULTAR', onClick: () => setSelectedId(row.id) }]} />} />
            </DataTableServer>

            {conta ? (
                <Card title={`Conta: ${conta.descricao}`} className="mt-3">
                    <div className="flex gap-2 flex-wrap mb-3 align-items-center">
                        <Tag value={statusContaLabel(status)} severity={statusContaSeverity(status) ?? undefined} />
                        <span className="text-color-secondary">Saldo {formatMoney(conta.saldo)} de {formatMoney(conta.valorOriginal)} • vence {formatDate(conta.dataVencimento)}</span>
                        <div className="flex-1" />
                        {contaPodeBaixar(status) ? <PermissionGuard permission={baixarPermission} mode="disable">{({ disabled }) => <Button label="Baixar" icon="pi pi-check" size="small" severity="success" disabled={disabled} onClick={() => setDialog('baixar')} />}</PermissionGuard> : null}
                        <PermissionGuard permission="FINANCEIRO_ESTORNAR" mode="disable">{({ disabled }) => <Button label="Estornar" icon="pi pi-undo" size="small" severity="warning" outlined disabled={disabled || conta.baixas.every((baixa) => baixa.estornada)} onClick={() => setDialog('estornar')} />}</PermissionGuard>
                        {contaPodeCancelar(status) ? <PermissionGuard permission="FINANCEIRO_CANCELAR" mode="disable">{({ disabled }) => <Button label="Cancelar" icon="pi pi-ban" size="small" severity="danger" outlined disabled={disabled} onClick={() => setDialog('cancelar')} />}</PermissionGuard> : null}
                    </div>
                    <DataTable value={conta.baixas} dataKey="id" emptyMessage="Nenhuma baixa." responsiveLayout="scroll" stripedRows size="small">
                        <Column header="Valor" body={(baixa) => formatMoney(baixa.valor)} />
                        <Column header="Data" body={(baixa) => formatDate(baixa.dataBaixa)} />
                        <Column header="Estornada" body={(baixa) => (baixa.estornada ? <Tag value="Estornada" severity="warning" /> : <Tag value="Ativa" severity="success" />)} />
                        <Column field="motivoEstorno" header="Motivo estorno" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" />
                    </DataTable>
                </Card>
            ) : null}

            <CriarContaDialog visible={dialog === 'criar'} loading={criarMutation.isPending} tipo={tipo} onHide={close} onSubmit={criar} />
            <BaixarContaDialog visible={dialog === 'baixar'} loading={baixarMutation.isPending} saldo={conta?.saldo ?? 0} onHide={close} onSubmit={baixar} />
            <EstornarBaixaDialog visible={dialog === 'estornar'} loading={estornarMutation.isPending} baixas={conta?.baixas ?? []} onHide={close} onSubmit={estornar} />
            <ReasonDialog visible={dialog === 'cancelar'} title="Cancelar conta" confirmLabel="Cancelar conta" loading={cancelarMutation.isPending} onHide={close} onConfirm={cancelar} />
        </>
    );
};
