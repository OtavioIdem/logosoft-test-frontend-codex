'use client';

// Aba "Empresa" da Configuração de emissão (v1.11.0a8b81, D112). 404 de empresa = "ainda não configurada" (estado,
// não erro; o client devolve `null`): o formulário abre vazio e o PUT é upsert. Inativar e reativar exigem motivo.

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError } from '@/types/erp';
import { ConfiguracaoFiscalMotivoDialog } from '@/features/fiscal/components/ConfiguracaoFiscalDialogs';
import { AMBIENTE_FISCAL_OPTIONS, CONFIGURACAO_FISCAL_EMPRESA, CONFIGURACAO_FISCAL_PERMISSAO, EMPRESA_INATIVAR_DIALOG, EMPRESA_REATIVAR_DIALOG, erroConfiguracaoFiscalParaPainel } from '@/features/fiscal/components/configuracaoFiscalLabels';
import { opcoesCertificado } from '@/features/fiscal/components/configuracaoFiscalUtils';
import { OBSERVACAO_CONFIGURACAO_MAX } from '@/features/fiscal/schemas/configuracaoFiscalSchemas';
import { useConfiguracaoFiscalMutations, useCertificadosDigitais, useConfiguracaoFiscalEmpresa, ConfiguracaoFiscalEscopo } from '@/features/fiscal/hooks/useConfiguracaoFiscal';
import { ConfiguracaoFiscalEmpresaResponse, TIPO_AMBIENTE_FISCAL, TipoAmbienteFiscal } from '@/features/fiscal/types/configuracaoFiscal.types';

type EmpresaFormValues = {
    ambiente: TipoAmbienteFiscal;
    emitirNFe: boolean;
    emitirNFCe: boolean;
    emitirNFSe: boolean;
    certificadoDigitalId: string | null;
    observacao: string;
};

const formVazio = (): EmpresaFormValues => ({ ambiente: TIPO_AMBIENTE_FISCAL.homologacao, emitirNFe: false, emitirNFCe: false, emitirNFSe: false, certificadoDigitalId: null, observacao: '' });

const formDe = (config: ConfiguracaoFiscalEmpresaResponse | null | undefined): EmpresaFormValues =>
    config
        ? { ambiente: config.ambiente, emitirNFe: config.emitirNFe, emitirNFCe: config.emitirNFCe, emitirNFSe: config.emitirNFSe, certificadoDigitalId: config.certificadoDigitalId ?? null, observacao: config.observacao ?? '' }
        : formVazio();

type DialogAcao = 'inativar' | 'reativar' | null;

export const ConfiguracaoFiscalEmpresaTab = ({ escopo, podeConsultar, podeGerenciar }: { escopo: ConfiguracaoFiscalEscopo; podeConsultar: boolean; podeGerenciar: boolean }) => {
    const toast = useAppToast();
    const empresaQuery = useConfiguracaoFiscalEmpresa(escopo, podeConsultar);
    const certificadosQuery = useCertificadosDigitais(escopo, false, podeConsultar);
    const mutations = useConfiguracaoFiscalMutations();
    const [values, setValues] = useState<EmpresaFormValues>(formVazio);
    const [erro, setErro] = useState<ApiError | null>(null);
    const [dialog, setDialog] = useState<DialogAcao>(null);

    const config = empresaQuery.data;
    useEffect(() => {
        if (empresaQuery.data !== undefined) setValues(formDe(empresaQuery.data));
    }, [empresaQuery.data]);

    if (empresaQuery.isLoading) return <LoadingState variant="panel" />;

    if (empresaQuery.error) {
        return (
            <>
                <ApiErrorPanel error={erroConfiguracaoFiscalParaPainel(mapApiError(empresaQuery.error))} />
                <Button type="button" label="Tentar novamente" icon="pi pi-refresh" outlined onClick={() => empresaQuery.refetch()} />
            </>
        );
    }

    const naoConfigurada = config === null;
    const inativa = config?.ativo === false;
    // Campos só editáveis com permissão, com configuração existente ativa ou ainda inexistente (upsert).
    const editavel = podeGerenciar && !inativa;
    const opcoes = opcoesCertificado(certificadosQuery.data, values.certificadoDigitalId);

    const fecharDialogo = () => {
        setDialog(null);
        setErro(null);
    };

    const salvar = async (event: React.FormEvent) => {
        event.preventDefault();
        setErro(null);
        try {
            await mutations.salvarEmpresaMutation.mutateAsync({ ...values, certificadoDigitalId: values.certificadoDigitalId });
            toast.success(CONFIGURACAO_FISCAL_EMPRESA.salvo);
        } catch (error) {
            setErro(mapApiError(error));
        }
    };

    const alternarAtivo = async (motivo: string) => {
        setErro(null);
        try {
            if (dialog === 'inativar') {
                await mutations.inativarEmpresaMutation.mutateAsync({ motivo });
                toast.success(CONFIGURACAO_FISCAL_EMPRESA.inativada);
            } else {
                await mutations.reativarEmpresaMutation.mutateAsync({ motivo });
                toast.success(CONFIGURACAO_FISCAL_EMPRESA.reativada);
            }
            setDialog(null);
        } catch (error) {
            setErro(mapApiError(error));
        }
    };

    return (
        <>
            {naoConfigurada ? (
                <Message severity="info" className="w-full mb-3" text={`${CONFIGURACAO_FISCAL_EMPRESA.naoConfiguradaTitulo}. ${CONFIGURACAO_FISCAL_EMPRESA.naoConfiguradaDescricao}`} />
            ) : null}
            {inativa ? <Message severity="warn" className="w-full mb-3" text={CONFIGURACAO_FISCAL_EMPRESA.inativaAviso} /> : null}
            {!podeGerenciar ? <Message severity="info" className="w-full mb-3" text={`Somente leitura. ${CONFIGURACAO_FISCAL_PERMISSAO.semGerenciar}`} /> : null}
            {erro && !dialog ? <ApiErrorPanel error={erroConfiguracaoFiscalParaPainel(erro)} /> : null}

            <Card
                title={
                    <span className="flex align-items-center gap-2">
                        {CONFIGURACAO_FISCAL_EMPRESA.cardTitulo}
                        {config ? <Tag value={config.ativo ? 'Ativa' : 'Inativa'} severity={config.ativo ? 'success' : 'warning'} /> : null}
                    </span>
                }
            >
                <form className="grid formgrid p-fluid" onSubmit={salvar} aria-label={CONFIGURACAO_FISCAL_EMPRESA.cardTitulo}>
                    <div className="field col-12 md:col-4">
                        <label htmlFor="empresa-ambiente" className="font-medium block mb-2">{CONFIGURACAO_FISCAL_EMPRESA.ambiente}</label>
                        <Dropdown inputId="empresa-ambiente" ariaLabel={CONFIGURACAO_FISCAL_EMPRESA.ambiente} value={values.ambiente} options={AMBIENTE_FISCAL_OPTIONS} disabled={!editavel} onChange={(event) => setValues((v) => ({ ...v, ambiente: event.value as TipoAmbienteFiscal }))} />
                    </div>
                    <div className="field col-12 md:col-8">
                        <label htmlFor="empresa-certificado" className="font-medium block mb-2">{CONFIGURACAO_FISCAL_EMPRESA.certificado}</label>
                        <Dropdown
                            inputId="empresa-certificado"
                            ariaLabel={CONFIGURACAO_FISCAL_EMPRESA.certificado}
                            value={values.certificadoDigitalId}
                            options={opcoes}
                            optionDisabled="disabled"
                            showClear
                            placeholder={CONFIGURACAO_FISCAL_EMPRESA.certificadoNenhum}
                            emptyMessage="Nenhum certificado ativo cadastrado."
                            disabled={!editavel}
                            onChange={(event) => setValues((v) => ({ ...v, certificadoDigitalId: (event.value as string | null) ?? null }))}
                        />
                    </div>
                    <div className="field col-12 flex flex-wrap gap-4">
                        <span className="flex align-items-center gap-2">
                            <Checkbox inputId="empresa-emitir-nfe" checked={values.emitirNFe} disabled={!editavel} onChange={(event) => setValues((v) => ({ ...v, emitirNFe: Boolean(event.checked) }))} />
                            <label htmlFor="empresa-emitir-nfe">{CONFIGURACAO_FISCAL_EMPRESA.emitirNFe}</label>
                        </span>
                        <span className="flex align-items-center gap-2">
                            <Checkbox inputId="empresa-emitir-nfce" checked={values.emitirNFCe} disabled={!editavel} onChange={(event) => setValues((v) => ({ ...v, emitirNFCe: Boolean(event.checked) }))} />
                            <label htmlFor="empresa-emitir-nfce">{CONFIGURACAO_FISCAL_EMPRESA.emitirNFCe}</label>
                        </span>
                        <span className="flex align-items-center gap-2">
                            <Checkbox inputId="empresa-emitir-nfse" checked={values.emitirNFSe} disabled={!editavel} onChange={(event) => setValues((v) => ({ ...v, emitirNFSe: Boolean(event.checked) }))} />
                            <label htmlFor="empresa-emitir-nfse">{CONFIGURACAO_FISCAL_EMPRESA.emitirNFSe}</label>
                        </span>
                    </div>
                    <div className="field col-12">
                        <label htmlFor="empresa-observacao" className="font-medium block mb-2">{CONFIGURACAO_FISCAL_EMPRESA.observacao}</label>
                        <InputTextarea id="empresa-observacao" value={values.observacao} rows={3} maxLength={OBSERVACAO_CONFIGURACAO_MAX} disabled={!editavel} onChange={(event) => setValues((v) => ({ ...v, observacao: event.target.value }))} />
                    </div>
                    {podeGerenciar ? (
                        <div className="col-12 flex flex-wrap gap-2 justify-content-end">
                            {config?.ativo ? <Button type="button" label={CONFIGURACAO_FISCAL_EMPRESA.inativar} icon="pi pi-ban" severity="danger" outlined onClick={() => { setErro(null); setDialog('inativar'); }} /> : null}
                            {inativa ? <Button type="button" label={CONFIGURACAO_FISCAL_EMPRESA.reativar} icon="pi pi-replay" outlined onClick={() => { setErro(null); setDialog('reativar'); }} /> : null}
                            {!inativa ? <Button type="submit" label={CONFIGURACAO_FISCAL_EMPRESA.salvar} icon="pi pi-check" loading={mutations.salvarEmpresaMutation.isPending} /> : null}
                        </div>
                    ) : null}
                </form>
            </Card>

            <ConfiguracaoFiscalMotivoDialog
                visible={dialog === 'inativar'}
                title={EMPRESA_INATIVAR_DIALOG.titulo}
                confirmLabel={EMPRESA_INATIVAR_DIALOG.confirmLabel}
                loading={mutations.inativarEmpresaMutation.isPending}
                error={dialog === 'inativar' ? erro : null}
                onHide={fecharDialogo}
                onSubmit={alternarAtivo}
            />
            <ConfiguracaoFiscalMotivoDialog
                visible={dialog === 'reativar'}
                title={EMPRESA_REATIVAR_DIALOG.titulo}
                confirmLabel={EMPRESA_REATIVAR_DIALOG.confirmLabel}
                loading={mutations.reativarEmpresaMutation.isPending}
                error={dialog === 'reativar' ? erro : null}
                onHide={fecharDialogo}
                onSubmit={alternarAtivo}
            />
        </>
    );
};
