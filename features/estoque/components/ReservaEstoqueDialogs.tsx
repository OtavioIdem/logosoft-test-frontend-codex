'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { baixarReservaEstoqueSchema, cancelarReservaEstoqueSchema, criarReservaEstoqueSchema } from '@/features/estoque/schemas/estoqueSchemas';
import { FieldErrors, fieldErrorMap, localOptions, produtoOptions, textValue } from '@/features/estoque/components/estoqueUiUtils';
import { BaixarReservaFormValues, CancelarReservaFormValues, LocalEstoqueResponse, ReservaEstoqueFormValues } from '@/features/estoque/types/estoque.types';
import { ProdutoResponse } from '@/features/produtos/types/produtos.types';
import { usePedidosVenda } from '@/features/vendas/hooks/useVendasResources';
import { SelectOption } from '@/types/erp';

const origemEstoqueOptions: SelectOption<string>[] = [
    { label: 'Estoque', value: 'ESTOQUE' },
    { label: 'Vendas', value: 'VENDAS' },
    { label: 'Compras', value: 'COMPRAS' },
    { label: 'Ajuste interno', value: 'AJUSTE' }
];

const pedidoVendaOptions = (pedidos: { id: string; numero: string; valorTotal?: number | null; observacao?: string | null }[]): SelectOption<string>[] =>
    pedidos.map((pedido) => ({
        label: [pedido.numero, pedido.observacao, typeof pedido.valorTotal === 'number' ? pedido.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null].filter(Boolean).join(' • '),
        value: pedido.id
    }));

export const ReservaEstoqueFormDialog = ({ visible, produtos, locais, loading, onHide, onSubmit }: { visible: boolean; produtos: ProdutoResponse[]; locais: LocalEstoqueResponse[]; loading?: boolean; onHide: () => void; onSubmit: (values: ReservaEstoqueFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<ReservaEstoqueFormValues>({ empresaId: '', filialId: null, produtoId: '', localEstoqueId: '', quantidade: 0, origemModulo: 'VENDAS', origemId: null, observacao: null });
    const [errors, setErrors] = useState<FieldErrors>({});
    const pedidosQuery = usePedidosVenda({ empresaId: textValue(values.empresaId) || null, filialId: textValue(values.filialId) || null });
    const pedidoOptions = useMemo(() => pedidoVendaOptions(pedidosQuery.data ?? []), [pedidosQuery.data]);
    const origemModulo = textValue(values.origemModulo) || 'ESTOQUE';

    useEffect(() => {
        if (visible) {
            setValues({ empresaId: '', filialId: null, produtoId: '', localEstoqueId: '', quantidade: 0, origemModulo: 'VENDAS', origemId: null, observacao: null });
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof ReservaEstoqueFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const parsed = criarReservaEstoqueSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit(parsed.data as ReservaEstoqueFormValues);
    };

    return (
        <Dialog header="Nova reserva" visible={visible} modal style={{ width: 'min(64rem, 96vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Reservar" icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <FormGrid>
                <EmpresaFilialFields empresaId={textValue(values.empresaId) || null} filialId={textValue(values.filialId) || null} empresaError={errors.empresaId} filialError={errors.filialId} onEmpresaChange={(value) => { update('empresaId', value); update('origemId', null); }} onFilialChange={(value) => { update('filialId', value); update('origemId', null); }} />
                <div className="field col-12 md:col-6"><label htmlFor="produtoId" className="font-medium">Produto *</label><EntitySelect id="produtoId" entityName="produto" value={textValue(values.produtoId) || null} options={produtoOptions(produtos)} onChange={(value) => update('produtoId', value)} /><FieldError message={errors.produtoId} /></div>
                <div className="field col-12 md:col-6"><label htmlFor="localEstoqueId" className="font-medium">Local *</label><EntitySelect id="localEstoqueId" entityName="local" value={textValue(values.localEstoqueId) || null} options={localOptions(locais)} onChange={(value) => update('localEstoqueId', value)} /><FieldError message={errors.localEstoqueId} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="quantidade" className="font-medium">Quantidade *</label><QuantityInput id="quantidade" value={Number(values.quantidade ?? 0)} onChange={(value) => update('quantidade', value ?? 0)} /><FieldError message={errors.quantidade} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="origemModulo" className="font-medium">Origem *</label><Dropdown id="origemModulo" value={origemModulo} options={origemEstoqueOptions} optionLabel="label" optionValue="value" onChange={(event) => setValues((current) => ({ ...current, origemModulo: String(event.value), origemId: null }))} /><FieldError message={errors.origemModulo} /></div>
                {origemModulo === 'VENDAS' ? (
                    <div className="field col-12 md:col-4"><label htmlFor="documentoOrigemReserva" className="font-medium">Pedido de venda</label><EntitySelect id="documentoOrigemReserva" entityName="pedido de venda" value={textValue(values.origemId) || null} options={pedidoOptions} disabled={!values.empresaId || pedidosQuery.isLoading || pedidosQuery.isFetching} onChange={(value) => update('origemId', value)} /><small className="text-color-secondary">Pesquise pelo número do pedido; o vínculo correto será enviado automaticamente.</small><FieldError message={errors.origemId} /></div>
                ) : null}
                {origemModulo !== 'VENDAS' ? <div className="field col-12 md:col-4 flex align-items-end"><small className="text-color-secondary">Para esta origem, a reserva será enviada sem documento vinculado.</small></div> : null}
                <div className="field col-12"><label htmlFor="observacao" className="font-medium">Observação</label><InputTextarea id="observacao" value={textValue(values.observacao)} rows={3} autoResize onChange={(event) => update('observacao', event.target.value)} /><FieldError message={errors.observacao} /></div>
            </FormGrid>
        </Dialog>
    );
};

export const BaixarReservaDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: BaixarReservaFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<BaixarReservaFormValues>({ quantidade: 0, origemModulo: 'VENDAS', origemId: null, documento: null, motivo: '' });
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => {
        if (visible) {
            setValues({ quantidade: 0, origemModulo: 'VENDAS', origemId: null, documento: null, motivo: '' });
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof BaixarReservaFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const parsed = baixarReservaEstoqueSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit(parsed.data as BaixarReservaFormValues);
    };

    return (
        <Dialog header="Baixar reserva" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Baixar" icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <FormGrid>
                <div className="field col-12 md:col-4"><label htmlFor="quantidade" className="font-medium">Quantidade *</label><QuantityInput id="quantidade" value={Number(values.quantidade ?? 0)} onChange={(value) => update('quantidade', value ?? 0)} /><FieldError message={errors.quantidade} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="origemModuloBaixa" className="font-medium">Origem *</label><Dropdown id="origemModuloBaixa" value={textValue(values.origemModulo) || 'VENDAS'} options={origemEstoqueOptions} optionLabel="label" optionValue="value" onChange={(event) => update('origemModulo', String(event.value))} /><FieldError message={errors.origemModulo} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="documento" className="font-medium">Documento</label><InputText id="documento" value={textValue(values.documento)} onChange={(event) => update('documento', event.target.value)} /><FieldError message={errors.documento} /></div>
                <div className="field col-12"><label htmlFor="motivo" className="font-medium">Motivo *</label><InputTextarea id="motivo" value={textValue(values.motivo)} rows={3} autoResize onChange={(event) => update('motivo', event.target.value)} /><FieldError message={errors.motivo} /></div>
            </FormGrid>
        </Dialog>
    );
};

export const CancelarReservaDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: CancelarReservaFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<CancelarReservaFormValues>({ quantidade: null, motivo: '' });
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => {
        if (visible) {
            setValues({ quantidade: null, motivo: '' });
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof CancelarReservaFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const parsed = cancelarReservaEstoqueSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit(parsed.data as CancelarReservaFormValues);
    };

    return (
        <Dialog header="Cancelar reserva" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Confirmar cancelamento" icon="pi pi-ban" severity="danger" loading={loading} onClick={submit} /></div>}>
            <FormGrid>
                <div className="field col-12 md:col-4"><label htmlFor="quantidade" className="font-medium">Quantidade</label><QuantityInput id="quantidade" value={typeof values.quantidade === 'number' ? values.quantidade : null} onChange={(value) => update('quantidade', value)} /><small className="text-color-secondary">Deixe em branco para cancelar o saldo restante.</small><FieldError message={errors.quantidade} /></div>
                <div className="field col-12"><label htmlFor="motivo" className="font-medium">Motivo *</label><InputTextarea id="motivo" value={textValue(values.motivo)} rows={3} autoResize onChange={(event) => update('motivo', event.target.value)} /><FieldError message={errors.motivo} /></div>
            </FormGrid>
        </Dialog>
    );
};
