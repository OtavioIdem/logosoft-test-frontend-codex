'use client';

// Aba "Certificados" da Configuração de emissão (v1.11.0a8b81, D112): lista do metadado (nunca o thumbprint
// completo), cadastro, Verificar (só com _GERENCIAR) e inativação com motivo. Inativar certificado vinculado a
// configuração ativa pede confirmação com aviso (o backend não bloqueia: ARCH-002/SEC-003).

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useFiliaisOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError } from '@/types/erp';
import { CertificadoCadastrarDialog, CertificadoVerificarDialog, ConfiguracaoFiscalMotivoDialog } from '@/features/fiscal/components/ConfiguracaoFiscalDialogs';
import {
    CERTIFICADO_INATIVAR_DIALOG,
    CERTIFICADOS_DIGITAIS,
    CONFIGURACAO_FISCAL_PERMISSAO,
    SITUACAO_CERTIFICADO_LABEL,
    erroConfiguracaoFiscalParaPainel,
    situacaoCertificadoSeverity,
    tipoCertificadoLabel,
    validadeCertificado
} from '@/features/fiscal/components/configuracaoFiscalLabels';
import { certificadoVinculadoAConfiguracaoAtiva } from '@/features/fiscal/components/configuracaoFiscalUtils';
import { CaixaDeUmaLeitura, ConfiguracaoFiscalEscopo, useCertificadosDigitais, useConfiguracaoFiscalEmpresa, useConfiguracaoFiscalFilial, useConfiguracaoFiscalMutations } from '@/features/fiscal/hooks/useConfiguracaoFiscal';
import { CertificadoDigitalResponse, SITUACAO_CERTIFICADO_DIGITAL, VerificarCertificadoDigitalResponse } from '@/features/fiscal/types/configuracaoFiscal.types';

export const CertificadosDigitaisTab = ({
    escopo,
    empresaContextoId,
    filialSelecionadaId,
    contextoDivergente,
    sefazSimulada,
    podeConsultar,
    podeGerenciar
}: {
    escopo: ConfiguracaoFiscalEscopo;
    empresaContextoId: string | null;
    /** Filial escolhida na aba Filiais: só a configuração já carregada dela entra no aviso de vínculo. */
    filialSelecionadaId: string | null;
    contextoDivergente: boolean;
    sefazSimulada: boolean;
    podeConsultar: boolean;
    podeGerenciar: boolean;
}) => {
    const toast = useAppToast();
    const [somenteAtivos, setSomenteAtivos] = useState(false);
    const certificadosQuery = useCertificadosDigitais(escopo, somenteAtivos, podeConsultar);
    // A consulta da empresa está habilitada e dispara o GET (deduplicado com a aba Empresa pela mesma query key). A da filial
    // (enabled: false) só lê o cache: o vínculo avaliado é o da configuração da filial selecionada que a tela já carregou.
    const empresaQuery = useConfiguracaoFiscalEmpresa(escopo, podeConsultar);
    const filialQuery = useConfiguracaoFiscalFilial(escopo, filialSelecionadaId, false);
    const filiais = useFiliaisOptions(empresaContextoId);
    const mutations = useConfiguracaoFiscalMutations(escopo);

    const [cadastrando, setCadastrando] = useState(false);
    const [inativando, setInativando] = useState<CertificadoDigitalResponse | null>(null);
    const [verificado, setVerificado] = useState<{ certificado: CertificadoDigitalResponse; resultado: VerificarCertificadoDigitalResponse } | null>(null);
    const [erroDialogo, setErroDialogo] = useState<ApiError | null>(null);
    const [erroAcao, setErroAcao] = useState<ApiError | null>(null);

    const certificados = certificadosQuery.data ?? [];
    const filialLabelPorId = new Map(filiais.options.map((option) => [option.value, option.label]));
    const filialIndisponivel = contextoDivergente ? 'Indisponível: a empresa selecionada no contexto é diferente da empresa do seu usuário.' : filiais.blocked ? filiais.blockedMessage : undefined;

    const vinculado = inativando ? certificadoVinculadoAConfiguracaoAtiva(inativando.id, empresaQuery.data, filialQuery.data) : false;

    const abrirCadastro = () => {
        setErroDialogo(null);
        setCadastrando(true);
    };

    const fecharCadastro = () => {
        setCadastrando(false);
        setErroDialogo(null);
        mutations.cadastrarCertificadoMutation.reset();
    };

    const cadastrar = async (values: unknown) => {
        setErroDialogo(null);
        const caixa: CaixaDeUmaLeitura = { valores: values };
        try {
            await mutations.cadastrarCertificadoMutation.mutateAsync(caixa);
            fecharCadastro();
            toast.success(CERTIFICADOS_DIGITAIS.cadastrado);
        } catch (error) {
            setErroDialogo(mapApiError(error));
            // A mutação falha com o AxiosError (cuja config guarda o corpo enviado): descarta-o do cache.
            mutations.cadastrarCertificadoMutation.reset();
        }
    };

    const abrirInativar = (certificado: CertificadoDigitalResponse) => {
        setErroDialogo(null);
        setInativando(certificado);
    };

    const inativar = async (motivo: string) => {
        if (!inativando) return;
        setErroDialogo(null);
        try {
            await mutations.inativarCertificadoMutation.mutateAsync({ id: inativando.id, values: { motivo } });
            setInativando(null);
            toast.success(CERTIFICADOS_DIGITAIS.inativado);
        } catch (error) {
            setErroDialogo(mapApiError(error));
        }
    };

    const verificar = async (certificado: CertificadoDigitalResponse) => {
        setErroAcao(null);
        try {
            const resultado = await mutations.verificarCertificadoMutation.mutateAsync(certificado.id);
            setVerificado({ certificado, resultado });
        } catch (error) {
            setErroAcao(mapApiError(error));
        }
    };

    return (
        <>
            {!podeGerenciar ? <Message severity="info" className="w-full mb-3" text={`Somente leitura. ${CONFIGURACAO_FISCAL_PERMISSAO.semGerenciar}`} /> : null}
            {certificadosQuery.error ? (
                <>
                    <ApiErrorPanel error={erroConfiguracaoFiscalParaPainel(mapApiError(certificadosQuery.error))} />
                    <Button type="button" label="Tentar novamente" icon="pi pi-refresh" outlined className="mb-3" onClick={() => certificadosQuery.refetch()} />
                </>
            ) : null}
            {erroAcao ? <ApiErrorPanel error={erroConfiguracaoFiscalParaPainel(erroAcao)} /> : null}

            <Card title={CERTIFICADOS_DIGITAIS.cardTitulo}>
                <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-3">
                    <span className="flex align-items-center gap-2">
                        <Checkbox inputId="certificados-somente-ativos" checked={somenteAtivos} onChange={(event) => setSomenteAtivos(Boolean(event.checked))} />
                        <label htmlFor="certificados-somente-ativos">{CERTIFICADOS_DIGITAIS.somenteAtivos}</label>
                    </span>
                    {podeGerenciar ? <Button type="button" label={CERTIFICADOS_DIGITAIS.cadastrar} icon="pi pi-plus" onClick={abrirCadastro} /> : null}
                </div>

                {certificadosQuery.isLoading ? (
                    <LoadingState variant="table" rows={3} columns={6} />
                ) : (
                    <DataTable<CertificadoDigitalResponse[]> value={certificados} dataKey="id" loading={certificadosQuery.isFetching} emptyMessage={CERTIFICADOS_DIGITAIS.vazioTitulo}>
                        <Column header={CERTIFICADOS_DIGITAIS.colunas.apelido} field="apelido" />
                        <Column header={CERTIFICADOS_DIGITAIS.colunas.tipo} body={(item: CertificadoDigitalResponse) => tipoCertificadoLabel(item.tipo)} />
                        <Column header={CERTIFICADOS_DIGITAIS.colunas.thumbprint} body={(item: CertificadoDigitalResponse) => <code>{item.thumbprintMascarado}</code>} />
                        <Column
                            header={CERTIFICADOS_DIGITAIS.colunas.validoAte}
                            body={(item: CertificadoDigitalResponse) => {
                                const validade = validadeCertificado(item.validoAte);
                                return (
                                    <span className="flex flex-wrap align-items-center gap-2">
                                        <span>{validade.texto}</span>
                                        {validade.venceEmBreve ? <Tag severity="warning" value={`${CERTIFICADOS_DIGITAIS.vencePrefixo} ${validade.diasRestantes} ${validade.diasRestantes === 1 ? 'dia' : 'dias'}`} /> : null}
                                    </span>
                                );
                            }}
                        />
                        <Column header={CERTIFICADOS_DIGITAIS.colunas.situacao} body={(item: CertificadoDigitalResponse) => <Tag value={SITUACAO_CERTIFICADO_LABEL[item.situacao] ?? '-'} severity={situacaoCertificadoSeverity(item.situacao)} />} />
                        <Column header={CERTIFICADOS_DIGITAIS.colunas.filial} body={(item: CertificadoDigitalResponse) => (item.filialId ? filialLabelPorId.get(item.filialId) ?? 'Filial vinculada' : CERTIFICADOS_DIGITAIS.empresaToda)} />
                        {podeGerenciar ? (
                            <Column
                                header={CERTIFICADOS_DIGITAIS.colunas.acoes}
                                alignHeader="right"
                                body={(item: CertificadoDigitalResponse) => (
                                    <div className="flex gap-2 justify-content-end flex-wrap">
                                        <Button type="button" label={CERTIFICADOS_DIGITAIS.verificar} icon="pi pi-search" size="small" text aria-label={`${CERTIFICADOS_DIGITAIS.verificar} certificado ${item.apelido}`} loading={mutations.verificarCertificadoMutation.isPending && mutations.verificarCertificadoMutation.variables === item.id} onClick={() => verificar(item)} />
                                        {item.situacao !== SITUACAO_CERTIFICADO_DIGITAL.inativo ? (
                                            <Button type="button" label={CERTIFICADOS_DIGITAIS.inativar} icon="pi pi-ban" size="small" text severity="danger" aria-label={`${CERTIFICADOS_DIGITAIS.inativar} certificado ${item.apelido}`} onClick={() => abrirInativar(item)} />
                                        ) : null}
                                    </div>
                                )}
                            />
                        ) : null}
                    </DataTable>
                )}
                {!certificadosQuery.isLoading && !certificadosQuery.error && certificados.length === 0 ? <EmptyState title={CERTIFICADOS_DIGITAIS.vazioTitulo} description={CERTIFICADOS_DIGITAIS.vazioDescricao} action={<Button type="button" label="Atualizar" icon="pi pi-refresh" text onClick={() => certificadosQuery.refetch()} />} /> : null}
            </Card>

            <CertificadoCadastrarDialog visible={cadastrando} loading={mutations.cadastrarCertificadoMutation.isPending} error={erroDialogo} filialOptions={filiais.options} filialLoading={filiais.isFetching} filialIndisponivel={filialIndisponivel} onHide={fecharCadastro} onSubmit={cadastrar} />
            <ConfiguracaoFiscalMotivoDialog
                visible={Boolean(inativando)}
                title={CERTIFICADO_INATIVAR_DIALOG.titulo(inativando?.apelido ?? '')}
                confirmLabel={vinculado ? CERTIFICADO_INATIVAR_DIALOG.confirmLabelVinculado : CERTIFICADO_INATIVAR_DIALOG.confirmLabel}
                warning={vinculado ? CERTIFICADO_INATIVAR_DIALOG.avisoVinculado : undefined}
                loading={mutations.inativarCertificadoMutation.isPending}
                error={inativando ? erroDialogo : null}
                onHide={() => { setInativando(null); setErroDialogo(null); }}
                onSubmit={inativar}
            />
            <CertificadoVerificarDialog visible={Boolean(verificado)} apelido={verificado?.certificado.apelido} resultado={verificado?.resultado ?? null} sefazSimulada={sefazSimulada} onHide={() => setVerificado(null)} />
        </>
    );
};
