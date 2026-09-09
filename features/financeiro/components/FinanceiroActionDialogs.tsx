'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { DateTimeInput } from '@/components/forms/DateTimeInput';
import { FieldError } from '@/components/forms/FieldError';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { useCondicoesPagamentoOptions, useContaPagarDetalhe, useContaReceberDetalhe, useFormasPagamentoOptions } from '@/features/financeiro/hooks/useFinanceiroResources';
import { usePedidosVenda } from '@/features/vendas/hooks/useVendasResources';
import { ContaPagarResponse, ContaReceberResponse, EstornarPagamentoRequest, EstornarRecebimentoRequest, GerarContaReceberPedidoRequest, PagarContaRequest, ReceberContaRequest } from '@/features/financeiro/types/financeiro.types';
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
    onSubmit: (values: EstornarRecebimentoRequest | EstornarPagamentoRequest) => void;
};

type GerarPedidoVendaDialogProps = {
    visible: boolean;
    loading?: boolean;
    onHide: () => void;
    onSubmit: (pedidoVendaId: string, values: GerarContaReceberPedidoRequest) => void;
};

export const BaixaFinanceiraDialog = ({ type, visible, conta, loading, onHide, onSubmit }: ReceberDialogProps) => {
    const [parcelaId, setParcelaId] = useState('');
    const [formaPagamentoId, setFormaPagamentoId] = useState('');
    const [data, setData] = useState(new Date());
    const [valor, setValor] = useState<number | null>(null);
    const [valorJuros, setValorJuros] = useState(0);
    const [valorMulta, setValorMulta] = useState(0);
    const [valorDesconto, setValorDesconto] = useState(0);
    const [gerarMovimentoCaixa, setGerarMovimentoCaixa] = useState(false);
    const [gerarMovimentoBancario, setGerarMovimentoBancario] = useState(false);
    const [observacao, setObservacao] = useState('');
    const contaId = conta?.id ?? null;
    const receberDetalhe = useContaReceberDetalhe(contaId, visible && type === 'receber');
    const pagarDetalhe = useContaPagarDetalhe(contaId, visible && type === 'pagar');
    const detalhe = type === 'receber' ? receberDetalhe : pagarDetalhe;
    const detalheCarregando = detalhe.isLoading;
    const detalheIndisponivel = detalhe.isError;
    const parcelas = detalhe.data?.parcelas ?? [];
    const semParcela = !detalheCarregando && !detalheIndisponivel && parcelas.length === 0;
    const formasQuery = useFormasPagamentoOptions(conta?.empresaId, type === 'receber' ? 'recebimento' : 'pagamento');

    useEffect(() => {
        if (!visible) return;
        const parcela = parcelas[0];
        setParcelaId(parcela?.id ?? '');
        setFormaPagamentoId('');
        setData(new Date());
        setValor(parcela ? Number(parcela.valorSaldo) : null);
        setValorJuros(0); setValorMulta(0); setValorDesconto(0);
        setGerarMovimentoCaixa(false); setGerarMovimentoBancario(false); setObservacao('');
    }, [conta, visible, parcelas]);

    const valorInvalido = valor !== null && !(Number(valor) > 0);
    const valorPreenchido = valor !== null && Number(valor) > 0;
    const submit = () => {
        if (!valorPreenchido) return;
        onSubmit(type === 'receber' ? { parcelaId, formaPagamentoId, dataRecebimento: data, valorRecebido: valor as number, valorJuros, valorMulta, valorDesconto, gerarMovimentoCaixa, gerarMovimentoBancario, observacao } : { parcelaId, formaPagamentoId, dataPagamento: data, valorPago: valor as number, valorJuros, valorMulta, valorDesconto, gerarMovimentoCaixa, gerarMovimentoBancario, observacao });
    };

    const confirmDisabled = !parcelaId || !formaPagamentoId || parcelas.length === 0 || detalheCarregando || detalheIndisponivel || !valorPreenchido;
    const footer = <div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} /><Button label={type === 'receber' ? 'Receber' : 'Pagar'} icon="pi pi-check" onClick={submit} loading={loading} disabled={confirmDisabled} /></div>;

    return (
        <Dialog header={type === 'receber' ? 'Baixar conta a receber' : 'Baixar conta a pagar'} visible={visible} modal style={{ width: 'min(36rem, 96vw)' }} onHide={onHide} footer={footer}>
            {detalheIndisponivel ? <Message className="w-full mb-3" severity="error" text="Não foi possível carregar as parcelas desta conta." /> : null}
            <div className="grid formgrid p-fluid">
                <div className="field col-12"><label className="font-medium">Parcela *</label><Dropdown value={parcelaId} options={parcelas.map((parcela) => ({ label: `Parcela ${parcela.numero} — ${formatMoney(parcela.valorSaldo)}`, value: parcela.id }))} optionLabel="label" optionValue="value" className="w-full" onChange={(event) => { setParcelaId(event.value); const parcela = parcelas.find((item) => item.id === event.value); setValor(parcela ? Number(parcela.valorSaldo) : null); }} disabled={loading || detalheCarregando || detalheIndisponivel || parcelas.length === 0} emptyMessage="Nenhuma parcela retornada pelo backend." /></div>
                <div className="field col-12"><label className="font-medium">Forma de pagamento *</label><Dropdown value={formaPagamentoId} options={formasQuery.options} optionLabel="label" optionValue="value" className="w-full" onChange={(event) => setFormaPagamentoId(event.value)} disabled={loading || formasQuery.isFetching || !conta?.empresaId} emptyMessage="Nenhuma forma de pagamento disponível." /></div>
                <div className="field col-12 md:col-6"><label className="font-medium">Data</label><DateTimeInput value={data} onChange={(value) => setData(value ?? new Date())} disabled={loading} /></div>
                <div className="field col-12 md:col-6">
                    <label className="font-medium">Valor</label>
                    <MoneyInput value={valor} onChange={(value) => setValor(value)} disabled={loading || detalheCarregando} />
                    <FieldError message={valorInvalido ? 'Informe um valor maior que zero.' : undefined} />
                    {parcelaId && !detalheCarregando ? <small className="block text-color-secondary mt-1">Saldo da parcela: {formatMoney(parcelas.find((item) => item.id === parcelaId)?.valorSaldo)}</small> : null}
                </div>
                <div className="field col-12 md:col-4"><label className="font-medium">Juros</label><MoneyInput value={valorJuros} onChange={(value) => setValorJuros(value ?? 0)} disabled={loading} /></div><div className="field col-12 md:col-4"><label className="font-medium">Multa</label><MoneyInput value={valorMulta} onChange={(value) => setValorMulta(value ?? 0)} disabled={loading} /></div><div className="field col-12 md:col-4"><label className="font-medium">Desconto</label><MoneyInput value={valorDesconto} onChange={(value) => setValorDesconto(value ?? 0)} disabled={loading} /></div>
                <div className="field-checkbox col-12 md:col-6"><Checkbox inputId="gerarMovimentoCaixa" checked={gerarMovimentoCaixa} onChange={(event) => setGerarMovimentoCaixa(Boolean(event.checked))} disabled={loading} /><label htmlFor="gerarMovimentoCaixa">Gerar movimento de caixa</label></div><div className="field-checkbox col-12 md:col-6"><Checkbox inputId="gerarMovimentoBancario" checked={gerarMovimentoBancario} onChange={(event) => setGerarMovimentoBancario(Boolean(event.checked))} disabled={loading} /><label htmlFor="gerarMovimentoBancario">Gerar movimento bancário</label></div>
                <div className="field col-12"><label className="font-medium">Observação</label><InputTextarea value={observacao} onChange={(event) => setObservacao(event.target.value)} rows={3} disabled={loading} /></div>
                {semParcela ? <small className="col-12 text-color-secondary">A baixa está indisponível porque a listagem não retornou uma parcela selecionável.</small> : null}
            </div>
            <small className="text-color-secondary">A forma de pagamento, caixa e banco devem ser tratados pelo backend/financeiro operacional quando o contrato expuser esses campos.</small>
        </Dialog>
    );
};

export const EstornoFinanceiroDialog = ({ type, visible, conta, loading, onHide, onSubmit }: EstornoDialogProps) => {
    const [baixaId, setBaixaId] = useState('');
    const [motivo, setMotivo] = useState('');
    const movimentos = useMemo(() => (type === 'recebimento' ? (conta as ContaReceberResponse | undefined)?.recebimentos ?? [] : (conta as ContaPagarResponse | undefined)?.pagamentos ?? []), [conta, type]);
    const options = useMemo(() => movimentos.map((movimento) => ({ label: `${type === 'recebimento' ? 'Recebimento' : 'Pagamento'} • ${formatMoney('valorRecebido' in movimento ? movimento.valorRecebido : movimento.valorPago)}`, value: movimento.id })), [movimentos, type]);

    useEffect(() => { if (visible) { setBaixaId(options[0]?.value ?? ''); setMotivo(''); } }, [options, visible]);

    const footer = <div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} /><Button label="Estornar" icon="pi pi-undo" severity="warning" onClick={() => onSubmit(type === 'recebimento' ? { recebimentoId: baixaId, motivo } : { pagamentoId: baixaId, motivo })} disabled={!baixaId || !motivo.trim()} loading={loading} /></div>;
    return <Dialog header={type === 'recebimento' ? 'Estornar recebimento' : 'Estornar pagamento'} visible={visible} modal style={{ width: 'min(36rem, 96vw)' }} onHide={onHide} footer={footer}><div className="field"><label className="font-medium">Baixa</label><Dropdown value={baixaId} options={options} optionLabel="label" optionValue="value" className="w-full" onChange={(event) => setBaixaId(event.value)} disabled={loading} /><FieldError message={options.length === 0 ? 'Nenhuma baixa disponível para estorno.' : undefined} /></div><div className="field"><label className="font-medium">Motivo</label><InputTextarea value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={4} className="w-full" disabled={loading} /></div></Dialog>;
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

    return <Dialog header="Gerar conta a receber por pedido de venda" visible={visible} modal style={{ width: 'min(46rem, 96vw)' }} onHide={onHide} footer={footer}>
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
