'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { InputTextarea } from 'primereact/inputtextarea';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { DateInput } from '@/components/forms/DateInput';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { aprovarPedidoCompraSchema, receberPedidoCompraSchema } from '@/features/compras/schemas/comprasSchemas';
import { AprovarPedidoCompraRequest, ItemPedidoCompraResponse, PedidoCompraResponse, ReceberPedidoCompraFormValues, ReceberPedidoCompraRequest } from '@/features/compras/types/compras.types';
import { calculateRecebimentoTotals, dateFromIso, FieldErrors, fieldErrorMap, formatMoney, localOptions, textValue } from '@/features/compras/components/comprasUiUtils';
import { SelectOption } from '@/types/erp';

export const AprovarPedidoCompraDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: AprovarPedidoCompraRequest) => Promise<void> }) => {
    const [values, setValues] = useState<AprovarPedidoCompraRequest>({ observacao: null });
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => { if (visible) { setValues({ observacao: null }); setErrors({}); } }, [visible]);

    const submit = async () => {
        const parsed = aprovarPedidoCompraSchema.safeParse(values);
        if (!parsed.success) { setErrors(fieldErrorMap(parsed.error)); return; }
        await onSubmit(parsed.data);
    };

    return (
        <Dialog header="Aprovar pedido de compra" visible={visible} modal style={{ width: 'min(34rem, 94vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Aprovar" icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <FormGrid>
                <div className="field col-12"><label htmlFor="observacaoAprovacaoCompra" className="font-medium">Observação</label><InputTextarea id="observacaoAprovacaoCompra" rows={3} autoResize value={textValue(values.observacao)} onChange={(event) => setValues((current) => ({ ...current, observacao: event.target.value }))} /><FieldError message={errors.observacao} /></div>
            </FormGrid>
        </Dialog>
    );
};

const buildReceberInitialValues = (pedido: PedidoCompraResponse | null, produtoLabelMap: Map<string, string>): ReceberPedidoCompraFormValues => ({
    documento: '',
    dataRecebimento: new Date(),
    permiteReceberAcimaDoPedido: false,
    gerarContaPagar: true,
    primeiroVencimento: null,
    observacao: null,
    itens: (pedido?.itens ?? []).map((item) => ({
        itemPedidoCompraId: item.id,
        produtoLabel: produtoLabelMap.get(item.produtoId) ?? 'Produto não carregado',
        selecionado: true,
        quantidade: item.quantidade,
        quantidadePedido: item.quantidade,
        localEstoqueId: item.localEstoqueId ?? '',
        valorUnitario: item.valorUnitario
    }))
});

export const ReceberPedidoCompraDialog = ({
    visible,
    pedido,
    produtoLabelMap,
    loading,
    onHide,
    onSubmit
}: {
    visible: boolean;
    pedido: PedidoCompraResponse | null;
    produtoLabelMap: Map<string, string>;
    loading?: boolean;
    onHide: () => void;
    onSubmit: (values: ReceberPedidoCompraRequest) => Promise<void>;
}) => {
    const [values, setValues] = useState<ReceberPedidoCompraFormValues>(() => buildReceberInitialValues(pedido, produtoLabelMap));
    const [errors, setErrors] = useState<FieldErrors>({});
    const locaisQuery = useLocaisEstoque({ empresaId: pedido?.empresaId ?? null, filialId: pedido?.filialId ?? null });
    const localSelectOptions = useMemo<SelectOption<string>[]>(() => localOptions(locaisQuery.data ?? []), [locaisQuery.data]);
    const recebimentoTotals = useMemo(() => calculateRecebimentoTotals(values.itens), [values.itens]);
    const hasSelectedItems = recebimentoTotals.selectedCount > 0;
    const canSubmit = Boolean(values.documento.trim()) && hasSelectedItems && !loading;

    useEffect(() => {
        if (visible) {
            setValues(buildReceberInitialValues(pedido, produtoLabelMap));
            setErrors({});
        }
    }, [pedido, produtoLabelMap, visible]);

    const update = (name: keyof ReceberPedidoCompraFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const updateItem = (index: number, name: keyof ReceberPedidoCompraFormValues['itens'][number], value: unknown) => {
        setValues((current) => ({
            ...current,
            itens: current.itens.map((item, currentIndex) => (currentIndex === index ? { ...item, [name]: value } : item))
        }));
    };

    const submit = async () => {
        const payload = {
            ...values,
            itens: values.itens
                .filter((item) => item.selecionado)
                .map((item) => ({ itemPedidoCompraId: item.itemPedidoCompraId, quantidade: item.quantidade, localEstoqueId: item.localEstoqueId, valorUnitario: item.valorUnitario }))
        };
        const parsed = receberPedidoCompraSchema.safeParse(payload);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit(parsed.data);
    };

    return (
        <Dialog header="Receber pedido de compra" visible={visible} modal style={{ width: 'min(72rem, 96vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Receber" icon="pi pi-check" loading={loading} disabled={!canSubmit} onClick={submit} /></div>}>
            <FormGrid>
                <div className="field col-12 md:col-4"><label htmlFor="documentoRecebimento" className="font-medium">Documento *</label><InputText id="documentoRecebimento" value={values.documento} onChange={(event) => update('documento', event.target.value)} /><FieldError message={errors.documento} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="dataRecebimento" className="font-medium">Data de recebimento *</label><DateInput id="dataRecebimento" value={dateFromIso(values.dataRecebimento)} onChange={(value) => update('dataRecebimento', value)} /><FieldError message={errors.dataRecebimento} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="primeiroVencimento" className="font-medium">Primeiro vencimento</label><DateInput id="primeiroVencimento" value={dateFromIso(values.primeiroVencimento)} onChange={(value) => update('primeiroVencimento', value)} /><FieldError message={errors.primeiroVencimento} /></div>
                <div className="field col-12 md:col-6 flex align-items-center gap-2"><Checkbox inputId="permiteReceberAcimaDoPedido" checked={values.permiteReceberAcimaDoPedido} onChange={(event) => update('permiteReceberAcimaDoPedido', Boolean(event.checked))} /><label htmlFor="permiteReceberAcimaDoPedido">Permitir recebimento acima do pedido</label></div>
                <div className="field col-12 md:col-6 flex align-items-center gap-2"><Checkbox inputId="gerarContaPagar" checked={values.gerarContaPagar} onChange={(event) => update('gerarContaPagar', Boolean(event.checked))} /><label htmlFor="gerarContaPagar">Gerar conta a pagar</label></div>
                <div className="field col-12"><label htmlFor="observacaoRecebimento" className="font-medium">Observação</label><InputTextarea id="observacaoRecebimento" rows={2} autoResize value={textValue(values.observacao)} onChange={(event) => update('observacao', event.target.value)} /><FieldError message={errors.observacao} /></div>
                <div className="col-12">
                    <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3 border-1 surface-border border-round p-3">
                        <div>
                            <h4 className="m-0 mb-2">Itens para recebimento</h4>
                            <span className="text-color-secondary">Selecione os itens recebidos, local de estoque, quantidade conferida e valor unitário.</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Tag value={`${recebimentoTotals.selectedCount} selecionado(s)`} severity={hasSelectedItems ? 'success' : 'warning'} />
                            <Tag value={formatMoney(recebimentoTotals.total)} severity="info" />
                        </div>
                    </div>
                    {!hasSelectedItems ? <Message severity="warn" className="w-full mt-2" text="Selecione pelo menos um item para registrar o recebimento." /> : null}
                    {values.permiteReceberAcimaDoPedido ? <Message severity="warn" className="w-full mt-2" text="Recebimento acima do pedido será enviado de forma explícita para validação do backend." /> : null}
                    <FieldError message={errors.itens} />
                </div>
                {values.itens.map((item, index) => (
                    <div className={`col-12 border-1 surface-border border-round p-3 mb-2 ${item.selecionado ? 'surface-card' : 'surface-100'}`} key={item.itemPedidoCompraId}>
                        <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-2 mb-3">
                            <div className="flex align-items-center gap-2">
                                <Checkbox inputId={`itemRecebimento-${index}`} checked={Boolean(item.selecionado)} onChange={(event) => updateItem(index, 'selecionado', Boolean(event.checked))} />
                                <label htmlFor={`itemRecebimento-${index}`} className="font-medium">{item.produtoLabel}</label>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <Tag value={`Pedido: ${Number(item.quantidadePedido ?? 0)}`} severity="info" />
                                <Tag value={`Receber: ${Number(item.quantidade ?? 0)}`} severity={Number(item.quantidade ?? 0) > Number(item.quantidadePedido ?? 0) ? 'warning' : 'success'} />
                            </div>
                        </div>
                        <div className="grid align-items-end">
                            <div className="field col-12 md:col-4 mb-0"><label className="font-medium">Local de estoque *</label><EntitySelect entityName="local" value={textValue(item.localEstoqueId) || null} options={localSelectOptions} disabled={locaisQuery.isLoading || !item.selecionado} onChange={(value) => updateItem(index, 'localEstoqueId', value)} /></div>
                            <div className="field col-12 md:col-2 mb-0"><label className="font-medium">Quantidade *</label><QuantityInput value={Number(item.quantidade ?? 0)} disabled={!item.selecionado} onChange={(value) => updateItem(index, 'quantidade', value ?? 0)} /></div>
                            <div className="field col-12 md:col-3 mb-0"><label className="font-medium">Valor unitário *</label><MoneyInput value={Number(item.valorUnitario ?? 0)} disabled={!item.selecionado} onChange={(value) => updateItem(index, 'valorUnitario', value ?? 0)} /></div>
                            <div className="field col-12 md:col-3 mb-0"><label className="font-medium">Total recebido</label><div className="p-3 border-round surface-100 font-bold">{formatMoney(Number(item.quantidade ?? 0) * Number(item.valorUnitario ?? 0))}</div></div>
                        </div>
                    </div>
                ))}
            </FormGrid>
        </Dialog>
    );
};

export const selectedItemCompraToLabel = (item: ItemPedidoCompraResponse, produtoLabelMap: Map<string, string>) => produtoLabelMap.get(item.produtoId) ?? 'Produto não carregado';
