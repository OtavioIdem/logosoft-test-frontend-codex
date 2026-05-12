'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { adicionarItemPedidoCompraSchema, atualizarItemPedidoCompraSchema } from '@/features/compras/schemas/comprasSchemas';
import { ItemPedidoCompraFormValues, ItemPedidoCompraResponse, PedidoCompraResponse } from '@/features/compras/types/compras.types';
import { FieldErrors, fieldErrorMap, formatMoney, localOptions, produtoOptions, textValue } from '@/features/compras/components/comprasUiUtils';

const buildInitialValues = (item?: ItemPedidoCompraResponse | null): ItemPedidoCompraFormValues =>
    item
        ? { id: item.id, localEstoqueId: item.localEstoqueId, quantidade: item.quantidade, valorUnitario: item.valorUnitario, valorDesconto: item.valorDesconto, observacao: item.observacao ?? null }
        : { produtoId: '', localEstoqueId: '', quantidade: 1, valorUnitario: 0, valorDesconto: 0, observacao: null };

export const PedidoCompraItemDialog = ({ visible, pedido, item, loading, onHide, onSubmit }: { visible: boolean; pedido: PedidoCompraResponse | null; item?: ItemPedidoCompraResponse | null; loading?: boolean; onHide: () => void; onSubmit: (values: ItemPedidoCompraFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<ItemPedidoCompraFormValues>(() => buildInitialValues(item));
    const [errors, setErrors] = useState<FieldErrors>({});
    const produtosQuery = useProdutos({ empresaId: pedido?.empresaId ?? null, filialId: pedido?.filialId ?? null });
    const locaisQuery = useLocaisEstoque({ empresaId: pedido?.empresaId ?? null, filialId: pedido?.filialId ?? null });

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(item));
            setErrors({});
        }
    }, [item, visible]);

    const update = (name: keyof ItemPedidoCompraFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const schema = item ? atualizarItemPedidoCompraSchema : adicionarItemPedidoCompraSchema;
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit({ ...values, ...(parsed.data as ItemPedidoCompraFormValues), id: item?.id });
    };

    const valorBruto = Number(values.quantidade ?? 0) * Number(values.valorUnitario ?? 0);
    const total = Math.max(0, valorBruto - Number(values.valorDesconto ?? 0));
    const footer = <div className="flex justify-content-end gap-2"><Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button type="button" label="Salvar item" icon="pi pi-check" loading={loading} onClick={submit} /></div>;

    return (
        <Dialog header={item ? 'Editar item de compra' : 'Adicionar item de compra'} visible={visible} modal style={{ width: 'min(60rem, 96vw)' }} footer={footer} onHide={onHide}>
            <FormGrid>
                {!item ? <div className="field col-12 md:col-6"><label htmlFor="produtoId" className="font-medium">Produto *</label><EntitySelect id="produtoId" entityName="produto" value={textValue(values.produtoId) || null} options={produtoOptions(produtosQuery.data ?? [])} disabled={produtosQuery.isLoading} onChange={(value) => update('produtoId', value)} /><FieldError message={errors.produtoId} /></div> : null}
                <div className="field col-12 md:col-6"><label htmlFor="localEstoqueId" className="font-medium">Local de estoque</label><EntitySelect id="localEstoqueId" entityName="local" value={textValue(values.localEstoqueId) || null} options={localOptions(locaisQuery.data ?? [])} disabled={locaisQuery.isLoading} onChange={(value) => update('localEstoqueId', value)} /><FieldError message={errors.localEstoqueId} /></div>
                <div className="field col-12 md:col-3"><label htmlFor="quantidade" className="font-medium">Quantidade *</label><QuantityInput id="quantidade" value={Number(values.quantidade ?? 0)} onChange={(value) => update('quantidade', value ?? 0)} /><FieldError message={errors.quantidade} /></div>
                <div className="field col-12 md:col-3"><label htmlFor="valorUnitario" className="font-medium">Valor unitário *</label><MoneyInput id="valorUnitario" value={Number(values.valorUnitario ?? 0)} onChange={(value) => update('valorUnitario', value ?? 0)} /><FieldError message={errors.valorUnitario} /></div>
                <div className="field col-12 md:col-3"><label htmlFor="valorDesconto" className="font-medium">Desconto</label><MoneyInput id="valorDesconto" value={Number(values.valorDesconto ?? 0)} onChange={(value) => update('valorDesconto', value ?? 0)} /><FieldError message={errors.valorDesconto} /></div>
                <div className="field col-12 md:col-3"><label className="font-medium">Total visual</label><div className="p-3 border-round surface-100 font-bold">{formatMoney(total)}</div></div>
                <div className="field col-12"><label htmlFor="observacaoItem" className="font-medium">Observação</label><InputTextarea id="observacaoItem" rows={3} autoResize value={textValue(values.observacao)} onChange={(event) => update('observacao', event.target.value)} /><FieldError message={errors.observacao} /></div>
            </FormGrid>
        </Dialog>
    );
};
