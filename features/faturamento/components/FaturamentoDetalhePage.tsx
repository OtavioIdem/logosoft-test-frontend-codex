'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAppToast } from '@/hooks/useAppToast';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { AnexosPanel } from '@/features/anexos/components/AnexosPanel';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { usePedidosVenda } from '@/features/vendas/hooks/useVendasResources';
import { useFaturamento, useFaturamentoHistorico, useFaturamentoMutations, useFaturamentoOcorrencias } from '@/features/faturamento/hooks/useFaturamentoResources';
import {
    AcaoRetomadaReversaoLeg,
    ConfirmarFaturamentoRequestValues,
    EstadoLegIntegracaoFaturamento,
    FaturamentoHistoricoResponse,
    FaturamentoOcorrenciaResponse,
    ResultadoConfirmacaoFaturamento,
    RetomarReversaoFormValues,
    StatusFaturamento
} from '@/features/faturamento/types/faturamento.types';
import { ConfirmarFaturamentoDialog, RetomarReversaoDialog } from '@/features/faturamento/components/FaturamentoDialogs';
import { ResultadoConfirmacaoPanel } from '@/features/faturamento/components/ResultadoConfirmacaoPanel';
import {
    confirmacaoBloqueadaPorReversao,
    descricaoLegQueParou,
    estadoLegLabel,
    estadoLegSeverity,
    FATURAMENTO_DETALHE,
    FATURAMENTO_LISTA,
    FATURAMENTO_RESULTADO,
    legQueParou,
    LinhaLegFaturamento,
    montarLinhasDeLegs,
    podeCancelar,
    podeConfirmar,
    resumoResultadoConfirmacao,
    statusFaturamentoLabel,
    statusFaturamentoSeverity,
    tipoOcorrenciaLabel,
    tipoOcorrenciaSeverity
} from '@/features/faturamento/components/faturamentoLabels';
import { formatMoney } from '@/lib/formatters/money';

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

// D95: cliente por rótulo, no padrão do resumo da aprovação (D79). Só monta quando o pedido foi achado, então
// a consulta de clientes e pessoas não sai sem pedido resolvido.
const ClientePedidoRotulo = ({ empresaId, filialId, clienteId }: { empresaId: string; filialId: string | null; clienteId: string }) => {
    const clientesQuery = useClientes({ empresaId, filialId });
    const pessoasQuery = usePessoas({ empresaId, filialId });
    const rotulo = useMemo(() => {
        const cliente = (clientesQuery.data ?? []).find((item) => item.id === clienteId);
        if (!cliente) return null;
        const pessoa = (pessoasQuery.data ?? []).find((item) => item.id === cliente.pessoaId);
        return pessoa ? `${cliente.codigo} • ${pessoa.nomeRazaoSocial}` : cliente.codigo;
    }, [clientesQuery.data, pessoasQuery.data, clienteId]);

    return rotulo ? <strong>{rotulo}</strong> : <span className="text-color-secondary">{FATURAMENTO_DETALHE.clienteNaoCarregado}</span>;
};

export const FaturamentoDetalhePage = ({ faturamentoId }: { faturamentoId: string }) => {
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const toast = useAppToast();
    const runWithToast = useMutationWithToast();
    const [dialog, setDialog] = useState<'confirmar' | 'cancelar' | null>(null);
    const [legEmRetomada, setLegEmRetomada] = useState<number | null>(null);

    const faturamentoQuery = useFaturamento(faturamentoId);
    const historicoQuery = useFaturamentoHistorico(faturamentoId);
    const ocorrenciasQuery = useFaturamentoOcorrencias(faturamentoId);
    const { confirmarMutation, cancelarMutation, retomarReversaoMutation } = useFaturamentoMutations();
    const faturamento = faturamentoQuery.data ?? null;
    const [ultimaConfirmacao, setUltimaConfirmacao] = useState<ResultadoConfirmacaoFaturamento | null>(null);

    // D95 (FT-15): pedido por número, sem GUID cru. Uma consulta da lista de pedidos da empresa (teto do
    // backend, `VendasRepository.cs:40`), nunca uma por faturamento; fora dela, rótulo neutro (D66).
    const pedidosQuery = usePedidosVenda({ empresaId: faturamento?.empresaId ?? null });
    const pedido = useMemo(() => (pedidosQuery.data ?? []).find((item) => item.id === faturamento?.pedidoVendaId) ?? null, [pedidosQuery.data, faturamento]);

    const linhasLegs = useMemo(() => montarLinhasDeLegs(faturamento?.legs), [faturamento]);
    const legParado = useMemo(() => legQueParou(faturamento?.legs), [faturamento]);
    // D27: o diálogo só fica visível enquanto a linha atual (reconsultada) mostrar o leg em EmReversao.
    const linhaEmRetomada = legEmRetomada !== null ? linhasLegs.find((linha) => linha.leg === legEmRetomada) ?? null : null;
    const dialogRetomarVisivel = legEmRetomada !== null && Number(linhaEmRetomada?.registro?.estado) === EstadoLegIntegracaoFaturamento.EmReversao;

    if (!hasPermission('FATURAMENTO_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de Faturamento exige a permissão FATURAMENTO_CONSULTAR." />;
    }

    // D93: o toast e o painel leem a etapa REAL da resposta; "Faturamento confirmado" só com etapa Faturado.
    const confirmar = async (values: ConfirmarFaturamentoRequestValues) => {
        await runWithToast(
            async () => {
                const resposta = await confirmarMutation.mutateAsync({ id: faturamentoId, values });
                setDialog(null);
                setUltimaConfirmacao({ resposta, correlationId: values.correlationId });
                const resumo = resumoResultadoConfirmacao(resposta.faturamento);
                if (resumo.severity === 'success') toast.success(resumo.titulo, resumo.detalhe);
                else if (resumo.severity === 'error') toast.error(resumo.titulo, resumo.detalhe);
                else toast.info(resumo.titulo, resumo.detalhe);
            },
            { error: { summary: 'Erro ao confirmar', detail: 'Não foi possível confirmar o faturamento.' }, rethrow: true }
        );
    };

    // Nova tentativa: o resultado anterior sai da tela (o sinal persistente do leg que parou volta a valer).
    const abrirConfirmar = () => {
        confirmarMutation.reset();
        setUltimaConfirmacao(null);
        setDialog('confirmar');
    };

    const fecharConfirmar = () => {
        setDialog(null);
        confirmarMutation.reset();
    };

    const cancelar = async (motivo: string) => {
        await runWithToast(
            async () => {
                await cancelarMutation.mutateAsync({ id: faturamentoId, motivo });
                setDialog(null);
            },
            { success: { summary: 'Faturamento cancelado' }, error: { summary: 'Erro ao cancelar' }, rethrow: true }
        );
    };

    const retomar = async (values: RetomarReversaoFormValues) => {
        const declarando = Number(values.acao) === AcaoRetomadaReversaoLeg.DeclararEfeitoDesfeito;
        await runWithToast(
            async () => {
                await retomarReversaoMutation.mutateAsync({ id: faturamentoId, values });
                setLegEmRetomada(null);
            },
            {
                success: declarando
                    ? { summary: 'Declaração registrada', detail: 'O operador declarou o efeito desfeito; é uma afirmação humana auditada, não uma confirmação do sistema.' }
                    : { summary: 'Reversão confirmada pelo sistema' },
                error: { summary: 'Erro ao retomar a reversão' },
                rethrow: true
            }
        );
    };

    const etapa = faturamento ? Number(faturamento.etapa) : 0;

    const headerActions = (
        <div className="flex gap-2 flex-wrap justify-content-end">
            <Button label="Voltar" icon="pi pi-arrow-left" severity="secondary" outlined onClick={() => router.push('/faturamento')} />
            {faturamento && podeConfirmar(etapa) ? (
                <PermissionGuard permission="FATURAMENTO_CONFIRMAR" mode="disable">
                    {({ disabled }) => {
                        const bloqueadoPorReversao = confirmacaoBloqueadaPorReversao(faturamento);
                        return (
                            <Button
                                label="Confirmar"
                                icon="pi pi-check"
                                severity="success"
                                disabled={disabled || bloqueadoPorReversao}
                                tooltip={bloqueadoPorReversao ? 'Há um leg em reversão. Retome a reversão antes de confirmar o faturamento.' : undefined}
                                tooltipOptions={{ showOnDisabled: true }}
                                onClick={abrirConfirmar}
                            />
                        );
                    }}
                </PermissionGuard>
            ) : null}
            {faturamento && podeCancelar(etapa) ? <PermissionGuard permission="FATURAMENTO_CANCELAR" mode="disable">{({ disabled }) => <Button label="Cancelar" icon="pi pi-ban" severity="danger" outlined disabled={disabled} onClick={() => setDialog('cancelar')} />}</PermissionGuard> : null}
        </div>
    );

    return (
        <>
            <PageHeader title="Faturamento" description="Wizard Preparar → Confirmar, com histórico e ocorrências fiscais." actions={headerActions} />

            {faturamentoQuery.isLoading ? <LoadingState variant="detail" /> : null}
            {faturamentoQuery.error ? <ApiErrorPanel error={mapApiError(faturamentoQuery.error)} /> : null}

            {faturamento ? (
                <>
                    <Card className="mb-3">
                        <div className="grid">
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Etapa</span><Tag value={statusFaturamentoLabel(etapa)} severity={statusFaturamentoSeverity(etapa) ?? undefined} /></div>
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Valor total</span><strong>{formatMoney(faturamento.valorTotal)}</strong></div>
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Confirmado em</span>{formatDateTime(faturamento.confirmadoEm)}</div>
                            <div className="col-12 md:col-3">
                                <span className="block text-color-secondary text-sm">{FATURAMENTO_DETALHE.pedidoRotulo}</span>
                                <Button label={pedido?.numero ?? FATURAMENTO_LISTA.pedidoForaDaLista} icon="pi pi-external-link" text className="p-0" onClick={() => router.push(`/vendas/pedidos/${faturamento.pedidoVendaId}`)} />
                            </div>
                            <div className="col-12 md:col-6">
                                <span className="block text-color-secondary text-sm">{FATURAMENTO_DETALHE.clienteRotulo}</span>
                                {pedido ? <ClientePedidoRotulo empresaId={pedido.empresaId} filialId={pedido.filialId ?? null} clienteId={pedido.clienteId} /> : <span className="text-color-secondary">{FATURAMENTO_DETALHE.clienteNaoCarregado}</span>}
                            </div>
                            {faturamento.notaFiscalId ? <div className="col-12 md:col-6"><span className="block text-color-secondary text-sm">Nota fiscal</span><Button label="Abrir nota fiscal" icon="pi pi-file" text onClick={() => router.push(`/fiscal/notas/${faturamento.notaFiscalId}`)} /></div> : null}
                            {faturamento.contaReceberId ? <div className="col-12 md:col-6"><span className="block text-color-secondary text-sm">Conta a receber</span>{FATURAMENTO_DETALHE.contaReceberGerada}</div> : null}
                            {faturamento.motivoCancelamento ? <div className="col-12"><Message className="w-full" severity="error" text={`Cancelado: ${faturamento.motivoCancelamento}`} /></div> : null}
                        </div>
                    </Card>

                    {faturamento.etapaDivergeDosLegs ? (
                        <Message
                            className="w-full mb-3"
                            severity="error"
                            text="A etapa do faturamento não reflete o estado dos legs: há leg integrado cujo efeito a etapa atual não mostra. Se a etapa é Erro ou Cancelado, esse efeito pode continuar de pé. Confira os legs abaixo e as ocorrências."
                        />
                    ) : null}
                    {faturamento.possuiLegEmReversao ? (
                        <Message
                            className="w-full mb-3"
                            severity="warn"
                            text="Há um leg em reversão: o efeito original pode continuar de pé até a retomada."
                        />
                    ) : null}

                    {ultimaConfirmacao ? (
                        <ResultadoConfirmacaoPanel
                            resultado={ultimaConfirmacao}
                            podeConfirmarDeNovo={podeConfirmar(etapa) && hasPermission('FATURAMENTO_CONFIRMAR') && !confirmacaoBloqueadaPorReversao(faturamento)}
                            onConfirmarDeNovo={abrirConfirmar}
                        />
                    ) : legParado && etapa === StatusFaturamento.Erro ? (
                        <Message className="w-full mb-3" severity="error" text={`${FATURAMENTO_RESULTADO.persistentePrefixo} ${descricaoLegQueParou(legParado)} ${FATURAMENTO_RESULTADO.proximoPasso}`} />
                    ) : null}

                    <Card title="Legs de integração" className="mb-3">
                        <DataTable value={linhasLegs} dataKey="key" responsiveLayout="scroll" stripedRows size="small">
                            <Column header="Leg" body={(row: LinhaLegFaturamento) => row.legLabel} />
                            <Column
                                header="Estado"
                                body={(row: LinhaLegFaturamento) =>
                                    row.registro ? (
                                        <Tag value={estadoLegLabel(Number(row.registro.estado))} severity={estadoLegSeverity(Number(row.registro.estado)) ?? undefined} />
                                    ) : (
                                        <span className="text-color-secondary">Sem registro</span>
                                    )
                                }
                            />
                            <Column header="Ocorreu em" body={(row: LinhaLegFaturamento) => (row.registro ? formatDateTime(row.registro.ocorreuEm) : '—')} />
                            <Column header="Motivo" body={(row: LinhaLegFaturamento) => row.registro?.motivo ?? '—'} />
                            <Column
                                header="Ação"
                                body={(row: LinhaLegFaturamento) =>
                                    row.registro && Number(row.registro.estado) === EstadoLegIntegracaoFaturamento.EmReversao ? (
                                        <PermissionGuard permission="FATURAMENTO_RETOMAR_REVERSAO" mode="disable">
                                            {({ disabled }) => (
                                                <Button
                                                    label="Retomar"
                                                    icon="pi pi-replay"
                                                    size="small"
                                                    outlined
                                                    disabled={disabled || retomarReversaoMutation.isPending}
                                                    onClick={() => setLegEmRetomada(row.leg)}
                                                />
                                            )}
                                        </PermissionGuard>
                                    ) : null
                                }
                            />
                        </DataTable>
                    </Card>

                    <Card title="Ocorrências" className="mb-3">
                        <DataTable value={ocorrenciasQuery.data ?? []} dataKey="id" loading={ocorrenciasQuery.isFetching} emptyMessage="Nenhuma ocorrência." responsiveLayout="scroll" stripedRows size="small">
                            <Column header="Tipo" body={(row: FaturamentoOcorrenciaResponse) => <Tag value={tipoOcorrenciaLabel(Number(row.tipo))} severity={tipoOcorrenciaSeverity(Number(row.tipo)) ?? undefined} />} />
                            <Column field="mensagem" header="Mensagem" />
                            <Column header="Data" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: FaturamentoOcorrenciaResponse) => formatDateTime(row.data)} />
                        </DataTable>
                    </Card>

                    <Card title="Histórico" className="mb-3">
                        <DataTable value={historicoQuery.data ?? []} dataKey="id" loading={historicoQuery.isFetching} emptyMessage="Nenhum histórico." responsiveLayout="scroll" stripedRows size="small">
                            <Column header="De" body={(row: FaturamentoHistoricoResponse) => statusFaturamentoLabel(Number(row.statusAnterior))} />
                            <Column header="Para" body={(row: FaturamentoHistoricoResponse) => statusFaturamentoLabel(Number(row.statusNovo))} />
                            <Column field="observacao" header="Observação" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" />
                            <Column header="Data" body={(row: FaturamentoHistoricoResponse) => formatDateTime(row.data)} />
                        </DataTable>
                    </Card>

                    <AnexosPanel modulo="Faturamento" entidade="Faturamento" entidadeId={faturamento.id} empresaId={faturamento.empresaId} filialId={faturamento.filialId} />

                    <ConfirmarFaturamentoDialog
                        visible={dialog === 'confirmar'}
                        loading={confirmarMutation.isPending}
                        faturamentoId={faturamento.id}
                        empresaId={faturamento.empresaId}
                        filialId={faturamento.filialId ?? null}
                        error={confirmarMutation.error}
                        onHide={fecharConfirmar}
                        onSubmit={confirmar}
                    />
                    <ReasonDialog visible={dialog === 'cancelar'} title="Cancelar faturamento" confirmLabel="Cancelar faturamento" loading={cancelarMutation.isPending} onHide={() => setDialog(null)} onConfirm={cancelar} />
                    <RetomarReversaoDialog visible={dialogRetomarVisivel} loading={retomarReversaoMutation.isPending} leg={legEmRetomada} onHide={() => setLegEmRetomada(null)} onSubmit={retomar} />
                </>
            ) : null}
        </>
    );
};
