'use client';

import { useEffect, useState } from 'react';
import { ZodType } from 'zod';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FieldError } from '@/components/forms/FieldError';
import { atualizarLocalEstoqueSchema, criarLocalEstoqueSchema } from '@/features/estoque/schemas/estoqueSchemas';
import { FieldErrors, fieldErrorMap, textValue } from '@/features/estoque/components/estoqueUiUtils';
import { LocalEstoqueFormValues, LocalEstoqueResponse } from '@/features/estoque/types/estoque.types';

const buildInitialValues = (record?: LocalEstoqueResponse | null): LocalEstoqueFormValues =>
    record ? { id: record.id, nome: record.nome, descricao: record.descricao } : { empresaId: '', filialId: null, codigo: '', nome: '', descricao: null };

export const LocalEstoqueFormDialog = ({ visible, record, loading, onHide, onSubmit }: { visible: boolean; record?: LocalEstoqueResponse | null; loading?: boolean; onHide: () => void; onSubmit: (values: LocalEstoqueFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<LocalEstoqueFormValues>(() => buildInitialValues(record));
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(record));
            setErrors({});
        }
    }, [record, visible]);

    const update = (name: keyof LocalEstoqueFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const schema: ZodType<unknown> = record ? atualizarLocalEstoqueSchema : criarLocalEstoqueSchema;
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit(record?.id ? { ...(parsed.data as LocalEstoqueFormValues), id: record.id } : (parsed.data as LocalEstoqueFormValues));
    };

    const className = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header={record ? 'Editar local de estoque' : 'Novo local de estoque'} visible={visible} modal style={{ width: 'min(58rem, 96vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Salvar" icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <div className="grid formgrid p-fluid">
                {!record ? <EmpresaFilialFields empresaId={textValue(values.empresaId) || null} filialId={textValue(values.filialId) || null} empresaError={errors.empresaId} filialError={errors.filialId} onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} /> : null}
                {!record ? <div className="field col-12 md:col-4"><label htmlFor="codigo" className="font-medium">Código *</label><InputText id="codigo" value={textValue(values.codigo)} className={className('codigo')} onChange={(event) => update('codigo', event.target.value)} /><FieldError message={errors.codigo} /></div> : null}
                <div className="field col-12 md:col-8"><label htmlFor="nome" className="font-medium">Nome *</label><InputText id="nome" value={textValue(values.nome)} className={className('nome')} onChange={(event) => update('nome', event.target.value)} /><FieldError message={errors.nome} /></div>
                <div className="field col-12"><label htmlFor="descricao" className="font-medium">Descrição</label><InputTextarea id="descricao" value={textValue(values.descricao)} rows={3} autoResize className={className('descricao')} onChange={(event) => update('descricao', event.target.value)} /><FieldError message={errors.descricao} /></div>
            </div>
        </Dialog>
    );
};
