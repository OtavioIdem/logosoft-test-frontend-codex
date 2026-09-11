'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useDivergenciasRecebimento, useRecebimentoCompra, useRecebimentosCompraMutations } from '@/features/compras-avancado/hooks/useComprasAvancadoResources';
import { ConferenciaFiscalFormValues, ItemRecebimentoCompraResponse, RecebimentoDivergenciaResponse, StatusConferenciaFiscalEntrada } from '@/features/compras-avancado/types/comprasAvancado.types';
import { ConferenciaFiscalDialog } from '@/features/compras-avancado/components/ConferenciaFiscalDialog';
import { tipoDivergenciaLabel } from '@/features/compras-avancado/components/comprasAvancadoLabels';
import { formatMoney } from '@/lib/formatters/money';

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

export const RecebimentosCompraPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [filialId, setFilialId] = useState<string | null>(null);
    const [recebimentoId, setRecebimentoId] = useState<string | null>(null);
    const [conferenciaVisible, setConferenciaVisible] = useState(false);

    const divergenciasQuery = useDivergenciasRecebimento({ empresaId }, hasPermission('COMPRAS_CONSULTAR') && Boolean(empresaId));
    const recebimentoQuery = useRecebimentoCompra(recebimentoId);
    const recebimento = recebimentoQuery.data ?? null;
    const { conferenciaMutation } = useRecebimentosCompraMutations();

    if (!hasPermission('COMPRAS_CONSULTAR')) {
        return <UnauthorizedState description="Recebimentos de compra exigem COMPRAS_CONSULTAR." />;
    }

    const divergencias = divergenciasQuery.data ?? [];

    const registrarConferencia = async (values: ConferenciaFiscalFormValues) => {
        if (!recebimentoId) return;
        await runWithToast(
            async () => { await conferenciaMutation.mutateAsync({ id: recebimentoId, values }); setConferenciaVisible(false); },
            { success: { summary: 'Conferência registrada', detail: 'Divergências apuradas pelo backend.' }, error: { summary: 'Erro na conferência fiscal', detail: 'Não foi possível registrar a conferência.' }, rethrow: true }
        );
    };

    const conferenciaStatus = recebimento?.conferenciaFiscal ? Number(recebimento.conferenciaFiscal.statusConferencia) : null;

    return (
        <>
            <PageHeader title="Recebimentos e conferência fiscal" description="Divergências de recebimento e registro da conferência fiscal da NF de entrada." actions={<EmpresaFilialFilter empresaId={empresaId} filialId={filialId} onEmpresaChange={(value) => { setEmpresaId(value); setFilialId(null); setRecebimentoId(null); }} onFilialChange={setFilialId} />} />

            <Card title="Divergências de recebimento" className="mb-3">
                {!empresaId ? <Message className="w-full" severity="info" text="Selecione a empresa para carregar as divergências." /> : null}
                {divergenciasQuery.error ? <ApiErrorPanel error={mapApiError(divergenciasQuery.error)} /> : null}
                {empresaId ? (
                    <DataTable value={divergencias} dataKey="id" loading={divergenciasQuery.isFetching} emptyMessage="Nenhuma divergência." responsiveLayout="scroll" stripedRows size="small">
                        <Column header="Tipo" body={(row: RecebimentoDivergenciaResponse) => <Tag value={tipoDivergenciaLabel(Number(row.tipo))} severity="warning" />} />
                        <Column header="Esperado" body={(row: RecebimentoDivergenciaResponse) => formatMoney(row.valorEsperado)} />
                        <Column header="Informado" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: RecebimentoDivergenciaResponse) => formatMoney(row.valorInformado)} />
                        <Column header="Diferença" body={(row: RecebimentoDivergenciaResponse) => <span className="text-orange-600">{formatMoney(row.diferenca)}</span>} />
                        <Column header="Registrada" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: RecebimentoDivergenciaResponse) => formatDateTime(row.registradaEm)} />
                        <Column header="" body={(row: RecebimentoDivergenciaResponse) => <Button type="button" label="Abrir recebimento" icon="pi pi-eye" size="small" text onClick={() => setRecebimentoId(row.recebimentoCompraId)} />} />
                    </DataTable>
                ) : null}
            </Card>

            {recebimento ? (
                <Card title={`Recebimento ${recebimento.documento}`} className="mb-3">
                    <div className="grid mb-2">
                        <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Recebido em</span>{formatDateTime(recebimento.dataRecebimento)}</div>
                        <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Valor recebido</span>{formatMoney(recebimento.valorTotalRecebido)}</div>
                        <div className="col-12 md:col-6">
                            <span className="block text-color-secondary text-sm">Conferência fiscal</span>
                            {conferenciaStatus === null ? <Tag value="Não conferida" /> : <Tag value={conferenciaStatus === StatusConferenciaFiscalEntrada.Conferida ? 'Conferida' : 'Divergência encontrada'} severity={conferenciaStatus === StatusConferenciaFiscalEntrada.Conferida ? 'success' : 'warning'} />}
                        </div>
                    </div>
                    <DataTable value={recebimento.itens} dataKey="id" emptyMessage="Nenhum item." responsiveLayout="scroll" stripedRows size="small">
                        <Column header="Produto" body={(item: ItemRecebimentoCompraResponse) => item.produtoId} />
                        <Column header="Qtd" body={(item: ItemRecebimentoCompraResponse) => item.quantidade} />
                        <Column header="Valor unit." headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: ItemRecebimentoCompraResponse) => formatMoney(item.valorUnitario)} />
                        <Column header="Total" body={(item: ItemRecebimentoCompraResponse) => formatMoney(item.valorTotal)} />
                    </DataTable>
                    <div className="flex justify-content-end mt-3">
                        <PermissionGuard permission="COMPRAS_CONFERENCIA_FISCAL_REGISTRAR" mode="disable">{({ disabled }) => <Button label="Registrar conferência fiscal" icon="pi pi-file-check" disabled={disabled} onClick={() => setConferenciaVisible(true)} />}</PermissionGuard>
                    </div>
                    {recebimento.divergencias.length > 0 ? <Message className="w-full mt-2" severity="warn" text={`${recebimento.divergencias.length} divergência(s) neste recebimento.`} /> : null}
                </Card>
            ) : null}

            {recebimentoId && !recebimento && !recebimentoQuery.isLoading ? <EmptyState title="Recebimento não encontrado" description="Verifique o vínculo da divergência." /> : null}

            <ConferenciaFiscalDialog visible={conferenciaVisible} loading={conferenciaMutation.isPending} onHide={() => setConferenciaVisible(false)} onSubmit={registrarConferencia} />
        </>
    );
};
