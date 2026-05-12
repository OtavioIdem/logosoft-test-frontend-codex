'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FieldError } from '@/components/forms/FieldError';
import { atualizarFornecedorSchema, criarFornecedorSchema } from '@/features/fornecedores/schemas/fornecedoresSchemas';
import { FornecedorFormValues, FornecedorResponse } from '@/features/fornecedores/types/fornecedores.types';
import { fieldErrorMap, FieldErrors, textValue } from '@/features/pessoas/components/formUtils';
import { PessoaResponse } from '@/features/pessoas/types/pessoas.types';
import { buildPrivacySafeEntityLabel } from '@/lib/formatters/privacy';
import { SelectOption } from '@/types/erp';

const buildInitialValues = (record?: FornecedorResponse | null): FornecedorFormValues =>
    record ? { id: record.id, observacao: record.observacao } : { empresaId: '', filialId: null, pessoaId: '', codigo: '', observacao: null };

export const FornecedorFormDialog = ({ visible, loading, record, pessoas, onHide, onSubmit }: { visible: boolean; loading?: boolean; record?: FornecedorResponse | null; pessoas: PessoaResponse[]; onHide: () => void; onSubmit: (values: FornecedorFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<FornecedorFormValues>(() => buildInitialValues(record));
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(record));
            setErrors({});
        }
    }, [record, visible]);

    const pessoaOptions = useMemo<SelectOption<string>[]>(() => pessoas.map((pessoa) => ({ label: buildPrivacySafeEntityLabel(pessoa.nomeRazaoSocial, pessoa.documento), value: pessoa.id })), [pessoas]);

    const update = (name: keyof FornecedorFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const schema = record ? atualizarFornecedorSchema : criarFornecedorSchema;
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit(record?.id ? { ...(parsed.data as FornecedorFormValues), id: record.id } : (parsed.data as FornecedorFormValues));
    };

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Salvar" icon="pi pi-check" loading={loading} onClick={submit} />
        </div>
    );

    const className = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header={record ? 'Editar fornecedor' : 'Novo fornecedor'} visible={visible} modal style={{ width: 'min(58rem, 96vw)' }} footer={footer} onHide={onHide}>
            <div className="grid formgrid p-fluid" role="form" aria-label={record ? 'Editar fornecedor' : 'Novo fornecedor'}>
                {!record ? (
                    <>
                        <EmpresaFilialFields empresaId={textValue(values.empresaId) || null} filialId={textValue(values.filialId) || null} empresaError={errors.empresaId} filialError={errors.filialId} onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                        <div className="field col-12 md:col-8">
                            <label htmlFor="pessoaId" className="font-medium">Pessoa *</label>
                            <EntitySelect id="pessoaId" value={textValue(values.pessoaId) || null} options={pessoaOptions} entityName="pessoa" onChange={(value) => update('pessoaId', value ?? '')} />
                            <small className="text-color-secondary">A pessoa deve estar ativa para ser vinculada como fornecedor.</small>
                            <FieldError message={errors.pessoaId} />
                        </div>
                        <div className="field col-12 md:col-4">
                            <label htmlFor="codigo" className="font-medium">Código *</label>
                            <InputText id="codigo" value={textValue(values.codigo)} className={className('codigo')} onChange={(event) => update('codigo', event.target.value)} />
                            <FieldError message={errors.codigo} />
                        </div>
                    </>
                ) : null}
                <div className="field col-12">
                    <label htmlFor="observacao" className="font-medium">Observação</label>
                    <InputTextarea id="observacao" value={textValue(values.observacao)} rows={4} autoResize className={className('observacao')} onChange={(event) => update('observacao', event.target.value)} />
                    <FieldError message={errors.observacao} />
                </div>
            </div>
        </Dialog>
    );
};
