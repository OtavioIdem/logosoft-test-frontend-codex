'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';
import { TabPanel, TabView } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusTag } from '@/components/data/StatusTag';
import { FiscalDocumentosAuxiliaresPanel, FiscalIntegracoesTable } from '@/features/fiscal/components/FiscalOperationalPanels';
import { ComposicaoTotalNotaFiscalCard, ImpostosNotaFiscalTabela } from '@/features/fiscal/components/NotaFiscalImpostosPanels';
import { NotaFiscalRetornoOperacionalPanel } from '@/features/fiscal/components/NotaFiscalRetornoOperacionalPanel';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { LoadingState } from '@/components/feedback/LoadingState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import {
    ArmazenarXmlDialog,
    BaixarEstoqueDialog,
    CancelarNotaLocalDialog,
    CancelarNotaSefazDialog,
    CartaCorrecaoDialog,
    ConsultarProtocoloDialog,
    DanfeDialog,
    GerarContaReceberDialog,
    HabilitarContingenciaDialog,
    ImpostoNotaFiscalDialog,
    ItemNotaFiscalDialog,
    RegistrarRejeicaoDialog,
    ReprocessarSefazDialog,
    TransmitirSefazDialog,
    ValoresAcessoriosDialog,
    XmlPipelineDialog
} from '@/features/fiscal/components/FiscalActionDialogs';
import {
    alertasDoRetorno,
    feedbackRetornoSefaz,
    fiscalOrigemContextLabel,
    fiscalReferenceContextLabel,
    formatFiscalDate,
    formatFiscalMoney,
    motivoValoresAcessoriosIndisponivel,
    notaFiscalBloqueiosVisuais,
    notaPodeAssinarXml,
    notaPodeCancelar,
    notaPodeCartaCorrecao,
    notaPodeDefinirValoresAcessorios,
    notaPodeEditarItens,
    fiscalActionDisabledReason,
    notaPodeBaixarEstoque,
    notaPodeGerarContaReceber,
    notaPodeConsultarProtocolo,
    notaPodeGerarDanfe,
    notaPodeHabilitarContingencia,
    notaPodeGerarXml,
    notaPodeRegistrarRejeicao,
    notaPodeTransmitir,
    notaPodeValidar,
    resolveFiscalWorkflowActionState,
    statusNotaFiscalLabel,
    statusNotaFiscalTagValue,
    tipoDocumentoFiscalLabel,
    tipoEventoFiscalLabel,
    tipoOperacaoFiscalLabel,
    tipoXmlFiscalLabel
} from '@/features/fiscal/components/fiscalUiUtils';
import { fiscalApi, formatFiscalApiError } from '@/features/fiscal/api/fiscalApi';
import { useFiscalMutations, useNotaFiscal, useNotaFiscalIntegracoes, useNotaFiscalResumo, useNotaFiscalWorkflow } from '@/features/fiscal/hooks/useFiscalResources';
import { ConsultaProtocoloSefazResponse, DocumentoAuxiliarFiscalResponse, LogIntegracaoFiscalResponse, NotaFiscalXmlPipelineResponse, TransmissaoSefazResponse } from '@/features/fiscal/types/fiscal.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { StatusNotaFiscal } from '@/types/erp';

const DetailValue = ({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) => (
    <div className="col-12 md:col-4">
        <span className="block text-color-secondary mb-1">{label}</span>
        <strong className={mono ? 'font-mono text-sm break-all' : undefined}>{value ?? '-'}</strong>
    </div>
);

export const NotaFiscalDetalhePage = ({ notaId }: { notaId: string }) => {
    const router = useRouter();
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const notaQuery = useNotaFiscal(notaId);
    const resumoQuery = useNotaFiscalResumo(notaId);
    const workflowQuery = useNotaFiscalWorkflow(notaId);
    const integracoesQuery = useNotaFiscalIntegracoes(notaId);
    const mutations = useFiscalMutations();
    const nota = notaQuery.data ?? null;
    const resumo = resumoQuery.data ?? null;
    const workflow = workflowQuery.data ?? null;
    const integracoes = integracoesQuery.data ?? [];
    const [dialog, setDialog] = useState<string | null>(null);
    const [ultimoXml, setUltimoXml] = useState<NotaFiscalXmlPipelineResponse | null>(null);
    const [ultimaTransmissao, setUltimaTransmissao] = useState<TransmissaoSefazResponse | null>(null);
    const [ultimaConsulta, setUltimaConsulta] = useState<ConsultaProtocoloSefazResponse | null>(null);
    const [ultimoDocumento, setUltimoDocumento] = useState<DocumentoAuxiliarFiscalResponse | null>(null);
    const [logReprocessamento, setLogReprocessamento] = useState<LogIntegracaoFiscalResponse | null>(null);

    const bloqueios = useMemo(() => notaFiscalBloqueiosVisuais(nota), [nota]);
    const actionStates = useMemo(
        () => ({
            validar: resolveFiscalWorkflowActionState(workflow, ['VALIDAR'], notaPodeValidar(nota, resumo)),
            gerarXml: resolveFiscalWorkflowActionState(workflow, ['GERAR_XML_ENVIO'], notaPodeGerarXml(nota, resumo)),
            assinarXml: resolveFiscalWorkflowActionState(workflow, ['ASSINAR_XML_ENVIO'], notaPodeAssinarXml(nota, resumo)),
            transmitir: resolveFiscalWorkflowActionState(workflow, ['TRANSMITIR_SEFAZ'], notaPodeTransmitir(nota, resumo)),
            registrarRejeicao: resolveFiscalWorkflowActionState(workflow, ['REGISTRAR_REJEICAO', 'REJEICAO'], notaPodeRegistrarRejeicao(nota, workflow), 'Rejeição técnica só deve ser registrada quando o backend/workflow indicar que a nota comporta esse evento.'),
            cancelar: resolveFiscalWorkflowActionState(workflow, ['CANCELAR', 'CANCELAR_SEFAZ', 'CANCELAMENTO'], notaPodeCancelar(nota, resumo)),
            cartaCorrecao: resolveFiscalWorkflowActionState(workflow, ['CARTA_CORRECAO', 'EMITIR_CARTA_CORRECAO'], notaPodeCartaCorrecao(nota, resumo)),
            consultarProtocolo: resolveFiscalWorkflowActionState(workflow, ['CONSULTAR_PROTOCOLO', 'CONSULTAR_RETORNO_AUTORIZACAO'], notaPodeConsultarProtocolo(nota, workflow)),
            contingencia: resolveFiscalWorkflowActionState(workflow, ['HABILITAR_CONTINGENCIA', 'CONTINGENCIA', 'AVALIAR_CONTINGENCIA'], notaPodeHabilitarContingencia(nota, workflow)),
            baixarEstoque: resolveFiscalWorkflowActionState(workflow, ['BAIXAR_ESTOQUE'], notaPodeBaixarEstoque(resumo)),
            gerarFinanceiro: resolveFiscalWorkflowActionState(workflow, ['GERAR_CONTA_RECEBER', 'FINANCEIRO'], notaPodeGerarContaReceber(resumo)),
            danfe: resolveFiscalWorkflowActionState(workflow, ['GERAR_DANFE', 'DANFE'], notaPodeGerarDanfe(nota, resumo))
        }),
        [nota, resumo, workflow]
    );

    if (!hasPermission('FISCAL_CONSULTAR')) return <UnauthorizedState description="Detalhe fiscal exige FISCAL_CONSULTAR." />;

    const run = async (title: string, action: () => Promise<unknown>, success: string, closeDialog = true) => {
        try {
            await action();
            toast.success(title, success);
            if (closeDialog) setDialog(null);
        } catch (error) {
            toast.error(title, formatFiscalApiError(error, 'Operação fiscal não concluída.'));
            throw error;
        }
    };

    // D31/D43 P-1: retorno operacional (transmitir, reprocessar, consultar protocolo) guarda o resultado para o
    // painel e vira toast warn com alerta em vez de success quando o backend devolve alertas; erro mantém
    // toast.error e o rethrow (padrão da base, F5.5).
    const runRetornoSefaz = async <T extends { alertas?: unknown }>(title: string, action: () => Promise<T>, sucesso: string, guardarResultado: (resultado: T) => void) => {
        try {
            const resultado = await action();
            guardarResultado(resultado);
            const feedback = feedbackRetornoSefaz(alertasDoRetorno(resultado), sucesso);
            toast[feedback.severity](title, feedback.detail);
            setDialog(null);
        } catch (error) {
            toast.error(title, formatFiscalApiError(error, 'Operação fiscal não concluída.'));
            throw error;
        }
    };

    const gerarXml = (values: unknown) => run('XML fiscal', async () => setUltimoXml(await mutations.gerarXmlMutation.mutateAsync({ id: notaId, values })), 'XML de envio gerado.');
    const assinarXml = (values: unknown) => run('Assinatura XML', async () => setUltimoXml(await mutations.assinarXmlMutation.mutateAsync({ id: notaId, values })), 'XML de envio assinado.');
    const transmitir = (values: unknown) => runRetornoSefaz('Transmissão SEFAZ', () => mutations.transmitirMutation.mutateAsync({ id: notaId, values }), 'Retorno da transmissão recebido.', setUltimaTransmissao);
    const reprocessar = (values: unknown) => runRetornoSefaz('Reprocessamento SEFAZ', () => mutations.reprocessarMutation.mutateAsync({ id: notaId, values }), 'Reprocessamento concluído.', setUltimaTransmissao);
    const consultarProtocolo = (values: unknown) => runRetornoSefaz('Consulta protocolo', () => mutations.consultarProtocoloMutation.mutateAsync({ id: notaId, values }), 'Consulta realizada.', setUltimaConsulta);
    const habilitarContingencia = (values: unknown) => run('Contingência fiscal', async () => { await mutations.habilitarContingenciaMutation.mutateAsync({ id: notaId, values }); }, 'Contingência avaliada/habilitada.');
    const gerarDanfe = (values: unknown) => run('DANFE', async () => setUltimoDocumento(await mutations.gerarDanfeMutation.mutateAsync({ id: notaId, values })), 'Documento auxiliar gerado.');
    const baixarEstoque = (values: unknown) => run('Baixa de estoque', async () => { await mutations.baixarEstoqueMutation.mutateAsync({ id: notaId, values }); }, 'Baixa de estoque processada.');
    const gerarContaReceber = (values: unknown) => run('Financeiro fiscal', async () => { await mutations.gerarContaReceberMutation.mutateAsync({ id: notaId, values }); }, 'Conta a receber gerada ou conciliada.');
    const definirValoresAcessorios = (values: unknown) => run('Valores acessórios', async () => { await mutations.definirValoresAcessoriosMutation.mutateAsync({ id: notaId, values }); }, 'Valores acessórios atualizados.');

    const documentosAuxiliares = useMemo(() => (ultimoDocumento ? [ultimoDocumento] : []), [ultimoDocumento]);

    const baixarDocumento = async (documento: DocumentoAuxiliarFiscalResponse) => {
        try {
            const arquivo = await fiscalApi.baixarDocumentoAuxiliar(documento.id);
            const url = URL.createObjectURL(arquivo.blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = arquivo.filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Download fiscal', formatFiscalApiError(error, 'Não foi possível baixar o documento.'));
        }
    };

    const headerActions = (
        <div className="flex gap-2 flex-wrap justify-content-end">
            <Button label="Voltar" icon="pi pi-arrow-left" severity="secondary" outlined onClick={() => router.push('/fiscal/notas')} />
            <Button label="Atualizar" icon="pi pi-refresh" outlined onClick={() => { notaQuery.refetch(); resumoQuery.refetch(); workflowQuery.refetch(); integracoesQuery.refetch(); }} loading={notaQuery.isFetching || resumoQuery.isFetching || workflowQuery.isFetching || integracoesQuery.isFetching} />
            <PermissionGuard permission="FISCAL_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Item" icon="pi pi-plus" disabled={disabled || !notaPodeEditarItens(nota)} onClick={() => setDialog('item')} />}</PermissionGuard>
            <PermissionGuard permission="FISCAL_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Imposto" icon="pi pi-percentage" disabled={disabled || !notaPodeEditarItens(nota)} onClick={() => setDialog('imposto')} />}</PermissionGuard>
            <PermissionGuard permission="FISCAL_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Valores acessórios" icon="pi pi-wallet" outlined disabled={disabled || !notaPodeDefinirValoresAcessorios(nota)} title={disabled ? 'Permissão necessária: FISCAL_GERENCIAR.' : motivoValoresAcessoriosIndisponivel(nota) ?? undefined} onClick={() => setDialog('valoresAcessorios')} />}</PermissionGuard>
            <PermissionGuard permission="FISCAL_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Validar" icon="pi pi-check-circle" severity="success" disabled={disabled || !actionStates.validar.habilitada} title={fiscalActionDisabledReason(disabled, actionStates.validar, 'FISCAL_GERENCIAR')} loading={mutations.validarMutation.isPending} onClick={() => run('Validação fiscal', () => mutations.validarMutation.mutateAsync(notaId), 'Nota validada tecnicamente.')} />}</PermissionGuard>
            <PermissionGuard permission="FISCAL_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Gerar XML" icon="pi pi-code" disabled={disabled || !actionStates.gerarXml.habilitada} title={fiscalActionDisabledReason(disabled, actionStates.gerarXml, 'FISCAL_GERENCIAR')} onClick={() => setDialog('gerarXml')} />}</PermissionGuard>
            <PermissionGuard permission="FISCAL_EMITIR" mode="disable">{({ disabled }) => <Button label="Assinar" icon="pi pi-lock" disabled={disabled || !actionStates.assinarXml.habilitada} title={fiscalActionDisabledReason(disabled, actionStates.assinarXml, 'FISCAL_EMITIR')} onClick={() => setDialog('assinarXml')} />}</PermissionGuard>
            <PermissionGuard permission="FISCAL_EMITIR" mode="disable">{({ disabled }) => <Button label="Transmitir" icon="pi pi-send" severity="warning" disabled={disabled || !actionStates.transmitir.habilitada} title={fiscalActionDisabledReason(disabled, actionStates.transmitir, 'FISCAL_EMITIR')} onClick={() => setDialog('transmitir')} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title={nota ? `Nota fiscal ${nota.serie}/${nota.numero}` : 'Nota fiscal'} description="Detalhe técnico fiscal, pipeline XML, eventos e documentos auxiliares." actions={headerActions} />
            {notaQuery.isLoading ? <LoadingState variant="detail" /> : null}
            {notaQuery.error ? <ApiErrorPanel error={mapApiError(notaQuery.error)} /> : null}
            {resumoQuery.error ? <ApiErrorPanel error={mapApiError(resumoQuery.error)} title="Não foi possível carregar o resumo operacional fiscal." /> : null}
            {workflowQuery.error ? <ApiErrorPanel error={mapApiError(workflowQuery.error)} title="Não foi possível carregar o workflow operacional fiscal." /> : null}
            {integracoesQuery.error ? <ApiErrorPanel error={mapApiError(integracoesQuery.error)} title="Não foi possível carregar os logs de integração fiscal." /> : null}
            {nota ? (
                <>
                    <NotaFiscalRetornoOperacionalPanel xml={ultimoXml} transmissao={ultimaTransmissao} consulta={ultimaConsulta} documento={ultimoDocumento} />
                    {resumo ? (
                        <div className="grid mb-3">
                            <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-1">XML envio</span><strong>{resumo.possuiXmlEnvio ? 'Gerado' : 'Pendente'}</strong></Card></div>
                            <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-1">XML autorizado</span><strong>{resumo.possuiXmlAutorizado ? 'Armazenado' : 'Pendente'}</strong></Card></div>
                            <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-1">Estoque</span><strong>{resumo.estoque?.aplicavel ? (resumo.estoque.baixado ? 'Baixado' : `${resumo.estoque.itensPendentes} pendente(s)`) : 'Não aplicável'}</strong></Card></div>
                            <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-1">Financeiro</span><strong>{resumo.financeiro?.aplicavel ? (resumo.financeiro.contaReceberGerada ? 'Gerado' : 'Pendente') : 'Não aplicável'}</strong></Card></div>
                            {resumo.alertas?.map((alerta) => <div key={alerta} className="col-12"><Message severity="warn" className="w-full" text={alerta} /></div>)}
                        </div>
                    ) : null}
                    <div className="grid">
                        <div className="col-12 lg:col-8">
                            <Card title="Cabeçalho" className="mb-3">
                                <div className="grid">
                                    <DetailValue label="Status" value={<StatusTag status={statusNotaFiscalTagValue(nota.statusFiscal)} />} />
                                    <DetailValue label="Tipo documento" value={tipoDocumentoFiscalLabel(nota.tipoDocumento)} />
                                    <DetailValue label="Operação" value={tipoOperacaoFiscalLabel(nota.tipoOperacao)} />
                                    <DetailValue label="Empresa" value={fiscalReferenceContextLabel('Empresa', nota.empresaId)} />
                                    <DetailValue label="Filial" value={fiscalReferenceContextLabel('Filial', nota.filialId)} />
                                    <DetailValue label="Origem" value={fiscalOrigemContextLabel(nota.origem, nota.origemId)} />
                                    <DetailValue label="Chave acesso" value={nota.chaveAcesso ?? '-'} mono />
                                    <DetailValue label="Protocolo" value={nota.protocoloAutorizacao ?? '-'} mono />
                                    <DetailValue label="Emissão" value={formatFiscalDate(nota.dataEmissao)} />
                                    <DetailValue label="Autorizada em" value={formatFiscalDate(nota.autorizadaEm)} />
                                    <DetailValue label="Cancelada em" value={formatFiscalDate(nota.canceladaEm)} />
                                    <DetailValue label="Total" value={formatFiscalMoney(nota.valorTotal)} />
                                </div>
                                {nota.codigoRejeicao || nota.mensagemRejeicao ? <Message severity="warn" className="w-full mt-3" text={`${nota.codigoRejeicao ?? '-'} • ${nota.mensagemRejeicao ?? ''}`} /> : null}
                                {nota.motivoCancelamento ? <Message severity="error" className="w-full mt-3" text={nota.motivoCancelamento} /> : null}
                            </Card>
                            <ComposicaoTotalNotaFiscalCard nota={nota} />
                        </div>
                        <div className="col-12 lg:col-4">
                            <Card title="Governança fiscal" className="mb-3">
                                <div className="flex flex-column gap-2">
                                    <Tag value={statusNotaFiscalLabel(nota.statusFiscal)} severity={Number(nota.statusFiscal) === StatusNotaFiscal.Autorizada ? 'success' : 'info'} />
                                    {bloqueios.map((bloqueio) => <Message key={bloqueio} severity="warn" text={bloqueio} className="w-full" />)}
                                </div>
                            </Card>
                            <Card title="Ações autorizadas" className="mb-3">
                                <div className="flex flex-column gap-2">
                                    <PermissionGuard permission="FISCAL_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Armazenar XML" icon="pi pi-save" outlined disabled={disabled} onClick={() => setDialog('armazenarXml')} />}</PermissionGuard>
                                    <PermissionGuard permission="FISCAL_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Registrar rejeição" icon="pi pi-exclamation-triangle" outlined disabled={disabled || !actionStates.registrarRejeicao.habilitada} title={fiscalActionDisabledReason(disabled, actionStates.registrarRejeicao, 'FISCAL_GERENCIAR')} onClick={() => setDialog('rejeicao')} />}</PermissionGuard>
                                    <PermissionGuard permission="FISCAL_CANCELAR" mode="disable">{({ disabled }) => <Button label="Cancelar local" icon="pi pi-ban" severity="danger" outlined disabled={disabled || !actionStates.cancelar.habilitada} title={fiscalActionDisabledReason(disabled, actionStates.cancelar, 'FISCAL_CANCELAR')} onClick={() => setDialog('cancelarLocal')} />}</PermissionGuard>
                                    <PermissionGuard permission="FISCAL_CANCELAR" mode="disable">{({ disabled }) => <Button label="Cancelar SEFAZ" icon="pi pi-cloud-upload" severity="danger" disabled={disabled || !actionStates.cancelar.habilitada} title={fiscalActionDisabledReason(disabled, actionStates.cancelar, 'FISCAL_CANCELAR')} onClick={() => setDialog('cancelarSefaz')} />}</PermissionGuard>
                                    <PermissionGuard permission="FISCAL_CARTA_CORRECAO" mode="disable">{({ disabled }) => <Button label="Carta correção" icon="pi pi-file-edit" disabled={disabled || !actionStates.cartaCorrecao.habilitada} title={fiscalActionDisabledReason(disabled, actionStates.cartaCorrecao, 'FISCAL_CARTA_CORRECAO')} onClick={() => setDialog('cce')} />}</PermissionGuard>
                                    <PermissionGuard permission="FISCAL_EMITIR" mode="disable">{({ disabled }) => <Button label="Consultar protocolo" icon="pi pi-search" outlined disabled={disabled || !actionStates.consultarProtocolo.habilitada} title={fiscalActionDisabledReason(disabled, actionStates.consultarProtocolo, 'FISCAL_EMITIR')} onClick={() => setDialog('consultarProtocolo')} />}</PermissionGuard>
                                    <PermissionGuard permission="FISCAL_EMITIR" mode="disable">{({ disabled }) => <Button label="Contingência" icon="pi pi-exclamation-circle" outlined disabled={disabled || !actionStates.contingencia.habilitada} title={fiscalActionDisabledReason(disabled, actionStates.contingencia, 'FISCAL_EMITIR')} onClick={() => setDialog('contingencia')} />}</PermissionGuard>
                                    <PermissionGuard permission="ESTOQUE_MOVIMENTAR" mode="disable">{({ disabled }) => <Button label="Baixar estoque" icon="pi pi-box" outlined disabled={disabled || !actionStates.baixarEstoque.habilitada} title={fiscalActionDisabledReason(disabled, actionStates.baixarEstoque, 'ESTOQUE_MOVIMENTAR')} onClick={() => setDialog('baixarEstoque')} />}</PermissionGuard>
                                    <PermissionGuard permission="FINANCEIRO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Gerar financeiro" icon="pi pi-dollar" outlined disabled={disabled || !actionStates.gerarFinanceiro.habilitada} title={fiscalActionDisabledReason(disabled, actionStates.gerarFinanceiro, 'FINANCEIRO_GERENCIAR')} onClick={() => setDialog('gerarFinanceiro')} />}</PermissionGuard>
                                    <PermissionGuard permission="FISCAL_EMITIR" mode="disable">{({ disabled }) => <Button label="Gerar DANFE" icon="pi pi-file-pdf" disabled={disabled || !actionStates.danfe.habilitada} title={fiscalActionDisabledReason(disabled, actionStates.danfe, 'FISCAL_EMITIR')} onClick={() => setDialog('danfe')} />}</PermissionGuard>
                                    {ultimoDocumento ? <Button label="Baixar último documento" icon="pi pi-download" severity="success" outlined onClick={() => baixarDocumento(ultimoDocumento)} /> : null}
                                </div>
                            </Card>
                        </div>
                    </div>

                    <TabView>
                        <TabPanel header="Workflow">
                            {workflow ? (
                                <>
                                    <div className="grid mb-3">
                                        <DetailValue label="Etapa atual" value={workflow.etapaAtual ?? '-'} />
                                        <DetailValue label="Progresso" value={`${workflow.percentualConcluido}%`} />
                                        <DetailValue label="Próximas ações" value={workflow.proximasAcoes?.length ?? 0} />
                                    </div>
                                    {workflow.bloqueios?.map((bloqueio) => <Message key={bloqueio} severity="warn" className="w-full mb-2" text={bloqueio} />)}
                                    <DataTable value={workflow.etapas ?? []} emptyMessage="Nenhuma etapa retornada." size="small">
                                        <Column field="ordem" header="Ordem" />
                                        <Column field="codigo" header="Código" />
                                        <Column field="nome" header="Etapa" />
                                        <Column field="status" header="Status" />
                                        <Column field="permissao" header="Permissão" />
                                        <Column field="motivoBloqueio" header="Bloqueio" />
                                    </DataTable>
                                </>
                            ) : <Message severity="info" className="w-full" text="Workflow operacional não carregado." />}
                        </TabPanel>
                        <TabPanel header={`Integrações (${integracoes.length})`}>
                            <Message severity="info" className="w-full mb-3" text="Logs fiscais devem permanecer sanitizados. XML completo, token, senha, certificado e payload técnico não devem aparecer na tela." />
                            <FiscalIntegracoesTable
                                logs={integracoes}
                                loading={integracoesQuery.isFetching}
                                onReprocessar={(row) => {
                                    setLogReprocessamento(row);
                                    setDialog('reprocessar');
                                }}
                            />
                        </TabPanel>
                        <TabPanel header={`Itens (${nota.itens?.length ?? 0})`}>
                            <DataTable value={nota.itens ?? []} emptyMessage="Nenhum item fiscal." size="small" paginator rows={10}>
                                <Column field="sequencia" header="Seq." />
                                <Column field="codigoItem" header="Código" />
                                <Column field="descricao" header="Descrição" />
                                <Column field="ncm" header="NCM" />
                                <Column field="cfop" header="CFOP" />
                                <Column field="unidadeComercial" header="Un." />
                                <Column field="quantidade" header="Qtd." />
                                <Column header="Unitário" body={(row) => formatFiscalMoney(row.valorUnitario)} />
                                <Column header="Total" body={(row) => formatFiscalMoney(row.valorTotal)} />
                            </DataTable>
                        </TabPanel>
                        <TabPanel header={`Impostos (${nota.impostos?.length ?? 0})`}>
                            <ImpostosNotaFiscalTabela nota={nota} />
                        </TabPanel>
                        <TabPanel header={`XMLs (${nota.xmls?.length ?? 0})`}>
                            <Message severity="info" className="w-full mb-3" text="Esta aba exibe somente metadados de XML. O conteúdo XML completo não deve ser carregado ou exibido no detalhe fiscal." />
                            <DataTable value={nota.xmls ?? []} emptyMessage="Nenhum XML armazenado." size="small" paginator rows={10}>
                                <Column header="Tipo" body={(row) => tipoXmlFiscalLabel(row.tipo)} />
                                <Column field="hashSha256" header="Hash SHA-256" />
                                <Column field="protocolo" header="Protocolo" />
                                <Column field="chaveAcesso" header="Chave" />
                                <Column header="Armazenado em" body={(row) => formatFiscalDate(row.armazenadoEm)} />
                            </DataTable>
                        </TabPanel>
                        <TabPanel header={`Eventos (${nota.eventos?.length ?? 0})`}>
                            <Message severity="info" className="w-full mb-3" text="Eventos fiscais representam histórico operacional/status. Alterações legais e prazos devem ser validados pelo backend e por especialista fiscal." />
                            <DataTable value={nota.eventos ?? []} emptyMessage="Nenhum evento fiscal." size="small" paginator rows={10}>
                                <Column header="Tipo" body={(row) => tipoEventoFiscalLabel(row.tipo)} />
                                <Column field="codigo" header="Código" />
                                <Column field="descricao" header="Descrição" />
                                <Column field="protocolo" header="Protocolo" />
                                <Column header="Data" body={(row) => formatFiscalDate(row.dataEvento)} />
                            </DataTable>
                        </TabPanel>
                        <TabPanel header={`Documentos auxiliares (${documentosAuxiliares.length})`}>
                            <FiscalDocumentosAuxiliaresPanel documentos={documentosAuxiliares} possuiDanfe={resumo?.possuiDanfe} onDownload={baixarDocumento} />
                        </TabPanel>
                    </TabView>

                    <ItemNotaFiscalDialog empresaId={nota.empresaId} filialId={nota.filialId} visible={dialog === 'item'} loading={mutations.adicionarItemMutation.isPending} onHide={() => setDialog(null)} onSubmit={(values) => run('Item fiscal', () => mutations.adicionarItemMutation.mutateAsync({ id: notaId, values }), 'Item incluído.')} />
                    <ImpostoNotaFiscalDialog itens={nota.itens ?? []} visible={dialog === 'imposto'} loading={mutations.adicionarImpostoMutation.isPending} onHide={() => setDialog(null)} onSubmit={(values) => run('Imposto fiscal', () => mutations.adicionarImpostoMutation.mutateAsync({ id: notaId, values }), 'Imposto incluído.')} />
                    <ValoresAcessoriosDialog nota={nota} visible={dialog === 'valoresAcessorios'} loading={mutations.definirValoresAcessoriosMutation.isPending} onHide={() => setDialog(null)} onSubmit={definirValoresAcessorios} />
                    <XmlPipelineDialog mode="gerar" visible={dialog === 'gerarXml'} loading={mutations.gerarXmlMutation.isPending} onHide={() => setDialog(null)} onSubmit={gerarXml} />
                    <XmlPipelineDialog mode="assinar" visible={dialog === 'assinarXml'} loading={mutations.assinarXmlMutation.isPending} onHide={() => setDialog(null)} onSubmit={assinarXml} />
                    <TransmitirSefazDialog visible={dialog === 'transmitir'} loading={mutations.transmitirMutation.isPending} onHide={() => setDialog(null)} onSubmit={transmitir} />
                    <ArmazenarXmlDialog visible={dialog === 'armazenarXml'} loading={mutations.armazenarXmlMutation.isPending} onHide={() => setDialog(null)} onSubmit={(values) => run('XML fiscal', () => mutations.armazenarXmlMutation.mutateAsync({ id: notaId, values }), 'XML armazenado.')} />
                    <RegistrarRejeicaoDialog visible={dialog === 'rejeicao'} loading={mutations.registrarRejeicaoMutation.isPending} onHide={() => setDialog(null)} onSubmit={(values) => run('Rejeição fiscal', () => mutations.registrarRejeicaoMutation.mutateAsync({ id: notaId, values }), 'Rejeição registrada.')} />
                    <CancelarNotaLocalDialog visible={dialog === 'cancelarLocal'} loading={mutations.cancelarMutation.isPending} onHide={() => setDialog(null)} onSubmit={(values) => run('Cancelamento fiscal', () => mutations.cancelarMutation.mutateAsync({ id: notaId, values }), 'Nota cancelada localmente.')} />
                    <CancelarNotaSefazDialog visible={dialog === 'cancelarSefaz'} loading={mutations.cancelarSefazMutation.isPending} onHide={() => setDialog(null)} onSubmit={(values) => run('Cancelamento SEFAZ', () => mutations.cancelarSefazMutation.mutateAsync({ id: notaId, values }), 'Retorno de cancelamento recebido.')} />
                    <CartaCorrecaoDialog visible={dialog === 'cce'} loading={mutations.cartaCorrecaoMutation.isPending} onHide={() => setDialog(null)} onSubmit={(values) => run('Carta de correção', () => mutations.cartaCorrecaoMutation.mutateAsync({ id: notaId, values }), 'Carta de correção emitida.')} />
                    <ConsultarProtocoloDialog visible={dialog === 'consultarProtocolo'} loading={mutations.consultarProtocoloMutation.isPending} onHide={() => setDialog(null)} onSubmit={consultarProtocolo} />
                    <HabilitarContingenciaDialog visible={dialog === 'contingencia'} loading={mutations.habilitarContingenciaMutation.isPending} onHide={() => setDialog(null)} onSubmit={habilitarContingencia} />
                    <ReprocessarSefazDialog visible={dialog === 'reprocessar'} loading={mutations.reprocessarMutation.isPending} onHide={() => setDialog(null)} onSubmit={reprocessar} logIntegracaoFiscalId={logReprocessamento?.id} correlationIdOriginal={logReprocessamento?.correlationId} mensagemFalha={logReprocessamento?.mensagem} payloadResumo={logReprocessamento?.payloadResumo} />
                    <BaixarEstoqueDialog visible={dialog === 'baixarEstoque'} loading={mutations.baixarEstoqueMutation.isPending} onHide={() => setDialog(null)} onSubmit={baixarEstoque} documento={`NF-${nota.numero}`} />
                    <GerarContaReceberDialog visible={dialog === 'gerarFinanceiro'} loading={mutations.gerarContaReceberMutation.isPending} onHide={() => setDialog(null)} onSubmit={gerarContaReceber} documento={`NF-${nota.numero}`} empresaId={nota.empresaId} filialId={nota.filialId} />
                    <DanfeDialog visible={dialog === 'danfe'} loading={mutations.gerarDanfeMutation.isPending} onHide={() => setDialog(null)} onSubmit={gerarDanfe} />
                </>
            ) : null}
        </>
    );
};
