'use client';

// Diálogos locais da fatia Séries fiscais (v1.11.0a8b58, F3.1, D48): sem componente compartilhado novo --
// Criar, Ampliar, Encerrar e Inativar vivem só aqui. Erros de escrita chegam pela prop `error` (mapeada por
// `mapApiError` na página) e são roteados por `Error.Code` (D50): código conhecido vai para o campo
// correspondente; o resto (inclusive `FISCAL_SERIES_VALIDACAO`) vira mensagem geral com o texto do backend.

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { classNames } from 'primereact/utils';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { DateInput } from '@/components/forms/DateInput';
import { useModelosDocumentoFiscal } from '@/features/fiscal/hooks/useModelosDocumentoFiscal';
import { ampliarNumeroFinalSerieFiscalSchema, criarSerieFiscalSchema, encerrarVigenciaSerieFiscalSchema, fromDateOnly, inativarSerieFiscalSchema, toDateOnly } from '@/features/fiscal/schemas/seriesFiscaisSchemas';
import { modeloDocumentoFiscalColunaLabel, SERIE_FISCAL_AMPLIAR_DIALOG, SERIE_FISCAL_CRIAR_DIALOG, SERIE_FISCAL_ENCERRAR_DIALOG, SERIE_FISCAL_INATIVAR_DIALOG, inativarSerieFiscalTitulo } from '@/features/fiscal/components/seriesFiscaisLabels';
import { SerieFiscalResponse } from '@/features/fiscal/types/seriesFiscais.types';
import { ApiError } from '@/types/erp';
import { z } from 'zod';

const buildFieldErrors = (error: z.ZodError) => {
    const map: Record<string, string> = {};
    error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (typeof key === 'string' && !map[key]) map[key] = issue.message;
    });
    return map;
};

const footer = (formId: string, loading: boolean | undefined, onHide: () => void, submitLabel: string) => (
    <div className="flex justify-content-end gap-2">
        <Button type="button" label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} />
        <Button label={submitLabel} icon="pi pi-check" type="submit" form={formId} loading={loading} />
    </div>
);

// AC-9 (D50): código do backend -> campo do formulário de criação. Fora deste mapa (inclusive
// `FISCAL_SERIES_VALIDACAO`) vira mensagem geral, nunca some no vazio.
const CRIAR_SERIE_CAMPO_POR_CODIGO: Record<string, string> = {
    FISCAL_SERIES_JA_EXISTE: 'numero',
    FISCAL_SERIES_MODELO_INATIVO: 'modeloDocumentoFiscalId',
    FISCAL_SERIES_MODELO_NAO_ENCONTRADO: 'modeloDocumentoFiscalId'
};

type CriarSerieFiscalFormValues = {
    empresaId: string;
    filialId: string;
    modeloDocumentoFiscalId: string;
    numero: number | null;
    numeroInicial: number | null;
    numeroFinal: number | null;
    vigenciaInicio: Date | null;
    vigenciaFim: Date | null;
};

const criarInitialValues = (empresaId?: string | null): CriarSerieFiscalFormValues => ({
    empresaId: empresaId ?? '',
    filialId: '',
    modeloDocumentoFiscalId: '',
    numero: null,
    numeroInicial: null,
    numeroFinal: null,
    vigenciaInicio: new Date(),
    vigenciaFim: null
});

export const SerieFiscalCriarDialog = ({
    visible,
    loading,
    empresaId,
    error,
    onHide,
    onSubmit
}: {
    visible: boolean;
    loading?: boolean;
    empresaId?: string | null;
    error?: ApiError | null;
    onHide: () => void;
    onSubmit: (values: unknown) => Promise<void> | void;
}) => {
    const [values, setValues] = useState<CriarSerieFiscalFormValues>(() => criarInitialValues(empresaId));
    const [zodErrors, setZodErrors] = useState<Record<string, string>>({});
    const modelosQuery = useModelosDocumentoFiscal({ ativo: true, tamanhoPagina: 100 }, visible);
    const modeloOptions = (modelosQuery.data?.items ?? []).map((modelo) => ({ label: modeloDocumentoFiscalColunaLabel(modelo.codigo, modelo.descricao), value: modelo.id }));

    useEffect(() => {
        if (visible) {
            setValues(criarInitialValues(empresaId));
            setZodErrors({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, empresaId]);

    const backendCampo = error?.code ? CRIAR_SERIE_CAMPO_POR_CODIGO[error.code] : undefined;
    const mensagemGeral = error && !backendCampo ? error.message : undefined;
    const fieldErrors: Record<string, string | undefined> = { ...zodErrors, ...(backendCampo ? { [backendCampo]: error?.message } : {}) };

    const submeter = (event: React.FormEvent) => {
        event.preventDefault();
        const parsed = criarSerieFiscalSchema.safeParse({
            empresaId: values.empresaId,
            filialId: values.filialId || null,
            modeloDocumentoFiscalId: values.modeloDocumentoFiscalId,
            numero: values.numero,
            numeroInicial: values.numeroInicial,
            numeroFinal: values.numeroFinal,
            vigenciaInicio: values.vigenciaInicio,
            vigenciaFim: values.vigenciaFim
        });
        if (!parsed.success) {
            setZodErrors(buildFieldErrors(parsed.error));
            return;
        }
        setZodErrors({});
        onSubmit(parsed.data);
    };

    return (
        <Dialog header={SERIE_FISCAL_CRIAR_DIALOG.titulo} visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} onHide={onHide} footer={footer('criar-serie-fiscal-form', loading, onHide, SERIE_FISCAL_CRIAR_DIALOG.confirmLabel)}>
            <form id="criar-serie-fiscal-form" className="grid formgrid p-fluid" onSubmit={submeter}>
                {mensagemGeral ? (
                    <div className="field col-12">
                        <Message severity="error" className="w-full" text={mensagemGeral} />
                    </div>
                ) : null}
                <EmpresaFilialFields empresaId={values.empresaId} filialId={values.filialId} onEmpresaChange={(value) => setValues((v) => ({ ...v, empresaId: value ?? '' }))} onFilialChange={(value) => setValues((v) => ({ ...v, filialId: value ?? '' }))} />
                {!values.filialId ? (
                    <div className="field col-12">
                        <Message severity="info" className="w-full" text={SERIE_FISCAL_CRIAR_DIALOG.filialVaziaAviso} />
                    </div>
                ) : null}
                <div className="field col-12 md:col-6">
                    <label className="font-medium block mb-2">{SERIE_FISCAL_CRIAR_DIALOG.campoModelo}</label>
                    <EntitySelect entityName="modelo de documento fiscal" value={values.modeloDocumentoFiscalId || null} options={modeloOptions} loading={modelosQuery.isFetching} onChange={(value) => setValues((v) => ({ ...v, modeloDocumentoFiscalId: value ?? '' }))} />
                    <small className="text-color-secondary block mt-1 line-height-3">{SERIE_FISCAL_CRIAR_DIALOG.modeloHint}</small>
                    <FieldError message={fieldErrors.modeloDocumentoFiscalId} />
                </div>
                <div className="field col-12 md:col-6">
                    <label className="font-medium block mb-2">{SERIE_FISCAL_CRIAR_DIALOG.campoNumero}</label>
                    <InputNumber value={values.numero} className={classNames({ 'p-invalid': fieldErrors.numero })} min={0} max={999} onValueChange={(event) => setValues((v) => ({ ...v, numero: event.value ?? null }))} />
                    <small className="text-color-secondary block mt-1 line-height-3">{SERIE_FISCAL_CRIAR_DIALOG.numeroHint}</small>
                    <FieldError message={fieldErrors.numero} />
                </div>
                <div className="field col-12 md:col-6">
                    <label className="font-medium block mb-2">{SERIE_FISCAL_CRIAR_DIALOG.campoNumeroInicial}</label>
                    <InputNumber value={values.numeroInicial} className={classNames({ 'p-invalid': fieldErrors.numeroInicial })} min={1} onValueChange={(event) => setValues((v) => ({ ...v, numeroInicial: event.value ?? null }))} />
                    <FieldError message={fieldErrors.numeroInicial} />
                </div>
                <div className="field col-12 md:col-6">
                    <label className="font-medium block mb-2">{SERIE_FISCAL_CRIAR_DIALOG.campoNumeroFinal}</label>
                    <InputNumber value={values.numeroFinal} className={classNames({ 'p-invalid': fieldErrors.numeroFinal })} min={1} onValueChange={(event) => setValues((v) => ({ ...v, numeroFinal: event.value ?? null }))} />
                    <small className="text-color-secondary block mt-1 line-height-3">{SERIE_FISCAL_CRIAR_DIALOG.numeroFinalHint}</small>
                    <FieldError message={fieldErrors.numeroFinal} />
                </div>
                <div className="field col-12 md:col-6">
                    <label className="font-medium block mb-2">{SERIE_FISCAL_CRIAR_DIALOG.campoVigenciaInicio}</label>
                    <DateInput value={values.vigenciaInicio} onChange={(value) => setValues((v) => ({ ...v, vigenciaInicio: value }))} />
                    <FieldError message={fieldErrors.vigenciaInicio} />
                </div>
                <div className="field col-12 md:col-6">
                    <label className="font-medium block mb-2">{SERIE_FISCAL_CRIAR_DIALOG.campoVigenciaFim}</label>
                    <DateInput value={values.vigenciaFim} onChange={(value) => setValues((v) => ({ ...v, vigenciaFim: value }))} />
                    <small className="text-color-secondary block mt-1 line-height-3">{SERIE_FISCAL_CRIAR_DIALOG.vigenciaFimHint}</small>
                    <FieldError message={fieldErrors.vigenciaFim} />
                </div>
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const SerieFiscalAmpliarDialog = ({ visible, loading, serie, error, onHide, onSubmit }: { visible: boolean; loading?: boolean; serie: SerieFiscalResponse | null; error?: ApiError | null; onHide: () => void; onSubmit: (novoNumeroFinal: number) => Promise<void> | void }) => {
    const [novoNumeroFinal, setNovoNumeroFinal] = useState<number | null>(null);
    const [zodError, setZodError] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (visible) {
            setNovoNumeroFinal(serie?.numeroFinal ?? null);
            setZodError(undefined);
        }
    }, [visible, serie]);

    if (!serie) return null;

    const mensagem = zodError ?? error?.message;

    const submeter = (event: React.FormEvent) => {
        event.preventDefault();
        const parsed = ampliarNumeroFinalSerieFiscalSchema(serie.numeroFinal).safeParse({ novoNumeroFinal });
        if (!parsed.success) {
            setZodError(parsed.error.issues[0]?.message);
            return;
        }
        setZodError(undefined);
        onSubmit(parsed.data.novoNumeroFinal);
    };

    return (
        <Dialog header={SERIE_FISCAL_AMPLIAR_DIALOG.titulo} visible={visible} modal style={{ width: 'min(36rem, 96vw)' }} onHide={onHide} footer={footer('ampliar-serie-fiscal-form', loading, onHide, SERIE_FISCAL_AMPLIAR_DIALOG.confirmLabel)}>
            <form id="ampliar-serie-fiscal-form" className="grid formgrid p-fluid" onSubmit={submeter}>
                {mensagem ? (
                    <div className="field col-12">
                        <Message severity="error" className="w-full" text={mensagem} />
                    </div>
                ) : null}
                <div className="field col-12 md:col-6">
                    <label className="font-medium block mb-2">{SERIE_FISCAL_AMPLIAR_DIALOG.numeroFinalAtualLabel}</label>
                    <InputNumber value={serie.numeroFinal} disabled />
                </div>
                <div className="field col-12 md:col-6">
                    <label className="font-medium block mb-2">{SERIE_FISCAL_AMPLIAR_DIALOG.proximoNumeroLabel}</label>
                    <InputNumber value={serie.proximoNumero} disabled />
                </div>
                <div className="field col-12">
                    <label className="font-medium block mb-2">{SERIE_FISCAL_AMPLIAR_DIALOG.campoNovoNumeroFinal}</label>
                    <InputNumber value={novoNumeroFinal} min={serie.numeroFinal} onValueChange={(event) => setNovoNumeroFinal(event.value ?? null)} />
                    <small className="text-color-secondary block mt-1 line-height-3">{SERIE_FISCAL_AMPLIAR_DIALOG.novoNumeroFinalHint}</small>
                </div>
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const SerieFiscalEncerrarDialog = ({ visible, loading, serie, error, onHide, onSubmit }: { visible: boolean; loading?: boolean; serie: SerieFiscalResponse | null; error?: ApiError | null; onHide: () => void; onSubmit: (vigenciaFim: string) => Promise<void> | void }) => {
    const [vigenciaFim, setVigenciaFim] = useState<Date | null>(null);
    const [zodError, setZodError] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (visible) {
            setVigenciaFim(fromDateOnly(serie?.vigenciaFim) ?? new Date());
            setZodError(undefined);
        }
    }, [visible, serie]);

    if (!serie) return null;

    const dataAnteriorAHoje = vigenciaFim ? toDateOnly(vigenciaFim) < toDateOnly(new Date()) : false;
    const mensagem = zodError ?? (error ? error.message : undefined);

    const submeter = (event: React.FormEvent) => {
        event.preventDefault();
        const parsed = encerrarVigenciaSerieFiscalSchema(serie.vigenciaInicio).safeParse({ vigenciaFim });
        if (!parsed.success) {
            setZodError(parsed.error.issues[0]?.message);
            return;
        }
        setZodError(undefined);
        onSubmit(parsed.data.vigenciaFim);
    };

    return (
        <Dialog header={SERIE_FISCAL_ENCERRAR_DIALOG.titulo} visible={visible} modal style={{ width: 'min(36rem, 96vw)' }} onHide={onHide} footer={footer('encerrar-serie-fiscal-form', loading, onHide, SERIE_FISCAL_ENCERRAR_DIALOG.confirmLabel)}>
            <form id="encerrar-serie-fiscal-form" className="grid formgrid p-fluid" onSubmit={submeter}>
                {mensagem ? (
                    <div className="field col-12">
                        <Message severity="error" className="w-full" text={mensagem} />
                    </div>
                ) : null}
                <div className="field col-12">
                    <Message severity="info" className="w-full" text={SERIE_FISCAL_ENCERRAR_DIALOG.dataRedefinivelAviso} />
                </div>
                <div className="field col-12">
                    <label className="font-medium block mb-2">{SERIE_FISCAL_ENCERRAR_DIALOG.campoVigenciaFim}</label>
                    <DateInput value={vigenciaFim} onChange={setVigenciaFim} />
                </div>
                {dataAnteriorAHoje ? (
                    <div className="field col-12">
                        <Message severity="warn" className="w-full" text={SERIE_FISCAL_ENCERRAR_DIALOG.dataAnteriorAHojeAviso} />
                    </div>
                ) : null}
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

// D48: inativar reaproveita o padrão do `ReasonDialog` (motivo obrigatório, confirmação, mesmo rótulo de
// footer), mas precisa exibir `avisoDefinitivo` acima do motivo -- capacidade que `components/feedback/
// ReasonDialog.tsx` não expõe hoje. Fora da fronteira desta fatia editar `components/**`, então este diálogo
// fica local em vez de estender o componente compartilhado.
export const SerieFiscalInativarDialog = ({ visible, loading, serie, error, onHide, onSubmit }: { visible: boolean; loading?: boolean; serie: SerieFiscalResponse | null; error?: ApiError | null; onHide: () => void; onSubmit: (motivo: string) => Promise<void> | void }) => {
    const [motivo, setMotivo] = useState('');
    const [zodError, setZodError] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (visible) {
            setMotivo('');
            setZodError(undefined);
        }
    }, [visible]);

    if (!serie) return null;

    const mensagem = zodError ?? error?.message;

    const confirmar = () => {
        const parsed = inativarSerieFiscalSchema.safeParse({ motivo });
        if (!parsed.success) {
            setZodError(parsed.error.issues[0]?.message);
            return;
        }
        setZodError(undefined);
        onSubmit(parsed.data.motivo);
    };

    return (
        <Dialog
            header={inativarSerieFiscalTitulo(serie.numero)}
            visible={visible}
            modal
            style={{ width: 'min(32rem, 96vw)' }}
            onHide={onHide}
            footer={
                <div className="flex justify-content-end gap-2">
                    <Button type="button" label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} />
                    <Button label={SERIE_FISCAL_INATIVAR_DIALOG.confirmLabel} icon="pi pi-check" onClick={confirmar} disabled={!motivo.trim()} loading={loading} />
                </div>
            }
        >
            {mensagem ? <Message severity="error" className="w-full mb-3" text={mensagem} /> : null}
            <Message severity="warn" className="w-full mb-3" text={SERIE_FISCAL_INATIVAR_DIALOG.avisoDefinitivo} />
            <label htmlFor="motivoInativarSerie" className="block font-medium mb-2">
                Motivo obrigatório
            </label>
            <InputTextarea id="motivoInativarSerie" value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={5} maxLength={464} className="w-full" autoFocus />
            <small className="text-color-secondary block mt-2">O motivo será enviado para auditoria e histórico da operação.</small>
        </Dialog>
    );
};
