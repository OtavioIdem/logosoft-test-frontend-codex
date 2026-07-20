'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { DateInput } from '@/components/forms/DateInput';
import { criarPreAutorizacaoSchema, registrarEntradaSchema, registrarOcorrenciaSchema } from '@/features/portaria/schemas/portariaSchemas';
import { usePreAutorizacoes } from '@/features/portaria/hooks/usePortariaResources';
import {
    GravidadeOcorrencia,
    OcorrenciaFormValues,
    PreAutorizacaoFormValues,
    RegistrarEntradaFormValues,
    RegistrarSaidaFormValues,
    StatusPreAutorizacao,
    TipoAcesso,
    TipoDocumentoAcesso,
    TipoOcorrenciaAcesso,
    ValidarDocumentoFormValues
} from '@/features/portaria/types/portaria.types';
import { gravidadeOptions, tipoAcessoOptions, tipoDocumentoOptions, tipoOcorrenciaOptions } from '@/features/portaria/components/portariaLabels';

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

const initialPreAutorizacao = (): PreAutorizacaoFormValues => ({ empresaId: '', filialId: null, nomeVisitante: '', documentoTipo: TipoDocumentoAcesso.Rg, documentoNumero: '', tipoAcesso: TipoAcesso.Visitante, destino: '', validadeInicio: null, validadeFim: null, placaVeiculo: '', motivo: '' });

export const PreAutorizacaoDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: PreAutorizacaoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<PreAutorizacaoFormValues>(initialPreAutorizacao);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialPreAutorizacao());
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof PreAutorizacaoFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarPreAutorizacaoSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Nova pré-autorização" visible={visible} modal style={{ width: 'min(56rem, 98vw)' }} footer={footer('Pré-autorizar', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-6">
                    <label htmlFor="paNome" className="font-medium">Visitante *</label>
                    <InputText id="paNome" value={values.nomeVisitante} className={invalid('nomeVisitante')} onChange={(event) => update('nomeVisitante', event.target.value)} />
                    <FieldError message={errors.nomeVisitante} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="paDocTipo" className="font-medium">Tipo doc. *</label>
                    <Dropdown inputId="paDocTipo" value={values.documentoTipo} options={tipoDocumentoOptions} onChange={(event) => update('documentoTipo', event.value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="paDocNumero" className="font-medium">Nº documento *</label>
                    <InputText id="paDocNumero" value={values.documentoNumero} className={invalid('documentoNumero')} onChange={(event) => update('documentoNumero', event.target.value)} />
                    <FieldError message={errors.documentoNumero} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="paTipoAcesso" className="font-medium">Tipo acesso *</label>
                    <Dropdown inputId="paTipoAcesso" value={values.tipoAcesso} options={tipoAcessoOptions} onChange={(event) => update('tipoAcesso', event.value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="paPlaca" className="font-medium">Placa</label>
                    <InputText id="paPlaca" value={values.placaVeiculo ?? ''} onChange={(event) => update('placaVeiculo', event.target.value.toUpperCase())} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="paDestino" className="font-medium">Destino *</label>
                    <InputText id="paDestino" value={values.destino} className={invalid('destino')} onChange={(event) => update('destino', event.target.value)} />
                    <FieldError message={errors.destino} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="paValidadeInicio" className="font-medium">Validade — início *</label>
                    <DateInput id="paValidadeInicio" value={values.validadeInicio ?? null} onChange={(value) => update('validadeInicio', value)} />
                    <FieldError message={errors.validadeInicio} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="paValidadeFim" className="font-medium">Validade — fim *</label>
                    <DateInput id="paValidadeFim" value={values.validadeFim ?? null} onChange={(value) => update('validadeFim', value)} />
                    <FieldError message={errors.validadeFim} />
                </div>
                <div className="field col-12">
                    <label htmlFor="paMotivo" className="font-medium">Motivo</label>
                    <InputTextarea id="paMotivo" value={values.motivo ?? ''} rows={2} autoResize onChange={(event) => update('motivo', event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const initialEntrada = (): RegistrarEntradaFormValues => ({ empresaId: '', filialId: null, preAutorizacaoId: null, nomeVisitante: '', documentoTipo: TipoDocumentoAcesso.Rg, documentoNumero: '', tipoAcesso: TipoAcesso.Visitante, destino: '', motivo: '', placaVeiculo: '', dataEntrada: null });

export const RegistrarEntradaDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: RegistrarEntradaFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<RegistrarEntradaFormValues>(initialEntrada);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialEntrada());
            setErrors({});
        }
    }, [visible]);

    const preAutorizacoesQuery = usePreAutorizacoes({ empresaId: values.empresaId || null, filialId: values.filialId || null, status: StatusPreAutorizacao.Ativa }, Boolean(values.empresaId));
    const preAutorizacaoOptions = useMemo(() => (preAutorizacoesQuery.data ?? []).map((item) => ({ label: `${item.nomeVisitante} — ${item.destino}`, value: item.id })), [preAutorizacoesQuery.data]);

    const update = (name: keyof RegistrarEntradaFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const selecionarPreAutorizacao = (id: string | null) => {
        const selecionada = (preAutorizacoesQuery.data ?? []).find((item) => item.id === id);
        setValues((current) => ({
            ...current,
            preAutorizacaoId: id,
            nomeVisitante: selecionada?.nomeVisitante ?? current.nomeVisitante,
            documentoTipo: selecionada?.documentoTipo ?? current.documentoTipo,
            documentoNumero: selecionada?.documentoNumero ?? current.documentoNumero,
            tipoAcesso: selecionada?.tipoAcesso ?? current.tipoAcesso,
            destino: selecionada?.destino ?? current.destino,
            placaVeiculo: selecionada?.placaVeiculo ?? current.placaVeiculo
        }));
        setErrors({});
    };

    const submit = async () => {
        const parsed = registrarEntradaSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Registrar entrada" visible={visible} modal style={{ width: 'min(56rem, 98vw)' }} footer={footer('Registrar entrada', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12">
                    <label htmlFor="rePreAut" className="font-medium">Pré-autorização (opcional)</label>
                    <EntitySelect id="rePreAut" entityName="pré-autorização" value={values.preAutorizacaoId ?? null} options={preAutorizacaoOptions} loading={preAutorizacoesQuery.isFetching} onChange={selecionarPreAutorizacao} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="reNome" className="font-medium">Visitante *</label>
                    <InputText id="reNome" value={values.nomeVisitante} className={invalid('nomeVisitante')} onChange={(event) => update('nomeVisitante', event.target.value)} />
                    <FieldError message={errors.nomeVisitante} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="reDocTipo" className="font-medium">Tipo doc. *</label>
                    <Dropdown inputId="reDocTipo" value={values.documentoTipo} options={tipoDocumentoOptions} onChange={(event) => update('documentoTipo', event.value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="reDocNumero" className="font-medium">Nº documento *</label>
                    <InputText id="reDocNumero" value={values.documentoNumero} className={invalid('documentoNumero')} onChange={(event) => update('documentoNumero', event.target.value)} />
                    <FieldError message={errors.documentoNumero} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="reTipoAcesso" className="font-medium">Tipo acesso *</label>
                    <Dropdown inputId="reTipoAcesso" value={values.tipoAcesso} options={tipoAcessoOptions} onChange={(event) => update('tipoAcesso', event.value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="rePlaca" className="font-medium">Placa</label>
                    <InputText id="rePlaca" value={values.placaVeiculo ?? ''} onChange={(event) => update('placaVeiculo', event.target.value.toUpperCase())} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="reDestino" className="font-medium">Destino *</label>
                    <InputText id="reDestino" value={values.destino} className={invalid('destino')} onChange={(event) => update('destino', event.target.value)} />
                    <FieldError message={errors.destino} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="reDataEntrada" className="font-medium">Data de entrada</label>
                    <DateInput id="reDataEntrada" value={values.dataEntrada ?? null} onChange={(value) => update('dataEntrada', value)} />
                </div>
                <div className="field col-12">
                    <label htmlFor="reMotivo" className="font-medium">Motivo</label>
                    <InputTextarea id="reMotivo" value={values.motivo ?? ''} rows={2} autoResize onChange={(event) => update('motivo', event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const ValidarDocumentoDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: ValidarDocumentoFormValues) => Promise<void> }) => {
    const [observacao, setObservacao] = useState('');

    useEffect(() => {
        if (visible) setObservacao('');
    }, [visible]);

    const footerAcoes = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Fechar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Recusar" icon="pi pi-ban" severity="danger" outlined loading={loading} onClick={() => onSubmit({ aprovado: false, observacao: observacao.trim() || null })} />
            <Button type="button" label="Aprovar" icon="pi pi-check" severity="success" loading={loading} onClick={() => onSubmit({ aprovado: true, observacao: observacao.trim() || null })} />
        </div>
    );

    return (
        <Dialog header="Validar documento" visible={visible} modal style={{ width: 'min(36rem, 96vw)' }} footer={footerAcoes} onHide={onHide}>
            <p className="text-color-secondary mt-0">Aprovar libera a permanência do visitante; recusar registra acesso negado.</p>
            <div className="field">
                <label htmlFor="vdObservacao" className="font-medium">Observação</label>
                <InputTextarea id="vdObservacao" className="w-full" value={observacao} rows={3} autoResize onChange={(event) => setObservacao(event.target.value)} />
            </div>
        </Dialog>
    );
};

export const SaidaDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: RegistrarSaidaFormValues) => Promise<void> }) => {
    const [dataSaida, setDataSaida] = useState<Date | null>(null);
    const [observacao, setObservacao] = useState('');

    useEffect(() => {
        if (visible) {
            setDataSaida(null);
            setObservacao('');
        }
    }, [visible]);

    return (
        <Dialog header="Registrar saída" visible={visible} modal style={{ width: 'min(38rem, 96vw)' }} footer={footer('Registrar saída', loading, onHide, () => onSubmit({ dataSaida, observacao: observacao.trim() || null }))} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-6">
                    <label htmlFor="saidaData" className="font-medium">Data de saída</label>
                    <DateInput id="saidaData" value={dataSaida} onChange={setDataSaida} />
                </div>
                <div className="field col-12">
                    <label htmlFor="saidaObservacao" className="font-medium">Observação</label>
                    <InputTextarea id="saidaObservacao" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const initialOcorrencia = (empresaId: string, filialId: string | null): OcorrenciaFormValues => ({ empresaId, filialId, registroAcessoId: null, tipo: TipoOcorrenciaAcesso.Seguranca, gravidade: GravidadeOcorrencia.Media, descricao: '' });

export const OcorrenciaDialog = ({ visible, loading, empresaId, filialId, registroOptions, onHide, onSubmit }: { visible: boolean; loading?: boolean; empresaId: string; filialId: string | null; registroOptions: { label: string; value: string }[]; onHide: () => void; onSubmit: (values: OcorrenciaFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<OcorrenciaFormValues>(() => initialOcorrencia(empresaId, filialId));
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialOcorrencia(empresaId, filialId));
            setErrors({});
        }
    }, [visible, empresaId, filialId]);

    const update = (name: keyof OcorrenciaFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = registrarOcorrenciaSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    return (
        <Dialog header="Registrar ocorrência" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} footer={footer('Registrar', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12">
                    <label htmlFor="ocRegistro" className="font-medium">Registro de acesso (opcional)</label>
                    <EntitySelect id="ocRegistro" entityName="registro" value={values.registroAcessoId ?? null} options={registroOptions} onChange={(value) => update('registroAcessoId', value)} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="ocTipo" className="font-medium">Tipo *</label>
                    <Dropdown inputId="ocTipo" value={values.tipo} options={tipoOcorrenciaOptions} onChange={(event) => update('tipo', event.value)} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="ocGravidade" className="font-medium">Gravidade *</label>
                    <Dropdown inputId="ocGravidade" value={values.gravidade} options={gravidadeOptions} onChange={(event) => update('gravidade', event.value)} />
                </div>
                <div className="field col-12">
                    <label htmlFor="ocDescricao" className="font-medium">Descrição *</label>
                    <InputTextarea id="ocDescricao" value={values.descricao} rows={3} autoResize className={classNames({ 'p-invalid': errors.descricao })} onChange={(event) => update('descricao', event.target.value)} />
                    <FieldError message={errors.descricao} />
                </div>
            </FormGrid>
        </Dialog>
    );
};
