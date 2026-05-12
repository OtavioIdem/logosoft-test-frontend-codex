'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { DateTimeInput } from '@/components/forms/DateTimeInput';
import { FieldError } from '@/components/forms/FieldError';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { useFormasPagamentoOptions, useCondicoesPagamentoOptions } from '@/features/financeiro/hooks/useFinanceiroResources';
import { usePedidosVenda } from '@/features/vendas/hooks/useVendasResources';
import { ContaPagarResponse, ContaReceberResponse, GerarContaReceberPedidoRequest, PagarContaRequest, ReceberContaRequest } from '@/features/financeiro/types/financeiro.types';
import { formatMoney } from '@/features/financeiro/components/financeiroUiUtils';
import { SelectOption } from '@/types/erp';

type ReceberDialogProps = {
    type: 'receber' | 'pagar';
    visible: boolean;
    conta?: ContaReceberResponse | ContaPagarResponse | null;
    loading?: boolean;
    onHide: () => void;
    onSubmit: (values: ReceberContaRequest | PagarContaRequest) => void;
};

type EstornoDialogProps = {
    type: 'recebimento' | 'pagamento';
    visible: boolean;
    conta?: ContaReceberResponse | ContaPagarResponse | null;
    loading?: boolean;
    onHide: () => void;
    onSubmit: (values: { recebimentoId?: string; pagamentoId?: string; motivo: string }) => void;
};

type GerarPedidoVendaDialogProps = {
    visible: boolean;
    loading?: boolean;
    onHide: () => void;
    onSubmit: (pedidoVendaId: string, values: GerarContaReceberPedidoRequest) => void;
};

type PaymentValues = {
    parcelaId: string;
    formaPagamentoId: string;
    data: Date;
    valor: number;
    valorJuros: number;
    valorMulta: number;
    valorDesconto: number;
    gerarMovimentoCaixa: boolean;
    gerarMovimentoBancario: boolean;
    contaBancariaReferencia?: string | null;
    observacao?: string | null;
};

export const BaixaFinanceiraDialog = ({ type, visible, conta, loading, onHide, onSubmit }: ReceberDialogProps) => {
    const [values, setValues] = useState<PaymentValues>({ parcelaId: '', formaPagamentoId: '', data: new Date(), valor: 0, valorJuros: 0, valorMulta: 0, valorDesconto: 0, gerarMovimentoCaixa: true, gerarMovimentoBancario: false, contaBancariaReferencia: null, observacao: '' });
    const formasQuery = useFormasPagamentoOptions(conta?.empresaId ?? null, type === 'receber' ? 'recebimento' : 'pagamento');
    const parcelas = useMemo(() => (type === 'receber' ? (conta as ContaReceberResponse | undefined)?.parcelas ?? [] : (conta as ContaPagarResponse | undefined)?.parcelas ?? []), [conta, type]);
    const parcelaOptions = useMemo<SelectOption<string>[]>(() => parcelas.map((parcela) => ({ label: `Parcela ${parcela.numero} • ${formatMoney(parcela.saldo ?? parcela.valor)}`, value: parcela.id })), [parcelas]);

    useEffect(() => {
        if (!visible) return;
        const primeiraParcela = parcelas[0];
        setValues({ parcelaId: primeiraParcela?.id ?? '', formaPagamentoId: '', data: new Date(), valor: Number(primeiraParcela?.saldo ?? primeiraParcela?.valor ?? 0), valorJuros: 0, valorMulta: 0, valorDesconto: 0, gerarMovimentoCaixa: true, gerarMovimentoBancario: false, contaBancariaReferencia: null, observacao: '' });
    }, [parcelas, visible]);

    const update = <K extends keyof PaymentValues>(key: K, value: PaymentValues[K]) => setValues((current) => ({ ...current, [key]: value }));
    const submit = () => {
        if (type === 'receber') {
            onSubmit({ parcelaId: values.parcelaId, formaPagamentoId: values.formaPagamentoId, dataRecebimento: values.data, valorRecebido: values.valor, valorJuros: values.valorJuros, valorMulta: values.valorMulta, valorDesconto: values.valorDesconto, gerarMovimentoCaixa: values.gerarMovimentoCaixa, gerarMovimentoBancario: values.gerarMovimentoBancario, contaBancariaReferencia: values.contaBancariaReferencia ?? null, observacao: values.observacao ?? null });
            return;
        }
        onSubmit({ parcelaId: values.parcelaId, formaPagamentoId: values.formaPagamentoId, dataPagamento: values.data, valorPago: values.valor, valorJuros: values.valorJuros, valorMulta: values.valorMulta, valorDesconto: values.valorDesconto, gerarMovimentoCaixa: values.gerarMovimentoCaixa, gerarMovimentoBancario: values.gerarMovimentoBancario, contaBancariaReferencia: values.contaBancariaReferencia ?? null, observacao: values.observacao ?? null });
    };

    const footer = <div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} /><Button label={type === 'receber' ? 'Receber' : 'Pagar'} icon="pi pi-check" onClick={submit} loading={loading} /></div>;

    return (
        <Dialog header={type === 'receber' ? 'Receber conta' : 'Pagar conta'} visible={visible} modal style={{ width: '46rem' }} onHide={onHide} footer={footer}>
            <div className="grid formgrid p-fluid">
                <div className="field col-12 md:col-6"><label className="font-medium">Parcela</label><EntitySelect value={values.parcelaId} options={parcelaOptions} onChange={(value) => update('parcelaId', value ?? '')} entityName="parcela" disabled={loading} /></div>
                <div className="field col-12 md:col-6"><label className="font-medium">Forma de pagamento</label><EntitySelect value={values.formaPagamentoId} options={formasQuery.options} onChange={(value) => update('formaPagamentoId', value ?? '')} entityName="forma de pagamento" disabled={loading || formasQuery.isLoading} /></div>
                <div className="field col-12 md:col-4"><label className="font-medium">Data</label><DateTimeInput value={values.data} onChange={(value) => update('data', value ?? new Date())} disabled={loading} /></div>
                <div className="field col-12 md:col-4"><label className="font-medium">Valor</label><MoneyInput value={values.valor} onChange={(value) => update('valor', value ?? 0)} disabled={loading} /></div>
                <div className="field col-12 md:col-4"><label className="font-medium">Desconto</label><MoneyInput value={values.valorDesconto} onChange={(value) => update('valorDesconto', value ?? 0)} disabled={loading} /></div>
                <div className="field col-12 md:col-4"><label className="font-medium">Juros</label><MoneyInput value={values.valorJuros} onChange={(value) => update('valorJuros', value ?? 0)} disabled={loading} /></div>
                <div className="field col-12 md:col-4"><label className="font-medium">Multa</label><MoneyInput value={values.valorMulta} onChange={(value) => update('valorMulta', value ?? 0)} disabled={loading} /></div>
                <div className="field col-12 md:col-4"><label className="font-medium">Conta bancária ref.</label><InputText value={values.contaBancariaReferencia ?? ''} onChange={(event) => update('contaBancariaReferencia', event.target.value || null)} disabled={loading} /></div>
                <div className="field-checkbox col-12 md:col-6"><Checkbox inputId="caixa" checked={values.gerarMovimentoCaixa} onChange={(event) => update('gerarMovimentoCaixa', Boolean(event.checked))} disabled={loading} /><label htmlFor="caixa">Gerar movimento de caixa</label></div>
                <div className="field-checkbox col-12 md:col-6"><Checkbox inputId="banco" checked={values.gerarMovimentoBancario} onChange={(event) => update('gerarMovimentoBancario', Boolean(event.checked))} disabled={loading} /><label htmlFor="banco">Gerar movimento bancário</label></div>
                <div className="field col-12"><label className="font-medium">Observação</label><InputTextarea value={values.observacao ?? ''} onChange={(event) => update('observacao', event.target.value)} rows={2} disabled={loading} /></div>
            </div>
        </Dialog>
    );
};

export const EstornoFinanceiroDialog = ({ type, visible, conta, loading, onHide, onSubmit }: EstornoDialogProps) => {
    const [movimentoId, setMovimentoId] = useState('');
    const [motivo, setMotivo] = useState('');
    const movimentos = useMemo(() => (type === 'recebimento' ? (conta as ContaReceberResponse | undefined)?.recebimentos ?? [] : (conta as ContaPagarResponse | undefined)?.pagamentos ?? []), [conta, type]);
    const options = useMemo(() => movimentos.map((movimento) => ({ label: `${type === 'recebimento' ? 'Recebimento' : 'Pagamento'} • ${formatMoney('valorRecebido' in movimento ? movimento.valorRecebido : movimento.valorPago)}`, value: movimento.id })), [movimentos, type]);

    useEffect(() => { if (visible) { setMovimentoId(options[0]?.value ?? ''); setMotivo(''); } }, [options, visible]);

    const footer = <div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} /><Button label="Estornar" icon="pi pi-undo" severity="warning" onClick={() => onSubmit(type === 'recebimento' ? { recebimentoId: movimentoId, motivo } : { pagamentoId: movimentoId, motivo })} disabled={!movimentoId || !motivo.trim()} loading={loading} /></div>;
    return <Dialog header={type === 'recebimento' ? 'Estornar recebimento' : 'Estornar pagamento'} visible={visible} modal style={{ width: '36rem' }} onHide={onHide} footer={footer}><div className="field"><label className="font-medium">Movimento</label><Dropdown value={movimentoId} options={options} optionLabel="label" optionValue="value" className="w-full" onChange={(event) => setMovimentoId(event.value)} disabled={loading} /><FieldError message={options.length === 0 ? 'Nenhum movimento disponível para estorno.' : undefined} /></div><div className="field"><label className="font-medium">Motivo</label><InputTextarea value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={4} className="w-full" disabled={loading} /></div></Dialog>;
};

export const GerarContaReceberPedidoDialog = ({ visible, loading, onHide, onSubmit }: GerarPedidoVendaDialogProps) => {
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [filialId, setFilialId] = useState<string | null>(null);
    const [pedidoVendaId, setPedidoVendaId] = useState('');
    const [values, setValues] = useState<GerarContaReceberPedidoRequest>({ condicaoPagamentoId: null, primeiraDataVencimento: new Date(), documento: '', observacao: '' });
    const condicoesQuery = useCondicoesPagamentoOptions();
    const pedidosQuery = usePedidosVenda({ empresaId, filialId });
    const pedidoOptions = useMemo<SelectOption<string>[]>(() => (pedidosQuery.data ?? []).map((pedido) => ({ label: `${pedido.numero ?? 'Pedido sem número'} • ${formatMoney(pedido.valorTotal)}`, value: pedido.id })), [pedidosQuery.data]);

    useEffect(() => {
        if (visible) {
            setEmpresaId(null);
            setFilialId(null);
            setPedidoVendaId('');
            setValues({ condicaoPagamentoId: null, primeiraDataVencimento: new Date(), documento: '', observacao: '' });
        }
    }, [visible]);

    const footer = <div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} /><Button label="Gerar" icon="pi pi-file-plus" onClick={() => onSubmit(pedidoVendaId, values)} disabled={!pedidoVendaId || !values.documento} loading={loading} /></div>;

    return <Dialog header="Gerar conta a receber por pedido de venda" visible={visible} modal style={{ width: '46rem' }} onHide={onHide} footer={footer}>
        <div className="grid formgrid p-fluid">
            <EmpresaFilialFields empresaId={empresaId} filialId={filialId} onEmpresaChange={(value) => { setEmpresaId(value); setFilialId(null); setPedidoVendaId(''); }} onFilialChange={(value) => { setFilialId(value); setPedidoVendaId(''); }} disabled={loading} />
            <div className="field col-12"><label className="font-medium">Pedido de venda</label><EntitySelect value={pedidoVendaId || null} options={pedidoOptions} onChange={(value) => setPedidoVendaId(value ?? '')} entityName="pedido faturado" disabled={loading || !empresaId || pedidosQuery.isLoading} /><small className="text-600">Selecione pelo número do pedido; o vínculo correto será enviado automaticamente.</small></div>
            <div className="field col-12 md:col-6"><label className="font-medium">Documento</label><InputText value={values.documento} onChange={(event) => setValues((current) => ({ ...current, documento: event.target.value }))} disabled={loading} /></div>
            <div className="field col-12 md:col-6"><label className="font-medium">Primeiro vencimento</label><DateTimeInput value={values.primeiraDataVencimento instanceof Date ? values.primeiraDataVencimento : new Date(values.primeiraDataVencimento)} onChange={(value) => setValues((current) => ({ ...current, primeiraDataVencimento: value ?? new Date() }))} disabled={loading} /></div>
            <div className="field col-12"><label className="font-medium">Condição de pagamento</label><EntitySelect value={values.condicaoPagamentoId ?? null} options={condicoesQuery.options} onChange={(value) => setValues((current) => ({ ...current, condicaoPagamentoId: value }))} entityName="condição" disabled={loading || condicoesQuery.isLoading} /></div>
            <div className="field col-12"><label className="font-medium">Observação</label><InputTextarea value={values.observacao ?? ''} onChange={(event) => setValues((current) => ({ ...current, observacao: event.target.value }))} rows={2} disabled={loading} /></div>
        </div>
    </Dialog>;
};
