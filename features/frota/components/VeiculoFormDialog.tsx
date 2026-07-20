'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { criarVeiculoSchema } from '@/features/frota/schemas/frotaSchemas';
import { TipoCombustivel, TipoVeiculo, VeiculoFormValues } from '@/features/frota/types/frota.types';
import { combustivelOptions, tipoVeiculoOptions } from '@/features/frota/components/frotaLabels';

const buildErrors = (error: z.ZodError) => {
    const map: Record<string, string> = {};
    for (const issue of error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !map[key]) map[key] = issue.message;
    }
    return map;
};

const initialValues = (): VeiculoFormValues => ({
    empresaId: '',
    filialId: null,
    placa: '',
    modelo: '',
    marca: '',
    ano: null,
    tipo: TipoVeiculo.Carro,
    combustivel: TipoCombustivel.Flex,
    odometroInicial: 0,
    renavam: ''
});

export const VeiculoFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: VeiculoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<VeiculoFormValues>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialValues());
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof VeiculoFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarVeiculoSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Cadastrar veículo" icon="pi pi-check" loading={loading} onClick={submit} />
        </div>
    );

    return (
        <Dialog header="Novo veículo" visible={visible} modal style={{ width: 'min(56rem, 98vw)' }} footer={footer} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields
                    empresaId={values.empresaId || null}
                    filialId={values.filialId || null}
                    empresaError={errors.empresaId}
                    filialError={errors.filialId}
                    empresaCol="col-12 md:col-6"
                    filialCol="col-12 md:col-6"
                    onEmpresaChange={(value) => update('empresaId', value)}
                    onFilialChange={(value) => update('filialId', value)}
                />
                <div className="field col-12 md:col-4">
                    <label htmlFor="veicPlaca" className="font-medium">Placa *</label>
                    <InputText id="veicPlaca" value={values.placa} className={invalid('placa')} onChange={(event) => update('placa', event.target.value.toUpperCase())} />
                    <FieldError message={errors.placa} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="veicModelo" className="font-medium">Modelo *</label>
                    <InputText id="veicModelo" value={values.modelo} className={invalid('modelo')} onChange={(event) => update('modelo', event.target.value)} />
                    <FieldError message={errors.modelo} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="veicMarca" className="font-medium">Marca</label>
                    <InputText id="veicMarca" value={values.marca ?? ''} onChange={(event) => update('marca', event.target.value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="veicTipo" className="font-medium">Tipo *</label>
                    <Dropdown inputId="veicTipo" value={values.tipo} options={tipoVeiculoOptions} onChange={(event) => update('tipo', event.value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="veicCombustivel" className="font-medium">Combustível *</label>
                    <Dropdown inputId="veicCombustivel" value={values.combustivel} options={combustivelOptions} onChange={(event) => update('combustivel', event.value)} />
                </div>
                <div className="field col-6 md:col-2">
                    <label htmlFor="veicAno" className="font-medium">Ano</label>
                    <InputNumber inputId="veicAno" value={values.ano ?? null} useGrouping={false} min={1900} max={2100} onValueChange={(event) => update('ano', event.value ?? null)} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="veicOdometro" className="font-medium">Odômetro inicial *</label>
                    <QuantityInput id="veicOdometro" value={values.odometroInicial} onChange={(value) => update('odometroInicial', value ?? 0)} />
                    <FieldError message={errors.odometroInicial} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="veicRenavam" className="font-medium">Renavam</label>
                    <InputText id="veicRenavam" value={values.renavam ?? ''} onChange={(event) => update('renavam', event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};
