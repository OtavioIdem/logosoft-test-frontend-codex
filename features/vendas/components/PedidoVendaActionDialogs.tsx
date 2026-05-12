'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { aprovarPedidoVendaSchema, faturarPedidoVendaSchema } from '@/features/vendas/schemas/vendasSchemas';
import { FieldErrors, fieldErrorMap, textValue } from '@/features/vendas/components/vendasUiUtils';
import { AprovarPedidoVendaRequest, FaturarPedidoVendaRequest } from '@/features/vendas/types/vendas.types';

export const AprovarPedidoVendaDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: AprovarPedidoVendaRequest) => Promise<void> }) => {
    const [values, setValues] = useState<AprovarPedidoVendaRequest>({ reservarEstoque: true, observacao: null });
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => { if (visible) { setValues({ reservarEstoque: true, observacao: null }); setErrors({}); } }, [visible]);

    const submit = async () => {
        const parsed = aprovarPedidoVendaSchema.safeParse(values);
        if (!parsed.success) { setErrors(fieldErrorMap(parsed.error)); return; }
        await onSubmit(parsed.data);
    };

    return (
        <Dialog header="Aprovar pedido" visible={visible} modal style={{ width: 'min(34rem, 94vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Aprovar" icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <FormGrid>
                <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="reservarEstoque" checked={values.reservarEstoque} onChange={(event) => setValues((current) => ({ ...current, reservarEstoque: Boolean(event.checked) }))} /><label htmlFor="reservarEstoque">Reservar estoque na aprovação</label></div>
                <div className="field col-12"><label htmlFor="observacaoAprovacao" className="font-medium">Observação</label><InputTextarea id="observacaoAprovacao" rows={3} autoResize value={textValue(values.observacao)} onChange={(event) => setValues((current) => ({ ...current, observacao: event.target.value }))} /><FieldError message={errors.observacao} /></div>
            </FormGrid>
        </Dialog>
    );
};

export const FaturarPedidoVendaDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: FaturarPedidoVendaRequest) => Promise<void> }) => {
    const [values, setValues] = useState<FaturarPedidoVendaRequest>({ baixarEstoque: true, documento: '', observacao: null });
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => { if (visible) { setValues({ baixarEstoque: true, documento: '', observacao: null }); setErrors({}); } }, [visible]);

    const submit = async () => {
        const parsed = faturarPedidoVendaSchema.safeParse(values);
        if (!parsed.success) { setErrors(fieldErrorMap(parsed.error)); return; }
        await onSubmit(parsed.data);
    };

    return (
        <Dialog header="Faturar pedido" visible={visible} modal style={{ width: 'min(38rem, 94vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Faturar" icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <FormGrid>
                <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="baixarEstoque" checked={values.baixarEstoque} onChange={(event) => setValues((current) => ({ ...current, baixarEstoque: Boolean(event.checked) }))} /><label htmlFor="baixarEstoque">Baixar estoque no faturamento</label></div>
                <div className="field col-12"><label htmlFor="documentoFaturamento" className="font-medium">Documento *</label><InputText id="documentoFaturamento" value={values.documento} onChange={(event) => setValues((current) => ({ ...current, documento: event.target.value }))} /><FieldError message={errors.documento} /></div>
                <div className="field col-12"><label htmlFor="observacaoFaturamento" className="font-medium">Observação</label><InputTextarea id="observacaoFaturamento" rows={3} autoResize value={textValue(values.observacao)} onChange={(event) => setValues((current) => ({ ...current, observacao: event.target.value }))} /><FieldError message={errors.observacao} /></div>
            </FormGrid>
        </Dialog>
    );
};
