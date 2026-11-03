'use client';

// Aba "Filiais" da Configuração de emissão (v1.11.0a8b81, D112). A lista de filiais vem do endpoint de
// administração; ao escolher uma, GET filiais/{id}. 404 = "herda da empresa" (estado, não erro: o client devolve
// `null`). Com `herdaConfiguracaoEmpresa = true` os campos próprios ficam desabilitados e o texto diz que são
// ignorados na emissão. Séries padrão são texto livre (contrato).

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { LoadingState } from '@/components/feedback/LoadingState';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { useFiliaisOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError } from '@/types/erp';
import { AMBIENTE_FISCAL_OPTIONS, CONFIGURACAO_FISCAL_FILIAL, CONFIGURACAO_FISCAL_PERMISSAO, erroConfiguracaoFiscalParaPainel } from '@/features/fiscal/components/configuracaoFiscalLabels';
import { opcoesCertificado } from '@/features/fiscal/components/configuracaoFiscalUtils';
import { OBSERVACAO_CONFIGURACAO_MAX, SERIE_PADRAO_MAX } from '@/features/fiscal/schemas/configuracaoFiscalSchemas';
import { ConfiguracaoFiscalEscopo, useCertificadosDigitais, useConfiguracaoFiscalFilial, useConfiguracaoFiscalMutations } from '@/features/fiscal/hooks/useConfiguracaoFiscal';
import { ConfiguracaoFiscalFilialResponse, TIPO_AMBIENTE_FISCAL, TipoAmbienteFiscal } from '@/features/fiscal/types/configuracaoFiscal.types';

type FilialFormValues = {
    ambiente: TipoAmbienteFiscal;
    herdaConfiguracaoEmpresa: boolean;
    certificadoDigitalId: string | null;
    serieNFePadrao: string;
    serieNFCePadrao: string;
    observacao: string;
};

const formPadrao = (): FilialFormValues => ({ ambiente: TIPO_AMBIENTE_FISCAL.homologacao, herdaConfiguracaoEmpresa: true, certificadoDigitalId: null, serieNFePadrao: '', serieNFCePadrao: '', observacao: '' });

const formDe = (config: ConfiguracaoFiscalFilialResponse | null | undefined): FilialFormValues =>
    config
        ? {
              ambiente: config.ambiente,
              herdaConfiguracaoEmpresa: config.herdaConfiguracaoEmpresa,
              certificadoDigitalId: config.certificadoDigitalId ?? null,
              serieNFePadrao: config.serieNFePadrao ?? '',
              serieNFCePadrao: config.serieNFCePadrao ?? '',
              observacao: config.observacao ?? ''
          }
        : formPadrao();

export const ConfiguracaoFiscalFilialTab = ({
    escopo,
    empresaContextoId,
    filialId,
    onFilialChange,
    contextoDivergente,
    podeConsultar,
    podeGerenciar
}: {
    escopo: ConfiguracaoFiscalEscopo;
    empresaContextoId: string | null;
    filialId: string | null;
    onFilialChange: (filialId: string | null) => void;
    /** Contexto selecionado diverge da empresa do usuário: as filiais listadas não são as que o backend aceita. */
    contextoDivergente: boolean;
    podeConsultar: boolean;
    podeGerenciar: boolean;
}) => {
    const toast = useAppToast();
    const filiais = useFiliaisOptions(empresaContextoId);
    const filialQuery = useConfiguracaoFiscalFilial(escopo, filialId, podeConsultar && !contextoDivergente);
    const certificadosQuery = useCertificadosDigitais(escopo, false, podeConsultar && !contextoDivergente);
    const mutations = useConfiguracaoFiscalMutations();
    const [values, setValues] = useState<FilialFormValues>(formPadrao);
    const [erro, setErro] = useState<ApiError | null>(null);

    // Trocar de filial limpa o erro da anterior; o dado recarregado (inclusive após 409) NÃO apaga a mensagem.
    useEffect(() => {
        setErro(null);
    }, [filialId]);

    useEffect(() => {
        if (filialQuery.data !== undefined) setValues(formDe(filialQuery.data));
        else setValues(formPadrao());
    }, [filialQuery.data, filialId]);

    if (contextoDivergente) {
        return <Message severity="warn" className="w-full" text={CONFIGURACAO_FISCAL_FILIAL.contextoDivergenteBloqueio} />;
    }

    const config = filialQuery.data;
    const herdaSemConfiguracao = Boolean(filialId) && config === null;
    const inativa = config?.ativo === false;
    const editavel = podeGerenciar && !inativa && Boolean(filialId);
    const camposProprios = editavel && !values.herdaConfiguracaoEmpresa;
    const opcoes = opcoesCertificado(certificadosQuery.data, values.certificadoDigitalId);

    const salvar = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!filialId) return;
        setErro(null);
        try {
            await mutations.salvarFilialMutation.mutateAsync({ filialId, values });
            toast.success(CONFIGURACAO_FISCAL_FILIAL.salvo);
        } catch (error) {
            setErro(mapApiError(error));
        }
    };

    return (
        <>
            {filiais.blocked ? <Message severity="warn" className="w-full mb-3" text={filiais.blockedMessage} /> : null}
            {filiais.error ? <ApiErrorPanel error={mapApiError(filiais.error)} /> : null}
            <div className="mb-3 md:w-6">
                <label htmlFor="filial-seletor" className="font-medium block mb-2">{CONFIGURACAO_FISCAL_FILIAL.selecionar}</label>
                <EntitySelect id="filial-seletor" ariaLabel={CONFIGURACAO_FISCAL_FILIAL.selecionar} entityName="filial" value={filialId} options={filiais.options} loading={filiais.isFetching} disabled={filiais.blocked} onChange={onFilialChange} />
                {!filiais.blocked && !filiais.isFetching && filiais.options.length === 0 ? <small className="text-color-secondary block mt-1">{CONFIGURACAO_FISCAL_FILIAL.semFiliais}</small> : null}
            </div>

            {!filialId ? <Message severity="info" className="w-full" text={CONFIGURACAO_FISCAL_FILIAL.selecionarVazio} /> : null}
            {filialId && filialQuery.isLoading ? <LoadingState variant="panel" /> : null}
            {filialId && filialQuery.error ? (
                <>
                    <ApiErrorPanel error={erroConfiguracaoFiscalParaPainel(mapApiError(filialQuery.error))} />
                    <Button type="button" label="Tentar novamente" icon="pi pi-refresh" outlined onClick={() => filialQuery.refetch()} />
                </>
            ) : null}

            {filialId && !filialQuery.isLoading && !filialQuery.error ? (
                <>
                    {herdaSemConfiguracao ? <Message severity="info" className="w-full mb-3" text={`${CONFIGURACAO_FISCAL_FILIAL.herdaTitulo} ${CONFIGURACAO_FISCAL_FILIAL.herdaDescricao}`} /> : null}
                    {inativa ? <Message severity="warn" className="w-full mb-3" text={CONFIGURACAO_FISCAL_FILIAL.inativaAviso} /> : null}
                    {!podeGerenciar ? <Message severity="info" className="w-full mb-3" text={`Somente leitura. ${CONFIGURACAO_FISCAL_PERMISSAO.semGerenciar}`} /> : null}
                    {erro ? <ApiErrorPanel error={erroConfiguracaoFiscalParaPainel(erro)} /> : null}

                    <Card
                        title={
                            <span className="flex align-items-center gap-2">
                                Configuração da filial
                                {config ? <Tag value={config.ativo ? 'Ativa' : 'Inativa'} severity={config.ativo ? 'success' : 'warning'} /> : null}
                            </span>
                        }
                    >
                        <form className="grid formgrid p-fluid" onSubmit={salvar} aria-label="Configuração da filial">
                            <div className="field col-12 flex align-items-center gap-2">
                                <Checkbox inputId="filial-herda" checked={values.herdaConfiguracaoEmpresa} disabled={!editavel} onChange={(event) => setValues((v) => ({ ...v, herdaConfiguracaoEmpresa: Boolean(event.checked) }))} />
                                <label htmlFor="filial-herda">{CONFIGURACAO_FISCAL_FILIAL.herdaCampo}</label>
                            </div>
                            {values.herdaConfiguracaoEmpresa ? (
                                <div className="field col-12">
                                    <Message severity="info" className="w-full" text={CONFIGURACAO_FISCAL_FILIAL.camposIgnorados} />
                                </div>
                            ) : null}
                            <div className="field col-12 md:col-4">
                                <label htmlFor="filial-ambiente" className="font-medium block mb-2">{CONFIGURACAO_FISCAL_FILIAL.ambiente}</label>
                                <Dropdown inputId="filial-ambiente" ariaLabel={CONFIGURACAO_FISCAL_FILIAL.ambiente} value={values.ambiente} options={AMBIENTE_FISCAL_OPTIONS} disabled={!camposProprios} onChange={(event) => setValues((v) => ({ ...v, ambiente: event.value as TipoAmbienteFiscal }))} />
                            </div>
                            <div className="field col-12 md:col-8">
                                <label htmlFor="filial-certificado" className="font-medium block mb-2">{CONFIGURACAO_FISCAL_FILIAL.certificado}</label>
                                <Dropdown
                                    inputId="filial-certificado"
                                    ariaLabel={CONFIGURACAO_FISCAL_FILIAL.certificado}
                                    value={values.certificadoDigitalId}
                                    options={opcoes}
                                    optionDisabled="disabled"
                                    showClear
                                    placeholder="Sem certificado próprio"
                                    emptyMessage="Nenhum certificado ativo cadastrado."
                                    disabled={!camposProprios}
                                    onChange={(event) => setValues((v) => ({ ...v, certificadoDigitalId: (event.value as string | null) ?? null }))}
                                />
                            </div>
                            <div className="field col-12 md:col-6">
                                <label htmlFor="filial-serie-nfe" className="font-medium block mb-2">{CONFIGURACAO_FISCAL_FILIAL.serieNFePadrao}</label>
                                <InputText id="filial-serie-nfe" value={values.serieNFePadrao} maxLength={SERIE_PADRAO_MAX} disabled={!camposProprios} onChange={(event) => setValues((v) => ({ ...v, serieNFePadrao: event.target.value }))} />
                            </div>
                            <div className="field col-12 md:col-6">
                                <label htmlFor="filial-serie-nfce" className="font-medium block mb-2">{CONFIGURACAO_FISCAL_FILIAL.serieNFCePadrao}</label>
                                <InputText id="filial-serie-nfce" value={values.serieNFCePadrao} maxLength={SERIE_PADRAO_MAX} disabled={!camposProprios} onChange={(event) => setValues((v) => ({ ...v, serieNFCePadrao: event.target.value }))} />
                            </div>
                            <div className="field col-12">
                                <label htmlFor="filial-observacao" className="font-medium block mb-2">{CONFIGURACAO_FISCAL_FILIAL.observacao}</label>
                                <InputTextarea id="filial-observacao" value={values.observacao} rows={3} maxLength={OBSERVACAO_CONFIGURACAO_MAX} disabled={!editavel} onChange={(event) => setValues((v) => ({ ...v, observacao: event.target.value }))} />
                            </div>
                            {podeGerenciar && !inativa ? (
                                <div className="col-12 flex justify-content-end">
                                    <Button type="submit" label={CONFIGURACAO_FISCAL_FILIAL.salvar} icon="pi pi-check" loading={mutations.salvarFilialMutation.isPending} />
                                </div>
                            ) : null}
                        </form>
                    </Card>
                </>
            ) : null}
        </>
    );
};
