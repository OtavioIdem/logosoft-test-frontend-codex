'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { StatusTag } from '@/components/data/StatusTag';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { LoadingState } from '@/components/feedback/LoadingState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { BaixaFinanceiraDialog, EstornoFinanceiroDialog, GerarContaReceberPedidoDialog } from '@/features/financeiro/components/FinanceiroActionDialogs';
import { ContaFinanceiraFormDialog } from '@/features/financeiro/components/ContaFinanceiraFormDialog';
import { contaStatusTagValue, countOpenFinancialRecords, formatDate, formatMoney, isContaEncerrada, origemFinanceiraLabel, statusContaOptions, sumMoneyValues } from '@/features/financeiro/components/financeiroUiUtils';
import { useContasPagar, useContasReceber, useFinanceiroMutations } from '@/features/financeiro/hooks/useFinanceiroResources';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { ContaPagarFormValues, ContaPagarResponse, ContaReceberFormValues, ContaReceberResponse, FinanceiroListQuery } from '@/features/financeiro/types/financeiro.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';

type ContasFinanceirasPageProps = { type: 'receber' | 'pagar' };
type ContaRecord = ContaReceberResponse | ContaPagarResponse;
type ActionState = 'baixar' | 'estornar' | 'cancelar' | 'gerarPedido' | null;

const isReceber = (record: ContaRecord): record is ContaReceberResponse => 'clienteId' in record;
const displayStatus = (record: ContaRecord) => Number(record.statusConta ?? record.status ?? 0) || null;

export const ContasFinanceirasPage = ({ type }: ContasFinanceirasPageProps) => {
    const { hasPermission } = usePermissions();
    const toast = useAppToast();
    const [filters, setFilters] = useState<FinanceiroListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [action, setAction] = useState<ActionState>(null);
    const [selected, setSelected] = useState<ContaRecord | null>(null);
    const receberQuery = useContasReceber(type === 'receber' ? filters : {});
    const pagarQuery = useContasPagar(type === 'pagar' ? filters : {});
    const clientesQuery = useClientes(filters);
    const fornecedoresQuery = useFornecedores(filters);
    const pessoasQuery = usePessoas({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null });
    const query = type === 'receber' ? receberQuery : pagarQuery;
    const mutations = useFinanceiroMutations();
    const records = useMemo(() => (query.data ?? []) as ContaRecord[], [query.data]);
    const summary = useMemo(() => ({
        total: sumMoneyValues(records.map((record) => record.valorTotal)),
        saldo: sumMoneyValues(records.map((record) => record.saldo)),
        abertas: countOpenFinancialRecords(records)
    }), [records]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [first, records, rows]);
    const pessoaLabelMap = useMemo(() => new Map((pessoasQuery.data ?? []).map((pessoa) => [pessoa.id, pessoa.nomeFantasia ? `${pessoa.nomeRazaoSocial} • ${pessoa.nomeFantasia}` : pessoa.nomeRazaoSocial])), [pessoasQuery.data]);
    const clienteLabelMap = useMemo(() => new Map((clientesQuery.data ?? []).map((cliente) => [cliente.id, `${cliente.codigo} • ${pessoaLabelMap.get(cliente.pessoaId) ?? 'Pessoa não carregada'}`])), [clientesQuery.data, pessoaLabelMap]);
    const fornecedorLabelMap = useMemo(() => new Map((fornecedoresQuery.data ?? []).map((fornecedor) => [fornecedor.id, `${fornecedor.codigo} • ${pessoaLabelMap.get(fornecedor.pessoaId) ?? 'Pessoa não carregada'}`])), [fornecedoresQuery.data, pessoaLabelMap]);
    const canConsult = hasPermission('FINANCEIRO_CONSULTAR');
    const canManage = hasPermission('FINANCEIRO_GERENCIAR');
    const actionPermission = type === 'receber' ? 'FINANCEIRO_RECEBER' : 'FINANCEIRO_PAGAR';
    const cancelMutation = type === 'receber' ? mutations.cancelarReceberMutation : mutations.cancelarPagarMutation;

    if (!canConsult) return <UnauthorizedState description="Contas financeiras exigem FINANCEIRO_CONSULTAR." />;

    const updateFilter = (name: keyof FinanceiroListQuery, value: string | number | null) => { setFirst(0); setFilters((current) => ({ ...current, [name]: value || null })); };
    const openAction = (state: ActionState, record?: ContaRecord) => { setSelected(record ?? null); setAction(state); };

    const createConta = (values: ContaReceberFormValues | ContaPagarFormValues) => {
        if (type === 'receber') {
            mutations.contaReceberCreateMutation.mutate({ values: values as ContaReceberFormValues }, { onSuccess: () => { toast.success('Conta a receber criada.'); setFormVisible(false); }, onError: (error) => toast.error('Erro ao criar', mapApiError(error).message) });
            return;
        }
        mutations.contaPagarCreateMutation.mutate({ values: values as ContaPagarFormValues }, { onSuccess: () => { toast.success('Conta a pagar criada.'); setFormVisible(false); }, onError: (error) => toast.error('Erro ao criar', mapApiError(error).message) });
    };

    const baixar = (values: unknown) => {
        if (!selected) return;
        if (type === 'receber') {
            mutations.receberMutation.mutate({ id: selected.id, values }, { onSuccess: () => { toast.success('Recebimento registrado.'); openAction(null); }, onError: (error) => toast.error('Erro ao receber', mapApiError(error).message) });
            return;
        }
        mutations.pagarMutation.mutate({ id: selected.id, values }, { onSuccess: () => { toast.success('Pagamento registrado.'); openAction(null); }, onError: (error) => toast.error('Erro ao pagar', mapApiError(error).message) });
    };

    const estornar = (values: unknown) => {
        if (!selected) return;
        if (type === 'receber') {
            mutations.estornarRecebimentoMutation.mutate({ id: selected.id, values }, { onSuccess: () => { toast.success('Recebimento estornado.'); openAction(null); }, onError: (error) => toast.error('Erro ao estornar', mapApiError(error).message) });
            return;
        }
        mutations.estornarPagamentoMutation.mutate({ id: selected.id, values }, { onSuccess: () => { toast.success('Pagamento estornado.'); openAction(null); }, onError: (error) => toast.error('Erro ao estornar', mapApiError(error).message) });
    };

    const cancelar = (motivo: string) => {
        if (!selected) return;
        cancelMutation.mutate({ id: selected.id, motivo }, { onSuccess: () => { toast.success('Conta cancelada.'); openAction(null); }, onError: (error) => toast.error('Erro ao cancelar', mapApiError(error).message) });
    };

    const gerarContaPedido = (pedidoVendaId: string, values: unknown) => {
        mutations.gerarContaReceberPedidoMutation.mutate({ pedidoVendaId, values }, { onSuccess: () => { toast.success('Conta gerada a partir do pedido.'); openAction(null); }, onError: (error) => toast.error('Erro ao gerar conta', mapApiError(error).message) });
    };

    const title = type === 'receber' ? 'Contas a receber' : 'Contas a pagar';
    const baixarLabel = type === 'receber' ? 'Receber' : 'Pagar';
    const displayParty = (record: ContaRecord) => {
        if (isReceber(record)) {
            return clienteLabelMap.get(record.clienteId) ?? 'Cliente não carregado';
        }

        return fornecedorLabelMap.get(record.fornecedorId) ?? 'Fornecedor não carregado';
    };

    return <><PageHeader title={title} description="Controle parcelas, saldos, baixas, estornos e cancelamentos com rastreabilidade." actions={<div className="flex flex-column lg:flex-row gap-2 lg:align-items-center financeiro-toolbar-actions"><EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} /><Dropdown className="w-full lg:w-10rem" value={filters.status ?? null} options={statusContaOptions} optionLabel="label" optionValue="value" showClear placeholder="Status" onChange={(event) => updateFilter('status', event.value ?? null)} /><PermissionGuard permission="FINANCEIRO_GERENCIAR" mode="disable">{({ disabled }) => <Button className="p-button-sm w-full lg:w-auto white-space-nowrap" label="Nova conta" icon="pi pi-plus" disabled={disabled || !canManage} onClick={() => setFormVisible(true)} />}</PermissionGuard>{type === 'receber' ? <PermissionGuard permission="FINANCEIRO_GERENCIAR" mode="disable">{({ disabled }) => <Button className="p-button-sm w-full lg:w-auto white-space-nowrap" label="Gerar por pedido" icon="pi pi-file-plus" outlined disabled={disabled} onClick={() => openAction('gerarPedido')} />}</PermissionGuard> : null}</div>} />
        <div className="grid mb-3">
            <div className="col-12 md:col-4"><Card className="h-full"><span className="text-600">Valor total listado</span><div className="text-2xl font-semibold mt-2">{formatMoney(summary.total)}</div></Card></div>
            <div className="col-12 md:col-4"><Card className="h-full"><span className="text-600">Saldo em aberto</span><div className="text-2xl font-semibold mt-2">{formatMoney(summary.saldo)}</div></Card></div>
            <div className="col-12 md:col-4"><Card className="h-full"><span className="text-600">Contas com saldo</span><div className="text-2xl font-semibold mt-2">{summary.abertas}</div></Card></div>
        </div>
        <Message className="w-full mb-3" severity="info" text="Contas quitadas, canceladas ou estornadas não permitem baixa direta. Estornos e cancelamentos exigem motivo." />
        <Card>{query.isLoading ? <LoadingState /> : null}{query.error ? <ApiErrorPanel error={mapApiError(query.error)} /> : null}<DataTableServer<ContaRecord> value={visibleRecords} totalRecords={records.length} first={first} rows={rows} loading={query.isFetching} onPage={(event) => { setFirst(event.first); setRows(event.rows); }}><Column field="documento" header="Documento" /><Column header={type === 'receber' ? 'Cliente' : 'Fornecedor'} body={(row: ContaRecord) => displayParty(row)} /><Column header="Origem" body={(row: ContaRecord) => origemFinanceiraLabel(Number(row.origem))} /><Column header="Emissão" body={(row: ContaRecord) => formatDate(row.dataEmissao)} /><Column header="Total" body={(row: ContaRecord) => formatMoney(row.valorTotal)} /><Column header="Saldo" body={(row: ContaRecord) => formatMoney(row.saldo)} /><Column header="Status" body={(row: ContaRecord) => <StatusTag status={contaStatusTagValue(displayStatus(row))} />} /><Column header="Ações" body={(row: ContaRecord) => <DataTableActions actions={[{ key: 'baixar', label: baixarLabel, icon: 'pi pi-check-circle', permission: actionPermission, disabled: isContaEncerrada(displayStatus(row)), onClick: () => openAction('baixar', row) }, { key: 'estornar', label: 'Estornar', icon: 'pi pi-undo', permission: 'FINANCEIRO_ESTORNAR', severity: 'warning', onClick: () => openAction('estornar', row) }, { key: 'cancelar', label: 'Cancelar', icon: 'pi pi-ban', permission: 'FINANCEIRO_CANCELAR', severity: 'danger', disabled: isContaEncerrada(displayStatus(row)), onClick: () => openAction('cancelar', row) }]} />} /></DataTableServer></Card>
        <ContaFinanceiraFormDialog type={type} visible={formVisible} loading={mutations.contaReceberCreateMutation.isPending || mutations.contaPagarCreateMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={createConta} />
        <BaixaFinanceiraDialog type={type} visible={action === 'baixar'} conta={selected} loading={mutations.receberMutation.isPending || mutations.pagarMutation.isPending} onHide={() => openAction(null)} onSubmit={baixar} />
        <EstornoFinanceiroDialog type={type === 'receber' ? 'recebimento' : 'pagamento'} visible={action === 'estornar'} conta={selected} loading={mutations.estornarRecebimentoMutation.isPending || mutations.estornarPagamentoMutation.isPending} onHide={() => openAction(null)} onSubmit={estornar} />
        <ReasonDialog visible={action === 'cancelar'} title={`Cancelar ${type === 'receber' ? 'conta a receber' : 'conta a pagar'}`} loading={cancelMutation.isPending} onHide={() => openAction(null)} onConfirm={cancelar} />
        <GerarContaReceberPedidoDialog visible={action === 'gerarPedido'} loading={mutations.gerarContaReceberPedidoMutation.isPending} onHide={() => openAction(null)} onSubmit={gerarContaPedido} />
    </>;
};
