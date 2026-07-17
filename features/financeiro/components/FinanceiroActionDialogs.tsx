'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { DateTimeInput } from '@/components/forms/DateTimeInput';
import { FieldError } from '@/components/forms/FieldError';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { useCondicoesPagamentoOptions } from '@/features/financeiro/hooks/useFinanceiroResources';
import { usePedidosVenda } from '@/features/vendas/hooks/useVendasResources';
import { BaixarContaFinanceiraRequest, ContaPagarResponse, ContaReceberResponse, EstornarContaFinanceiraRequest, GerarContaReceberPedidoRequest, PagarContaRequest, ReceberContaRequest } from '@/features/financeiro/types/financeiro.types';
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
    onSubmit: (values: EstornarContaFinanceiraRequest) => void;
};

type GerarPedidoVendaDialogProps = {
    visible: boolean;
    loading?: boolean;
    onHide: () => void;
    onSubmit: (pedidoVendaId: string, values: GerarContaReceberPedidoRequest) => void;
};

type BaixaValues = {
    dataBaixa: Date;
    valor: number;
    observacao?: string | null;
};

export const BaixaFinanceiraDialog = ({ type, visible, conta, loading, onHide, onSubmit }: ReceberDialogProps) => {
    const [values, setValues] = useState<BaixaValues>({ dataBaixa: new Date(), valor: 0, observacao: '' });

    useEffect(() => {
        if (!visible) return;
        setValues({ dataBaixa: new Date(), valor: Number(conta?.saldo ?? conta?.valorTotal ?? 0), observacao: '' });
    }, [conta, visible]);

    const update = <K extends keyof BaixaValues>(key: K, value: BaixaValues[K]) => setValues((current) => ({ ...current, [key]: value }));
    const submit = () => onSubmit({ valor: values.valor, dataBaixa: values.dataBaixa, observacao: values.observacao ?? null } as BaixarContaFinanceiraRequest);

    const footer = <div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} /><Button label={type === 'receber' ? 'Receber' : 'Pagar'} icon="pi pi-check" onClick={submit} loading={loading} /></div>;

    return (
        <Dialog header={type === 'receber' ? 'Baixar conta a receber' : 'Baixar conta a pagar'} visible={visible} modal style={{ width: 'min(36rem, 96vw)' }} onHide={onHide} footer={footer}>
            <div className="grid formgrid p-fluid">
                <div className="field col-12 md:col-6"><label className="font-medium">Data da baixa</label><DateTimeInput value={values.dataBaixa} onChange={(value) => update('dataBaixa', value ?? new Date())} disabled={loading} /></div>
                <div className="field col-12 md:col-6"><label className="font-medium">Valor</label><MoneyInput value={values.valor} onChange={(value) => update('valor', value ?? 0)} disabled={loading} /></div>
                <div className="field col-12"><label className="font-medium">Observação</label><InputTextarea value={values.observacao ?? ''} onChange={(event) => update('observacao', event.target.value)} rows={3} disabled={loading} /></div>
            </div>
            <small className="text-color-secondary">A forma de pagamento, caixa e banco devem ser tratados pelo backend/financeiro operacional quando o contrato expuser esses campos.</small>
        </Dialog>
    );
};

export const EstornoFinanceiroDialog = ({ type, visible, conta, loading, onHide, onSubmit }: EstornoDialogProps) => {
    const [baixaId, setBaixaId] = useState('');
    const [dataEstorno, setDataEstorno] = useState(new Date());
    const [motivo, setMotivo] = useState('');
    const movimentos = useMemo(() => (type === 'recebimento' ? (conta as ContaReceberResponse | undefined)?.recebimentos ?? [] : (conta as ContaPagarResponse | undefined)?.pagamentos ?? []), [conta, type]);
    const options = useMemo(() => movimentos.map((movimento) => ({ label: `${type === 'recebimento' ? 'Recebimento' : 'Pagamento'} • ${formatMoney('valorRecebido' in movimento ? movimento.valorRecebido : movimento.valorPago)}`, value: movimento.id })), [movimentos, type]);

    useEffect(() => { if (visible) { setBaixaId(options[0]?.value ?? ''); setDataEstorno(new Date()); setMotivo(''); } }, [options, visible]);

    const footer = <div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} /><Button label="Estornar" icon="pi pi-undo" severity="warning" onClick={() => onSubmit({ baixaId, dataEstorno, motivo })} disabled={!baixaId || !motivo.trim()} loading={loading} /></div>;
    return <Dialog header={type === 'recebimento' ? 'Estornar recebimento' : 'Estornar pagamento'} visible={visible} modal style={{ width: 'min(36rem, 96vw)' }} onHide={onHide} footer={footer}><div className="field"><label className="font-medium">Baixa</label><Dropdown value={baixaId} options={options} optionLabel="label" optionValue="value" className="w-full" onChange={(event) => setBaixaId(event.value)} disabled={loading} /><FieldError message={options.length === 0 ? 'Nenhuma baixa disponível para estorno.' : undefined} /></div><div className="field"><label className="font-medium">Data do estorno</label><DateTimeInput value={dataEstorno} onChange={(value) => setDataEstorno(value ?? new Date())} disabled={loading} /></div><div className="field"><label className="font-medium">Motivo</label><InputTextarea value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={4} className="w-full" disabled={loading} /></div></Dialog>;
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
