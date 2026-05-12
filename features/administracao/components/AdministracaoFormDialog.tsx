'use client';

import { useEffect, useMemo, useState } from 'react';
import { ZodError, ZodType } from 'zod';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import { CnpjInput } from '@/components/forms/CnpjInput';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { SetorSelect } from '@/components/forms/SetorSelect';
import { FieldError } from '@/components/forms/FieldError';
import { AdministracaoFieldConfig } from '@/features/administracao/components/administracaoPageConfig';
import { AdministracaoFormValues } from '@/features/administracao/types/administracao.types';

type AdministracaoFormDialogProps = {
    visible: boolean;
    loading?: boolean;
    title: string;
    fields: AdministracaoFieldConfig[];
    schema: ZodType<unknown>;
    record?: Record<string, unknown> | null;
    onHide: () => void;
    onSubmit: (values: AdministracaoFormValues) => Promise<void>;
};

type FieldErrors = Record<string, string | undefined>;

const getStringValue = (value: unknown) => (typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value));
const getNumberValue = (value: unknown) => (typeof value === 'number' ? value : value === null || value === undefined || value === '' ? null : Number(value));

const buildInitialValues = (fields: AdministracaoFieldConfig[], record?: Record<string, unknown> | null) =>
    fields.reduce<AdministracaoFormValues>((acc, field) => {
        if (field.createOnly && record) {
            return acc;
        }

        if (field.updateOnly && !record) {
            return acc;
        }

        acc[field.name] = record?.[field.name] ?? (field.kind === 'number' ? 0 : '');
        return acc;
    }, record?.id ? { id: String(record.id) } : {});

const fieldErrorMap = (error: ZodError<unknown>): FieldErrors => {
    const flattened = error.flatten();
    const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;

    return Object.entries(fieldErrors).reduce<FieldErrors>((acc, [field, messages]) => {
        acc[field] = Array.isArray(messages) ? messages[0] : undefined;
        return acc;
    }, {});
};

export const AdministracaoFormDialog = ({ visible, loading, title, fields, schema, record, onHide, onSubmit }: AdministracaoFormDialogProps) => {
    const activeFields = useMemo(() => fields.filter((field) => (record ? !field.createOnly : !field.updateOnly)), [fields, record]);
    const [values, setValues] = useState<AdministracaoFormValues>(() => buildInitialValues(fields, record));
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(fields, record));
            setErrors({});
        }
    }, [fields, record, visible]);

    const updateField = (name: string, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }

        const parsedData = parsed.data as Record<string, unknown>;
        await onSubmit(record?.id ? { ...parsedData, id: record.id } : parsedData);
    };

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Salvar" icon="pi pi-check" loading={loading} onClick={submit} />
        </div>
    );

    const renderField = (field: AdministracaoFieldConfig) => {
        const commonClassName = classNames({ 'p-invalid': errors[field.name] });
        const disabled = Boolean(record && field.disabledOnUpdate);
        const value = values[field.name];

        if (field.kind === 'textarea') {
            return <InputTextarea id={field.name} value={getStringValue(value)} rows={4} autoResize className={commonClassName} disabled={disabled} onChange={(event) => updateField(field.name, event.target.value)} />;
        }

        if (field.kind === 'number') {
            return <InputNumber id={field.name} value={getNumberValue(value)} min={0} className={commonClassName} disabled={disabled} onValueChange={(event) => updateField(field.name, event.value ?? 0)} />;
        }

        if (field.kind === 'documento') {
            return <CnpjInput id={field.name} value={getStringValue(value)} disabled={disabled} onChange={(nextValue) => updateField(field.name, nextValue)} />;
        }

        if (field.kind === 'guid' && field.name === 'empresaId') {
            return <EmpresaSelect id={field.name} value={getStringValue(value) || null} required={field.required} disabled={disabled} onChange={(nextValue) => { updateField(field.name, nextValue); updateField('filialId', null); }} />;
        }

        if (field.kind === 'guid' && field.name === 'filialId') {
            return <FilialSelect id={field.name} empresaId={getStringValue(values.empresaId) || null} value={getStringValue(value) || null} disabled={disabled || !values.empresaId} onChange={(nextValue) => { updateField(field.name, nextValue); updateField('setorId', null); }} />;
        }

        if (field.kind === 'guid' && field.name === 'setorId') {
            return <SetorSelect id={field.name} empresaId={getStringValue(values.empresaId) || null} filialId={getStringValue(values.filialId) || null} value={getStringValue(value) || null} disabled={disabled || !values.empresaId} onChange={(nextValue) => updateField(field.name, nextValue)} />;
        }

        return <InputText id={field.name} value={getStringValue(value)} className={commonClassName} disabled={disabled} onChange={(event) => updateField(field.name, event.target.value)} />;
    };

    return (
        <Dialog header={title} visible={visible} style={{ width: 'min(54rem, 96vw)' }} modal footer={footer} onHide={onHide}>
            <div className="grid formgrid p-fluid" role="form" aria-label={title}>
                {activeFields.map((field) => (
                    <div className={`field ${field.col ?? 'col-12 md:col-6'}`} key={field.name}>
                        <label htmlFor={field.name} className="font-medium">
                            {field.label}
                            {field.required ? <span className="text-red-500 ml-1">*</span> : null}
                        </label>
                        {renderField(field)}
                        {field.helperText ? <small className="text-color-secondary">{field.helperText}</small> : null}
                        <FieldError message={errors[field.name]} />
                    </div>
                ))}
            </div>
        </Dialog>
    );
};
