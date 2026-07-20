'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { SelectOption } from '@/types/erp';
import { criarBancoSchema, criarCarteiraSchema, criarContaBancariaSchema, criarConvenioSchema } from '@/features/bancos/schemas/bancosSchemas';
import { useBancos, useContasBancarias, useConvenios } from '@/features/bancos/hooks/useBancosResources';
import { BancoFormValues, CarteiraFormValues, ContaBancariaFormValues, ConvenioFormValues, TipoCobranca } from '@/features/bancos/types/bancos.types';
import { tipoCobrancaOptions } from '@/features/bancos/components/bancosLabels';

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

export const BancoDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: BancoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<BancoFormValues>({ codigo: '', nome: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues({ codigo: '', nome: '' });
            setErrors({});
        }
    }, [visible]);

    const submit = async () => {
        const parsed = criarBancoSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Novo banco" visible={visible} modal style={{ width: 'min(40rem, 96vw)' }} footer={footer('Criar banco', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <div className="field col-4">
                    <label htmlFor="bancoCodigo" className="font-medium">Código *</label>
                    <InputText id="bancoCodigo" value={values.codigo} className={invalid('codigo')} onChange={(event) => { setValues((c) => ({ ...c, codigo: event.target.value })); setErrors((c) => ({ ...c, codigo: '' })); }} />
                    <FieldError message={errors.codigo} />
                </div>
                <div className="field col-8">
                    <label htmlFor="bancoNome" className="font-medium">Nome *</label>
                    <InputText id="bancoNome" value={values.nome} className={invalid('nome')} onChange={(event) => { setValues((c) => ({ ...c, nome: event.target.value })); setErrors((c) => ({ ...c, nome: '' })); }} />
                    <FieldError message={errors.nome} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const initialConta = (): ContaBancariaFormValues => ({ empresaId: '', filialId: null, bancoId: '', agencia: '', agenciaDv: '', conta: '', contaDv: '' });

export const ContaBancariaDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: ContaBancariaFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<ContaBancariaFormValues>(initialConta);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const bancosQuery = useBancos(visible);
    const bancoOptions = useMemo<SelectOption<string>[]>(() => (bancosQuery.data ?? []).map((banco) => ({ label: `${banco.codigo} - ${banco.nome}`, value: banco.id })), [bancosQuery.data]);

    useEffect(() => {
        if (visible) {
            setValues(initialConta());
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof ContaBancariaFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarContaBancariaSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Nova conta bancária" visible={visible} modal style={{ width: 'min(50rem, 96vw)' }} footer={footer('Criar conta', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-6">
                    <label htmlFor="contaBanco" className="font-medium">Banco *</label>
                    <EntitySelect id="contaBanco" entityName="banco" value={values.bancoId || null} options={bancoOptions} loading={bancosQuery.isFetching} onChange={(value) => update('bancoId', value ?? '')} />
                    <FieldError message={errors.bancoId} />
                </div>
                <div className="field col-8 md:col-3">
                    <label htmlFor="contaAgencia" className="font-medium">Agência *</label>
                    <InputText id="contaAgencia" value={values.agencia} className={invalid('agencia')} onChange={(event) => update('agencia', event.target.value)} />
                    <FieldError message={errors.agencia} />
                </div>
                <div className="field col-4 md:col-3">
                    <label htmlFor="contaAgenciaDv" className="font-medium">DV agência</label>
                    <InputText id="contaAgenciaDv" value={values.agenciaDv ?? ''} onChange={(event) => update('agenciaDv', event.target.value)} />
                </div>
                <div className="field col-8 md:col-3">
                    <label htmlFor="contaNumero" className="font-medium">Conta *</label>
                    <InputText id="contaNumero" value={values.conta} className={invalid('conta')} onChange={(event) => update('conta', event.target.value)} />
                    <FieldError message={errors.conta} />
                </div>
                <div className="field col-4 md:col-3">
                    <label htmlFor="contaDv" className="font-medium">DV conta</label>
                    <InputText id="contaDv" value={values.contaDv ?? ''} onChange={(event) => update('contaDv', event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const initialConvenio = (): ConvenioFormValues => ({ contaBancariaId: '', numeroConvenio: '', cedente: '' });

export const ConvenioDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: ConvenioFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<ConvenioFormValues>(initialConvenio);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const contasQuery = useContasBancarias({}, visible);
    const contaOptions = useMemo<SelectOption<string>[]>(() => (contasQuery.data ?? []).map((conta) => ({ label: `Ag ${conta.agencia} / Cc ${conta.conta}`, value: conta.id })), [contasQuery.data]);

    useEffect(() => {
        if (visible) {
            setValues(initialConvenio());
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof ConvenioFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarConvenioSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Novo convênio" visible={visible} modal style={{ width: 'min(46rem, 96vw)' }} footer={footer('Criar convênio', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-6">
                    <label htmlFor="convConta" className="font-medium">Conta bancária *</label>
                    <EntitySelect id="convConta" entityName="conta" value={values.contaBancariaId || null} options={contaOptions} loading={contasQuery.isFetching} onChange={(value) => update('contaBancariaId', value ?? '')} />
                    <FieldError message={errors.contaBancariaId} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="convNumero" className="font-medium">Nº convênio *</label>
                    <InputText id="convNumero" value={values.numeroConvenio} className={invalid('numeroConvenio')} onChange={(event) => update('numeroConvenio', event.target.value)} />
                    <FieldError message={errors.numeroConvenio} />
                </div>
                <div className="field col-12 md:col-3">
                    <label htmlFor="convCedente" className="font-medium">Cedente</label>
                    <InputText id="convCedente" value={values.cedente ?? ''} onChange={(event) => update('cedente', event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const initialCarteira = (): CarteiraFormValues => ({ convenioBancarioId: '', codigo: '', tipoCobranca: TipoCobranca.SimplesComRegistro });

export const CarteiraDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: CarteiraFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<CarteiraFormValues>(initialCarteira);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const conveniosQuery = useConvenios(visible);
    const convenioOptions = useMemo<SelectOption<string>[]>(() => (conveniosQuery.data ?? []).map((convenio) => ({ label: `${convenio.numeroConvenio}${convenio.cedente ? ` - ${convenio.cedente}` : ''}`, value: convenio.id })), [conveniosQuery.data]);

    useEffect(() => {
        if (visible) {
            setValues(initialCarteira());
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof CarteiraFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarCarteiraSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Nova carteira de cobrança" visible={visible} modal style={{ width: 'min(46rem, 96vw)' }} footer={footer('Criar carteira', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-6">
                    <label htmlFor="cartConvenio" className="font-medium">Convênio *</label>
                    <EntitySelect id="cartConvenio" entityName="convênio" value={values.convenioBancarioId || null} options={convenioOptions} loading={conveniosQuery.isFetching} onChange={(value) => update('convenioBancarioId', value ?? '')} />
                    <FieldError message={errors.convenioBancarioId} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="cartCodigo" className="font-medium">Código *</label>
                    <InputText id="cartCodigo" value={values.codigo} className={invalid('codigo')} onChange={(event) => update('codigo', event.target.value)} />
                    <FieldError message={errors.codigo} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="cartTipo" className="font-medium">Tipo de cobrança *</label>
                    <Dropdown inputId="cartTipo" value={values.tipoCobranca} options={tipoCobrancaOptions} onChange={(event) => update('tipoCobranca', event.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};
