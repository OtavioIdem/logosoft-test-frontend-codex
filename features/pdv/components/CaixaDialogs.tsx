'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { abrirCaixaSchema, fecharCaixaSchema, movimentoCaixaSchema } from '@/features/pdv/schemas/pdvSchemas';
import { AbrirCaixaFormValues, CaixaResponse, FecharCaixaFormValues, MovimentoCaixaFormValues } from '@/features/pdv/types/pdv.types';

const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const buildErrors = (error: z.ZodError) => {
    const map: Record<string, string> = {};
    for (const issue of error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !map[key]) map[key] = issue.message;
    }
    return map;
};

const footer = (label: string, loading: boolean | undefined, onHide: () => void, onConfirm: () => void) => (
    <div className="flex justify-content-end gap-2">
        <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
        <Button type="button" label={label} icon="pi pi-check" loading={loading} onClick={onConfirm} />
    </div>
);

export const AbrirCaixaDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: AbrirCaixaFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<AbrirCaixaFormValues>({ empresaId: '', filialId: null, codigo: '', terminal: '', valorAbertura: 0 });
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { if (visible) { setValues({ empresaId: '', filialId: null, codigo: '', terminal: '', valorAbertura: 0 }); setErrors({}); } }, [visible]);
    const update = (name: keyof AbrirCaixaFormValues, value: unknown) => { setValues((c) => ({ ...c, [name]: value })); setErrors((c) => ({ ...c, [name]: '' })); };
    const confirmar = async () => {
        const parsed = abrirCaixaSchema.safeParse(values);
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit(values);
    };
    return (
        <Dialog header="Abrir caixa" visible={visible} modal style={{ width: 'min(42rem, 96vw)' }} footer={footer('Abrir', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-4">
                    <label htmlFor="caixaCodigo" className="font-medium">Código *</label>
                    <InputText id="caixaCodigo" value={values.codigo} className={classNames({ 'p-invalid': errors.codigo })} onChange={(event) => update('codigo', event.target.value)} />
                    <FieldError message={errors.codigo} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="caixaTerminal" className="font-medium">Terminal *</label>
                    <InputText id="caixaTerminal" value={values.terminal} className={classNames({ 'p-invalid': errors.terminal })} onChange={(event) => update('terminal', event.target.value)} />
                    <FieldError message={errors.terminal} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="caixaAbertura" className="font-medium">Valor de abertura *</label>
                    <MoneyInput id="caixaAbertura" value={values.valorAbertura} onChange={(value) => update('valorAbertura', value ?? 0)} />
                    <FieldError message={errors.valorAbertura} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const MovimentoCaixaDialog = ({ visible, loading, title, confirmLabel, onHide, onSubmit }: { visible: boolean; loading?: boolean; title: string; confirmLabel: string; onHide: () => void; onSubmit: (values: MovimentoCaixaFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<MovimentoCaixaFormValues>({ valor: 0, descricao: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { if (visible) { setValues({ valor: 0, descricao: '' }); setErrors({}); } }, [visible]);
    const confirmar = async () => {
        const parsed = movimentoCaixaSchema.safeParse(values);
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit(values);
    };
    return (
        <Dialog header={title} visible={visible} modal style={{ width: 'min(34rem, 96vw)' }} footer={footer(confirmLabel, loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12">
                    <label htmlFor="movValor" className="font-medium">Valor *</label>
                    <MoneyInput id="movValor" value={values.valor} onChange={(value) => { setValues((c) => ({ ...c, valor: value ?? 0 })); setErrors((c) => ({ ...c, valor: '' })); }} />
                    <FieldError message={errors.valor} />
                </div>
                <div className="field col-12">
                    <label htmlFor="movDescricao" className="font-medium">Descrição *</label>
                    <InputText id="movDescricao" value={values.descricao} className={classNames({ 'p-invalid': errors.descricao })} onChange={(event) => { setValues((c) => ({ ...c, descricao: event.target.value })); setErrors((c) => ({ ...c, descricao: '' })); }} />
                    <FieldError message={errors.descricao} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const FecharCaixaDialog = ({ visible, loading, caixa, onHide, onSubmit }: { visible: boolean; loading?: boolean; caixa: CaixaResponse | null; onHide: () => void; onSubmit: (values: FecharCaixaFormValues) => Promise<void> }) => {
    const [valorInformado, setValorInformado] = useState<number>(0);
    const [erro, setErro] = useState('');
    useEffect(() => { if (visible) { setValorInformado(caixa?.saldoDinheiroEsperado ?? 0); setErro(''); } }, [visible, caixa]);
    const esperado = caixa?.saldoDinheiroEsperado ?? 0;
    const diferenca = valorInformado - esperado;
    const confirmar = async () => {
        const parsed = fecharCaixaSchema.safeParse({ valorInformado });
        if (!parsed.success) { setErro(buildErrors(parsed.error).valorInformado ?? 'Valor inválido.'); return; }
        await onSubmit({ valorInformado });
    };
    return (
        <Dialog header="Fechar caixa (conferência)" visible={visible} modal style={{ width: 'min(38rem, 96vw)' }} footer={footer('Fechar caixa', loading, onHide, confirmar)} onHide={onHide}>
            <div className="grid">
                <div className="col-6"><span className="block text-color-secondary text-sm">Saldo esperado (dinheiro)</span><strong>{formatMoney(esperado)}</strong></div>
                <div className="col-6"><span className="block text-color-secondary text-sm">Diferença</span><strong className={diferenca === 0 ? 'text-green-600' : 'text-orange-600'}>{formatMoney(diferenca)}</strong></div>
                <div className="field col-12">
                    <label htmlFor="caixaValorInformado" className="font-medium">Valor informado (contado) *</label>
                    <MoneyInput id="caixaValorInformado" value={valorInformado} onChange={(value) => { setValorInformado(value ?? 0); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
                <div className="col-12">
                    {diferenca === 0 ? <Message severity="success" text="Conferência bate com o esperado." /> : <Message severity="warn" text={`Divergência de ${formatMoney(diferenca)} entre esperado e informado.`} />}
                </div>
            </div>
        </Dialog>
    );
};
