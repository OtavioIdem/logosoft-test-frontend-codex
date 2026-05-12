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
import { MoneyInput } from '@/components/forms/MoneyInput';
import { atualizarClienteSchema, criarClienteSchema } from '@/features/clientes/schemas/clientesSchemas';
import { ClienteFormValues, ClienteResponse } from '@/features/clientes/types/clientes.types';
import { fieldErrorMap, FieldErrors, numberValue, textValue } from '@/features/pessoas/components/formUtils';
import { PessoaResponse } from '@/features/pessoas/types/pessoas.types';
import { buildPrivacySafeEntityLabel } from '@/lib/formatters/privacy';
import { SelectOption } from '@/types/erp';

const buildInitialValues = (record?: ClienteResponse | null): ClienteFormValues =>
    record
        ? { id: record.id, limiteCredito: record.limiteCredito, observacao: record.observacao }
        : { empresaId: '', filialId: null, pessoaId: '', codigo: '', limiteCredito: 0, observacao: null };

export const ClienteFormDialog = ({ visible, loading, record, pessoas, onHide, onSubmit }: { visible: boolean; loading?: boolean; record?: ClienteResponse | null; pessoas: PessoaResponse[]; onHide: () => void; onSubmit: (values: ClienteFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<ClienteFormValues>(() => buildInitialValues(record));
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(record));
            setErrors({});
        }
    }, [record, visible]);

    const pessoaOptions = useMemo<SelectOption<string>[]>(() => pessoas.map((pessoa) => ({ label: buildPrivacySafeEntityLabel(pessoa.nomeRazaoSocial, pessoa.documento), value: pessoa.id })), [pessoas]);

    const update = (name: keyof ClienteFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const schema = record ? atualizarClienteSchema : criarClienteSchema;
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit(record?.id ? { ...(parsed.data as ClienteFormValues), id: record.id } : (parsed.data as ClienteFormValues));
    };

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Salvar" icon="pi pi-check" loading={loading} onClick={submit} />
        </div>
    );

    const className = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header={record ? 'Editar cliente' : 'Novo cliente'} visible={visible} modal style={{ width: 'min(58rem, 96vw)' }} footer={footer} onHide={onHide}>
            <div className="grid formgrid p-fluid" role="form" aria-label={record ? 'Editar cliente' : 'Novo cliente'}>
                {!record ? (
                    <>
                        <EmpresaFilialFields empresaId={textValue(values.empresaId) || null} filialId={textValue(values.filialId) || null} empresaError={errors.empresaId} filialError={errors.filialId} onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                        <div className="field col-12 md:col-8">
                            <label htmlFor="pessoaId" className="font-medium">Pessoa *</label>
                            <EntitySelect id="pessoaId" value={textValue(values.pessoaId) || null} options={pessoaOptions} entityName="pessoa" onChange={(value) => update('pessoaId', value ?? '')} />
                            <small className="text-color-secondary">A pessoa deve estar ativa para ser vinculada como cliente.</small>
                            <FieldError message={errors.pessoaId} />
                        </div>
                        <div className="field col-12 md:col-4">
                            <label htmlFor="codigo" className="font-medium">Código *</label>
                            <InputText id="codigo" value={textValue(values.codigo)} className={className('codigo')} onChange={(event) => update('codigo', event.target.value)} />
                            <FieldError message={errors.codigo} />
                        </div>
                    </>
                ) : null}
                <div className="field col-12 md:col-4">
                    <label htmlFor="limiteCredito" className="font-medium">Limite de crédito *</label>
                    <MoneyInput id="limiteCredito" value={numberValue(values.limiteCredito)} onChange={(value) => update('limiteCredito', value ?? 0)} />
                    <FieldError message={errors.limiteCredito} />
                </div>
                <div className="field col-12">
                    <label htmlFor="observacao" className="font-medium">Observação</label>
                    <InputTextarea id="observacao" value={textValue(values.observacao)} rows={4} autoResize className={className('observacao')} onChange={(event) => update('observacao', event.target.value)} />
                    <FieldError message={errors.observacao} />
                </div>
            </div>
        </Dialog>
    );
};
