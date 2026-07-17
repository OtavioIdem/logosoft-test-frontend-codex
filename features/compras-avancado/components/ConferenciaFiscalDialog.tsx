'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { DateInput } from '@/components/forms/DateInput';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { conferenciaFiscalSchema } from '@/features/compras-avancado/schemas/comprasAvancadoSchemas';
import { ConferenciaFiscalFormValues } from '@/features/compras-avancado/types/comprasAvancado.types';

const buildErrors = (error: z.ZodError) => {
    const map: Record<string, string> = {};
    for (const issue of error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !map[key]) map[key] = issue.message;
    }
    return map;
};

const initialValues = (): ConferenciaFiscalFormValues => ({ chaveAcesso: null, serie: '', numero: '', cnpjEmitente: '', dataEmissaoNota: new Date(), valorTotalNota: 0, observacao: null });

export const ConferenciaFiscalDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: ConferenciaFiscalFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<ConferenciaFiscalFormValues>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { if (visible) { setValues(initialValues()); setErrors({}); } }, [visible]);
    const update = (name: keyof ConferenciaFiscalFormValues, value: unknown) => { setValues((c) => ({ ...c, [name]: value })); setErrors((c) => ({ ...c, [name]: '' })); };
    const confirmar = async () => {
        const parsed = conferenciaFiscalSchema.safeParse(values);
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit(values);
    };
    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Registrar conferência" icon="pi pi-check" loading={loading} onClick={confirmar} />
        </div>
    );
    return (
        <Dialog header="Conferência fiscal da nota de entrada" visible={visible} modal style={{ width: 'min(50rem, 98vw)' }} footer={footer} onHide={onHide}>
            <Message className="w-full mb-3" severity="info" text="Registre os dados da NF de entrada. Divergências entre pedido e nota são apuradas pelo backend." />
            <FormGrid>
                <div className="field col-12 md:col-8"><label htmlFor="cfChave" className="font-medium">Chave de acesso</label><InputText id="cfChave" value={values.chaveAcesso ?? ''} onChange={(event) => update('chaveAcesso', event.target.value)} /></div>
                <div className="field col-6 md:col-2"><label htmlFor="cfSerie" className="font-medium">Série *</label><InputText id="cfSerie" value={values.serie} className={classNames({ 'p-invalid': errors.serie })} onChange={(event) => update('serie', event.target.value)} /><FieldError message={errors.serie} /></div>
                <div className="field col-6 md:col-2"><label htmlFor="cfNumero" className="font-medium">Número *</label><InputText id="cfNumero" value={values.numero} className={classNames({ 'p-invalid': errors.numero })} onChange={(event) => update('numero', event.target.value)} /><FieldError message={errors.numero} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="cfCnpj" className="font-medium">CNPJ emitente *</label><InputText id="cfCnpj" value={values.cnpjEmitente} className={classNames({ 'p-invalid': errors.cnpjEmitente })} onChange={(event) => update('cnpjEmitente', event.target.value)} /><FieldError message={errors.cnpjEmitente} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="cfEmissao" className="font-medium">Emissão *</label><DateInput id="cfEmissao" value={values.dataEmissaoNota ?? null} onChange={(value) => update('dataEmissaoNota', value)} /><FieldError message={errors.dataEmissaoNota} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="cfValor" className="font-medium">Valor total *</label><MoneyInput id="cfValor" value={values.valorTotalNota} onChange={(value) => update('valorTotalNota', value ?? 0)} /><FieldError message={errors.valorTotalNota} /></div>
                <div className="field col-12"><label htmlFor="cfObs" className="font-medium">Observação</label><InputTextarea id="cfObs" value={values.observacao ?? ''} rows={2} autoResize onChange={(event) => update('observacao', event.target.value)} /></div>
            </FormGrid>
        </Dialog>
    );
};
