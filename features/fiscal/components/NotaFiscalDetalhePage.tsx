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
    XmlPipelineDialog
} from '@/features/fiscal/components/FiscalActionDialogs';
import {
    fiscalOrigemContextLabel,
    fiscalReferenceContextLabel,
    formatFiscalDate,
    formatFiscalMoney,
    notaFiscalBloqueiosVisuais,
    notaPodeAssinarXml,
    notaPodeCancelar,
    notaPodeCartaCorrecao,
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
import { DocumentoAuxiliarFiscalResponse, LogIntegracaoFiscalResponse, NotaFiscalXmlPipelineResponse, TransmissaoSefazResponse } from '@/features/fiscal/types/fiscal.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { StatusNotaFiscal } from '@/types/erp';

const DetailValue = ({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) => (
    <div className="col-12 md:col-4">
        <span className="block text-color-secondary mb-1">{label}</span>
        <strong className={mono ? 'font-mono text-sm break-all' : undefined}>{value ?? '-'}</strong>
    </div>
);

const ResponsePanel = ({ xml, transmissao, documento }: { xml?: NotaFiscalXmlPipelineResponse | null; transmissao?: TransmissaoSefazResponse | null; documento?: DocumentoAuxiliarFiscalResponse | null }) => {
    if (!xml && !transmissao && !documento) return null;
    return (
        <Card title="Último retorno operacional" className="mb-3">
            {xml ? <Message severity="info" className="w-full mb-2" text={`XML ${tipoXmlFiscalLabel(xml.tipoXml)} gerado. Schema validado: ${xml.schemaValidado ? 'sim' : 'não'}. Armazenado: ${xml.armazenado ? 'sim' : 'não'}.`} /> : null}
            {transmissao ? <Message severity={transmissao.autorizada ? 'success' : 'warn'} className="w-full mb-2" text={`${transmissao.codigoStatus ?? '-'} • ${transmissao.motivo ?? 'Sem motivo retornado'}${transmissao.deveReprocessar ? ' • Reprocessamento recomendado.' : ''}`} /> : null}
            {documento ? <Message severity="success" className="w-full" text={`Documento ${documento.nomeArquivo} gerado com hash ${documento.hashSha256}.`} /> : null}
        </Card>
    );
};

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

    const gerarXml = (values: unknown) => run('XML fiscal', async () => setUltimoXml(await mutations.gerarXmlMutation.mutateAsync({ id: notaId, values })), 'XML de envio gerado.');
    const assinarXml = (values: unknown) => run('Assinatura XML', async () => setUltimoXml(await mutations.assinarXmlMutation.mutateAsync({ id: notaId, values })), 'XML de envio assinado.');
    const transmitir = (values: unknown) => run('Transmissão SEFAZ', async () => setUltimaTransmissao(await mutations.transmitirMutation.mutateAsync({ id: notaId, values })), 'Retorno da transmissão recebido.');
    const reprocessar = (values: unknown) => run('Reprocessamento SEFAZ', async () => setUltimaTransmissao(await mutations.reprocessarMutation.mutateAsync({ id: notaId, values })), 'Reprocessamento concluído.');
    const consultarProtocolo = (values: unknown) => run('Consulta protocolo', async () => { await mutations.consultarProtocoloMutation.mutateAsync({ id: notaId, values }); }, 'Consulta realizada.');
    const habilitarContingencia = (values: unknown) => run('Contingência fiscal', async () => { await mutations.habilitarContingenciaMutation.mutateAsync({ id: notaId, values }); }, 'Contingência avaliada/habilitada.');
    const gerarDanfe = (values: unknown) => run('DANFE', async () => setUltimoDocumento(await mutations.gerarDanfeMutation.mutateAsync({ id: notaId, values })), 'Documento auxiliar gerado.');
    const baixarEstoque = (values: unknown) => run('Baixa de estoque', async () => { await mutations.baixarEstoqueMutation.mutateAsync({ id: notaId, values }); }, 'Baixa de estoque processada.');
    const gerarContaReceber = (values: unknown) => run('Financeiro fiscal', async () => { await mutations.gerarContaReceberMutation.mutateAsync({ id: notaId, values }); }, 'Conta a receber gerada ou conciliada.');

    const baixarDocumento = async () => {
        if (!ultimoDocumento) return;
        try {
            const arquivo = await fiscalApi.baixarDocumentoAuxiliar(ultimoDocumento.id);
            const url = URL.createObjectURL(arquivo.blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = arquivo.filename ?? ultimoDocumento.nomeArquivo;
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
            {nota ? (
                <>
                    <ResponsePanel xml={ultimoXml} transmissao={ultimaTransmissao} documento={ultimoDocumento} />
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
                                    {ultimoDocumento ? <Button label="Baixar último documento" icon="pi pi-download" severity="success" outlined onClick={baixarDocumento} /> : null}
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
                            <DataTable value={integracoes} emptyMessage="Nenhum log de integração fiscal." size="small" paginator rows={10}>
                                <Column field="operacao" header="Operação" />
                                <Column field="statusIntegracao" header="Status" />
                                <Column field="correlationId" header="Correlation ID" />
                                <Column field="mensagem" header="Mensagem" />
                                <Column header="Registrado em" body={(row: LogIntegracaoFiscalResponse) => formatFiscalDate(row.registradoEm)} />
                                <Column header="Sensível mascarado" body={(row: LogIntegracaoFiscalResponse) => row.contemDadoSensivelOcultado ? 'Sim' : 'Não'} />
                                <Column header="Ação" body={(row: LogIntegracaoFiscalResponse) => row.podeReprocessar ? <PermissionGuard permission="FISCAL_EMITIR" mode="disable">{({ disabled }) => <Button label="Reprocessar" icon="pi pi-refresh" size="small" outlined disabled={disabled} onClick={() => { setLogReprocessamento(row); setDialog('reprocessar'); }} />}</PermissionGuard> : '-'} />
                            </DataTable>
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
                            <Message severity="info" className="w-full mb-3" text="Impostos são parametrizados/manuais nesta etapa. O frontend não calcula ICMS, IPI, PIS, COFINS ou ISS automaticamente." />
                            <DataTable value={nota.impostos ?? []} emptyMessage="Nenhum imposto informado." size="small" paginator rows={10}>
                                <Column field="nome" header="Imposto" />
                                <Column field="cstCsosn" header="CST/CSOSN" />
                                <Column header="Base" body={(row) => formatFiscalMoney(row.baseCalculo)} />
                                <Column field="aliquota" header="Alíquota" />
                                <Column header="Valor" body={(row) => formatFiscalMoney(row.valor)} />
                            </DataTable>
                        </TabPanel>
                        <TabPanel header={`XMLs (${nota.xmls?.length ?? 0})`}>
                            <DataTable value={nota.xmls ?? []} emptyMessage="Nenhum XML armazenado." size="small" paginator rows={10}>
                                <Column header="Tipo" body={(row) => tipoXmlFiscalLabel(row.tipo)} />
                                <Column field="hashSha256" header="Hash SHA-256" />
                                <Column field="protocolo" header="Protocolo" />
                                <Column field="chaveAcesso" header="Chave" />
                                <Column header="Armazenado em" body={(row) => formatFiscalDate(row.armazenadoEm)} />
                            </DataTable>
                        </TabPanel>
                        <TabPanel header={`Eventos (${nota.eventos?.length ?? 0})`}>
                            <DataTable value={nota.eventos ?? []} emptyMessage="Nenhum evento fiscal." size="small" paginator rows={10}>
                                <Column header="Tipo" body={(row) => tipoEventoFiscalLabel(row.tipo)} />
                                <Column field="codigo" header="Código" />
                                <Column field="descricao" header="Descrição" />
                                <Column field="protocolo" header="Protocolo" />
                                <Column header="Data" body={(row) => formatFiscalDate(row.dataEvento)} />
                            </DataTable>
                        </TabPanel>
                    </TabView>

                    <ItemNotaFiscalDialog empresaId={nota.empresaId} filialId={nota.filialId} visible={dialog === 'item'} loading={mutations.adicionarItemMutation.isPending} onHide={() => setDialog(null)} onSubmit={(values) => run('Item fiscal', () => mutations.adicionarItemMutation.mutateAsync({ id: notaId, values }), 'Item incluído.')} />
                    <ImpostoNotaFiscalDialog itens={nota.itens ?? []} visible={dialog === 'imposto'} loading={mutations.adicionarImpostoMutation.isPending} onHide={() => setDialog(null)} onSubmit={(values) => run('Imposto fiscal', () => mutations.adicionarImpostoMutation.mutateAsync({ id: notaId, values }), 'Imposto incluído.')} />
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
                    <ReprocessarSefazDialog visible={dialog === 'reprocessar'} loading={mutations.reprocessarMutation.isPending} onHide={() => setDialog(null)} onSubmit={reprocessar} logIntegracaoFiscalId={logReprocessamento?.id} correlationIdOriginal={logReprocessamento?.correlationId} />
                    <BaixarEstoqueDialog visible={dialog === 'baixarEstoque'} loading={mutations.baixarEstoqueMutation.isPending} onHide={() => setDialog(null)} onSubmit={baixarEstoque} documento={`NF-${nota.numero}`} />
                    <GerarContaReceberDialog visible={dialog === 'gerarFinanceiro'} loading={mutations.gerarContaReceberMutation.isPending} onHide={() => setDialog(null)} onSubmit={gerarContaReceber} documento={`NF-${nota.numero}`} empresaId={nota.empresaId} filialId={nota.filialId} />
                    <DanfeDialog visible={dialog === 'danfe'} loading={mutations.gerarDanfeMutation.isPending} onHide={() => setDialog(null)} onSubmit={gerarDanfe} />
                </>
            ) : null}
        </>
    );
};
