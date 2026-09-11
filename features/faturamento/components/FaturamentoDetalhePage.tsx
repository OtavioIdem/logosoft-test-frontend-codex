'use client';

import { useState } from 'react';
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
import { useFaturamento, useFaturamentoHistorico, useFaturamentoMutations, useFaturamentoOcorrencias } from '@/features/faturamento/hooks/useFaturamentoResources';
import { ConfirmarFaturamentoFormValues, FaturamentoHistoricoResponse, FaturamentoOcorrenciaResponse } from '@/features/faturamento/types/faturamento.types';
import { ConfirmarFaturamentoDialog } from '@/features/faturamento/components/FaturamentoDialogs';
import { podeCancelar, podeConfirmar, statusFaturamentoLabel, statusFaturamentoSeverity, tipoOcorrenciaLabel, tipoOcorrenciaSeverity } from '@/features/faturamento/components/faturamentoLabels';
import { formatMoney } from '@/lib/formatters/money';

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

export const FaturamentoDetalhePage = ({ faturamentoId }: { faturamentoId: string }) => {
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const toast = useAppToast();
    const runWithToast = useMutationWithToast();
    const [dialog, setDialog] = useState<'confirmar' | 'cancelar' | null>(null);

    const faturamentoQuery = useFaturamento(faturamentoId);
    const historicoQuery = useFaturamentoHistorico(faturamentoId);
    const ocorrenciasQuery = useFaturamentoOcorrencias(faturamentoId);
    const { confirmarMutation, cancelarMutation } = useFaturamentoMutations();
    const faturamento = faturamentoQuery.data ?? null;

    if (!hasPermission('FATURAMENTO_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de Faturamento exige a permissão FATURAMENTO_CONSULTAR." />;
    }

    const confirmar = async (values: ConfirmarFaturamentoFormValues) => {
        await runWithToast(
            async () => {
                const result = await confirmarMutation.mutateAsync({ id: faturamentoId, values });
                setDialog(null);
                if (result.alertas?.length) toast.warn('Alertas do faturamento', result.alertas.join(' • '));
            },
            { success: { summary: 'Faturamento confirmado', detail: 'Transmissão registrada.' }, error: { summary: 'Erro ao confirmar', detail: 'Não foi possível confirmar o faturamento.' }, rethrow: true }
        );
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

    const etapa = faturamento ? Number(faturamento.etapa) : 0;

    const headerActions = (
        <div className="flex gap-2 flex-wrap justify-content-end">
            <Button label="Voltar" icon="pi pi-arrow-left" severity="secondary" outlined onClick={() => router.push('/faturamento')} />
            {faturamento && podeConfirmar(etapa) ? <PermissionGuard permission="FATURAMENTO_CONFIRMAR" mode="disable">{({ disabled }) => <Button label="Confirmar" icon="pi pi-check" severity="success" disabled={disabled} onClick={() => setDialog('confirmar')} />}</PermissionGuard> : null}
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
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Pedido de venda</span>{faturamento.pedidoVendaId}</div>
                            {faturamento.notaFiscalId ? <div className="col-12 md:col-6"><span className="block text-color-secondary text-sm">Nota fiscal</span><Button label="Abrir nota fiscal" icon="pi pi-file" text onClick={() => router.push(`/fiscal/notas/${faturamento.notaFiscalId}`)} /></div> : null}
                            {faturamento.contaReceberId ? <div className="col-12 md:col-6"><span className="block text-color-secondary text-sm">Conta a receber</span>{faturamento.contaReceberId}</div> : null}
                            {faturamento.motivoCancelamento ? <div className="col-12"><Message className="w-full" severity="error" text={`Cancelado: ${faturamento.motivoCancelamento}`} /></div> : null}
                        </div>
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

                    <ConfirmarFaturamentoDialog visible={dialog === 'confirmar'} loading={confirmarMutation.isPending} empresaId={faturamento.empresaId} onHide={() => setDialog(null)} onSubmit={confirmar} />
                    <ReasonDialog visible={dialog === 'cancelar'} title="Cancelar faturamento" confirmLabel="Cancelar faturamento" loading={cancelarMutation.isPending} onHide={() => setDialog(null)} onConfirm={cancelar} />
                </>
            ) : null}
        </>
    );
};
