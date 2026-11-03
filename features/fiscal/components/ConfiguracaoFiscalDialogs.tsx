'use client';

// Diálogos da fatia Configuração fiscal e certificados (v1.11.0a8b81, D112): motivo (inativar/reativar empresa e
// inativar certificado), cadastro de certificado e resultado da verificação. Padrão de `SerieFiscalDialogs.tsx`.
//
// Segredo (AC-6): o thumbprint vive SÓ no estado deste formulário. Ele é zerado quando o diálogo fecha (inclusive
// após salvar, porque a página fecha o diálogo no sucesso) e nada daqui sobe para cache ou para a página além do
// payload da própria submissão.

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { DateTimeInput } from '@/components/forms/DateTimeInput';
import { FieldError } from '@/components/forms/FieldError';
import { APELIDO_CERTIFICADO_MAX, cadastrarCertificadoDigitalSchema, MOTIVO_CONFIGURACAO_MAX, motivoConfiguracaoFiscalSchema, OBSERVACAO_CONFIGURACAO_MAX } from '@/features/fiscal/schemas/configuracaoFiscalSchemas';
import { CERTIFICADO_CADASTRAR_DIALOG, CERTIFICADOS_DIGITAIS, MOTIVO_DIALOG, TIPO_CERTIFICADO_OPTIONS, mensagemErroConfiguracaoFiscal } from '@/features/fiscal/components/configuracaoFiscalLabels';
import { TIPO_CERTIFICADO_DIGITAL, TipoCertificadoDigital, VerificarCertificadoDigitalResponse } from '@/features/fiscal/types/configuracaoFiscal.types';
import { ApiError, SelectOption } from '@/types/erp';
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

// ---------------------------------------------------------------------------------------------
// Motivo obrigatório (inativar e reativar empresa; inativar certificado)
// ---------------------------------------------------------------------------------------------

type MotivoDialogProps = {
    visible: boolean;
    title: string;
    confirmLabel: string;
    warning?: string;
    loading?: boolean;
    error?: ApiError | null;
    onHide: () => void;
    onSubmit: (motivo: string) => Promise<void> | void;
};

export const ConfiguracaoFiscalMotivoDialog = ({ visible, title, confirmLabel, warning, loading, error, onHide, onSubmit }: MotivoDialogProps) => {
    const [motivo, setMotivo] = useState('');
    const [zodError, setZodError] = useState<string | undefined>(undefined);

    useEffect(() => {
        setMotivo('');
        setZodError(undefined);
    }, [visible]);

    const mensagem = zodError ?? mensagemErroConfiguracaoFiscal(error);

    const confirmar = () => {
        const parsed = motivoConfiguracaoFiscalSchema.safeParse({ motivo });
        if (!parsed.success) {
            setZodError(parsed.error.issues[0]?.message);
            return;
        }
        setZodError(undefined);
        onSubmit(parsed.data.motivo);
    };

    return (
        <Dialog
            header={title}
            visible={visible}
            modal
            style={{ width: 'min(32rem, 96vw)' }}
            onHide={onHide}
            footer={
                <div className="flex justify-content-end gap-2">
                    <Button type="button" label={MOTIVO_DIALOG.cancelar} icon="pi pi-times" text onClick={onHide} disabled={loading} />
                    <Button label={confirmLabel} icon="pi pi-check" onClick={confirmar} disabled={!motivo.trim()} loading={loading} />
                </div>
            }
        >
            {mensagem ? <Message severity="error" className="w-full mb-3" text={mensagem} /> : null}
            {warning ? <Message severity="warn" className="w-full mb-3" text={warning} /> : null}
            <label htmlFor="configuracao-fiscal-motivo" className="block font-medium mb-2">
                {MOTIVO_DIALOG.campo}
            </label>
            <InputTextarea id="configuracao-fiscal-motivo" value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={5} maxLength={MOTIVO_CONFIGURACAO_MAX} className="w-full" autoFocus />
            <small className="text-color-secondary block mt-2">{MOTIVO_DIALOG.hint}</small>
        </Dialog>
    );
};

// ---------------------------------------------------------------------------------------------
// Cadastro de certificado
// ---------------------------------------------------------------------------------------------

type CadastrarFormValues = {
    apelido: string;
    tipo: TipoCertificadoDigital;
    thumbprint: string;
    validoAte: Date | null;
    filialId: string;
    observacao: string;
};

const cadastrarInitialValues = (): CadastrarFormValues => ({
    apelido: '',
    tipo: TIPO_CERTIFICADO_DIGITAL.a1,
    thumbprint: '',
    validoAte: null,
    filialId: '',
    observacao: ''
});

const CAMPO_POR_CODIGO: Record<string, string> = {
    'Fiscal.Configuracao.ThumbprintJaCadastrado': 'thumbprint',
    'Fiscal.Configuracao.CertificadoVencido': 'validoAte'
};

export const CertificadoCadastrarDialog = ({
    visible,
    loading,
    error,
    filialOptions,
    filialLoading,
    filialIndisponivel,
    onHide,
    onSubmit
}: {
    visible: boolean;
    loading?: boolean;
    error?: ApiError | null;
    filialOptions: SelectOption<string>[];
    filialLoading?: boolean;
    /** Motivo pelo qual a escolha de filial não está disponível (o campo fica desabilitado e o texto aparece). */
    filialIndisponivel?: string;
    onHide: () => void;
    onSubmit: (values: unknown) => Promise<void> | void;
}) => {
    const [values, setValues] = useState<CadastrarFormValues>(cadastrarInitialValues);
    const [zodErrors, setZodErrors] = useState<Record<string, string>>({});

    // Zera ao abrir E ao fechar (AC-6): o thumbprint não sobrevive ao diálogo.
    useEffect(() => {
        setValues(cadastrarInitialValues());
        setZodErrors({});
    }, [visible]);

    const campoDoErro = error?.code ? CAMPO_POR_CODIGO[error.code] : undefined;
    const mensagemErro = mensagemErroConfiguracaoFiscal(error);
    const mensagemGeral = error && !campoDoErro ? mensagemErro : undefined;
    const fieldErrors: Record<string, string | undefined> = { ...zodErrors, ...(campoDoErro ? { [campoDoErro]: mensagemErro } : {}) };

    const submeter = (event: React.FormEvent) => {
        event.preventDefault();
        const parsed = cadastrarCertificadoDigitalSchema.safeParse({
            apelido: values.apelido,
            tipo: values.tipo,
            thumbprint: values.thumbprint,
            validoAte: values.validoAte,
            filialId: values.filialId || null,
            observacao: values.observacao
        });
        if (!parsed.success) {
            setZodErrors(buildFieldErrors(parsed.error));
            return;
        }
        setZodErrors({});
        onSubmit(parsed.data);
    };

    return (
        <Dialog header={CERTIFICADO_CADASTRAR_DIALOG.titulo} visible={visible} modal style={{ width: 'min(44rem, 96vw)' }} onHide={onHide} footer={footer('cadastrar-certificado-form', loading, onHide, CERTIFICADO_CADASTRAR_DIALOG.confirmLabel)}>
            <form id="cadastrar-certificado-form" className="grid formgrid p-fluid" onSubmit={submeter} autoComplete="off">
                {mensagemGeral ? (
                    <div className="field col-12">
                        <Message severity="error" className="w-full" text={mensagemGeral} />
                    </div>
                ) : null}
                <div className="field col-12">
                    <Message severity="info" className="w-full" text={CERTIFICADO_CADASTRAR_DIALOG.semUpload} />
                </div>
                <div className="field col-12 md:col-8">
                    <label htmlFor="certificado-apelido" className="font-medium block mb-2">{CERTIFICADO_CADASTRAR_DIALOG.apelido}</label>
                    <InputText id="certificado-apelido" value={values.apelido} maxLength={APELIDO_CERTIFICADO_MAX} className={fieldErrors.apelido ? 'p-invalid' : undefined} onChange={(event) => setValues((v) => ({ ...v, apelido: event.target.value }))} />
                    <FieldError message={fieldErrors.apelido} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="certificado-tipo" className="font-medium block mb-2">{CERTIFICADO_CADASTRAR_DIALOG.tipo}</label>
                    <Dropdown inputId="certificado-tipo" ariaLabel={CERTIFICADO_CADASTRAR_DIALOG.tipo} value={values.tipo} options={TIPO_CERTIFICADO_OPTIONS} onChange={(event) => setValues((v) => ({ ...v, tipo: event.value as TipoCertificadoDigital }))} />
                    <FieldError message={fieldErrors.tipo} />
                </div>
                <div className="field col-12">
                    <label htmlFor="certificado-thumbprint" className="font-medium block mb-2">{CERTIFICADO_CADASTRAR_DIALOG.thumbprint}</label>
                    <InputText id="certificado-thumbprint" value={values.thumbprint} autoComplete="off" spellCheck={false} className={fieldErrors.thumbprint ? 'p-invalid' : undefined} onChange={(event) => setValues((v) => ({ ...v, thumbprint: event.target.value }))} />
                    <small className="text-color-secondary block mt-1 line-height-3">{CERTIFICADO_CADASTRAR_DIALOG.thumbprintHint}</small>
                    <FieldError message={fieldErrors.thumbprint} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="certificado-valido-ate" className="font-medium block mb-2">{CERTIFICADO_CADASTRAR_DIALOG.validoAte}</label>
                    <DateTimeInput id="certificado-valido-ate" ariaLabel={CERTIFICADO_CADASTRAR_DIALOG.validoAte} value={values.validoAte} onChange={(value) => setValues((v) => ({ ...v, validoAte: value }))} />
                    <FieldError message={fieldErrors.validoAte} />
                </div>
                <div className="field col-12 md:col-6">
                    <label className="font-medium block mb-2">{CERTIFICADO_CADASTRAR_DIALOG.filial}</label>
                    <EntitySelect ariaLabel={CERTIFICADO_CADASTRAR_DIALOG.filial} entityName="filial" value={values.filialId || null} options={filialOptions} loading={filialLoading} disabled={Boolean(filialIndisponivel)} onChange={(value) => setValues((v) => ({ ...v, filialId: value ?? '' }))} />
                    {filialIndisponivel ? <small className="text-color-secondary block mt-1 line-height-3">{filialIndisponivel}</small> : null}
                    <FieldError message={fieldErrors.filialId} />
                </div>
                <div className="field col-12">
                    <label htmlFor="certificado-observacao" className="font-medium block mb-2">{CERTIFICADO_CADASTRAR_DIALOG.observacao}</label>
                    <InputTextarea id="certificado-observacao" value={values.observacao} rows={3} maxLength={OBSERVACAO_CONFIGURACAO_MAX} onChange={(event) => setValues((v) => ({ ...v, observacao: event.target.value }))} />
                    <FieldError message={fieldErrors.observacao} />
                </div>
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

// ---------------------------------------------------------------------------------------------
// Resultado de Verificar
// ---------------------------------------------------------------------------------------------

export const CertificadoVerificarDialog = ({
    visible,
    apelido,
    resultado,
    sefazSimulada,
    onHide
}: {
    visible: boolean;
    apelido?: string;
    resultado: VerificarCertificadoDigitalResponse | null;
    sefazSimulada: boolean;
    onHide: () => void;
}) => (
    <Dialog header={`${CERTIFICADOS_DIGITAIS.verificarTitulo}${apelido ? `: ${apelido}` : ''}`} visible={visible} modal style={{ width: 'min(32rem, 96vw)' }} onHide={onHide} footer={<Button type="button" label="Fechar" icon="pi pi-times" text onClick={onHide} />}>
        {resultado ? (
            <>
                <Message severity={resultado.disponivel ? 'success' : 'warn'} className="w-full mb-3" text={resultado.disponivel ? CERTIFICADOS_DIGITAIS.verificarDisponivel : CERTIFICADOS_DIGITAIS.verificarIndisponivel} />
                {resultado.motivo ? <p className="mt-0 line-height-3">{resultado.motivo}</p> : null}
                {sefazSimulada ? <Message severity="info" className="w-full" text={CERTIFICADOS_DIGITAIS.avisoSefazSimulada} /> : null}
            </>
        ) : null}
    </Dialog>
);
