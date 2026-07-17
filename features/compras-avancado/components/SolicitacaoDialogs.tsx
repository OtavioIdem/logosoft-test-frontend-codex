'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { DateInput } from '@/components/forms/DateInput';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { SelectOption } from '@/types/erp';
import { criarSolicitacaoSchema, itemSolicitacaoSchema } from '@/features/compras-avancado/schemas/comprasAvancadoSchemas';
import { CriarSolicitacaoFormValues, ItemSolicitacaoFormValues } from '@/features/compras-avancado/types/comprasAvancado.types';

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

const initialSolicitacao = (): CriarSolicitacaoFormValues => ({ empresaId: '', filialId: null, numero: '', dataSolicitacao: new Date(), solicitante: '', justificativa: null });

export const CriarSolicitacaoDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: CriarSolicitacaoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<CriarSolicitacaoFormValues>(initialSolicitacao);
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { if (visible) { setValues(initialSolicitacao()); setErrors({}); } }, [visible]);
    const update = (name: keyof CriarSolicitacaoFormValues, value: unknown) => { setValues((c) => ({ ...c, [name]: value })); setErrors((c) => ({ ...c, [name]: '' })); };
    const confirmar = async () => {
        const parsed = criarSolicitacaoSchema.safeParse(values);
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit(values);
    };
    return (
        <Dialog header="Nova solicitação de compra" visible={visible} modal style={{ width: 'min(48rem, 98vw)' }} footer={footer('Criar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-4"><label htmlFor="solNumero" className="font-medium">Número *</label><InputText id="solNumero" value={values.numero} className={classNames({ 'p-invalid': errors.numero })} onChange={(event) => update('numero', event.target.value)} /><FieldError message={errors.numero} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="solData" className="font-medium">Data *</label><DateInput id="solData" value={values.dataSolicitacao ?? null} onChange={(value) => update('dataSolicitacao', value)} /><FieldError message={errors.dataSolicitacao} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="solSolicitante" className="font-medium">Solicitante *</label><InputText id="solSolicitante" value={values.solicitante} className={classNames({ 'p-invalid': errors.solicitante })} onChange={(event) => update('solicitante', event.target.value)} /><FieldError message={errors.solicitante} /></div>
                <div className="field col-12"><label htmlFor="solJust" className="font-medium">Justificativa</label><InputTextarea id="solJust" value={values.justificativa ?? ''} rows={2} autoResize onChange={(event) => update('justificativa', event.target.value)} /></div>
            </FormGrid>
        </Dialog>
    );
};

export const ItemSolicitacaoDialog = ({ visible, loading, produtoOptions, onHide, onSubmit }: { visible: boolean; loading?: boolean; produtoOptions: SelectOption<string>[]; onHide: () => void; onSubmit: (values: ItemSolicitacaoFormValues) => Promise<void> }) => {
    const [produtoId, setProdutoId] = useState<string | null>(null);
    const [quantidade, setQuantidade] = useState<number | null>(1);
    const [observacao, setObservacao] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { if (visible) { setProdutoId(null); setQuantidade(1); setObservacao(''); setErrors({}); } }, [visible]);
    const confirmar = async () => {
        const parsed = itemSolicitacaoSchema.safeParse({ produtoId, quantidade, observacao });
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit({ produtoId: produtoId as string, quantidade: quantidade ?? 0, observacao });
    };
    return (
        <Dialog header="Adicionar item" visible={visible} modal style={{ width: 'min(40rem, 96vw)' }} footer={footer('Adicionar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-7"><label htmlFor="solItemProduto" className="font-medium">Produto *</label><EntitySelect id="solItemProduto" entityName="produto" value={produtoId} options={produtoOptions} onChange={(value) => { setProdutoId(value); setErrors((c) => ({ ...c, produtoId: '' })); }} /><FieldError message={errors.produtoId} /></div>
                <div className="field col-12 md:col-5"><label htmlFor="solItemQtd" className="font-medium">Quantidade *</label><QuantityInput id="solItemQtd" value={quantidade} onChange={(value) => { setQuantidade(value); setErrors((c) => ({ ...c, quantidade: '' })); }} /><FieldError message={errors.quantidade} /></div>
                <div className="field col-12"><label htmlFor="solItemObs" className="font-medium">Observação</label><InputText id="solItemObs" value={observacao} onChange={(event) => setObservacao(event.target.value)} /></div>
            </FormGrid>
        </Dialog>
    );
};
