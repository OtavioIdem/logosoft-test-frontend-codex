'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { AnexosPanel } from '@/features/anexos/components/AnexosPanel';
import { useSolicitacaoCompra, useSolicitacoesCompraMutations } from '@/features/compras-avancado/hooks/useComprasAvancadoResources';
import { ItemSolicitacaoFormValues, SolicitacaoCompraItemResponse } from '@/features/compras-avancado/types/comprasAvancado.types';
import { ItemSolicitacaoDialog } from '@/features/compras-avancado/components/SolicitacaoDialogs';
import { solicitacaoPodeGerenciar, statusSolicitacaoLabel, statusSolicitacaoSeverity } from '@/features/compras-avancado/components/comprasAvancadoLabels';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

export const SolicitacaoCompraDetalhePage = ({ solicitacaoId }: { solicitacaoId: string }) => {
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [dialog, setDialog] = useState<'item' | 'cancelar' | null>(null);

    const solicitacaoQuery = useSolicitacaoCompra(solicitacaoId);
    const solicitacao = solicitacaoQuery.data ?? null;
    const { itemMutation, aprovarMutation, cancelarMutation } = useSolicitacoesCompraMutations();
    const produtosQuery = useProdutos({ empresaId: solicitacao?.empresaId ?? null, filialId: solicitacao?.filialId ?? null });
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);
    const produtoLabel = (id: string) => produtoOptions.find((option) => option.value === id)?.label ?? id;

    if (!hasPermission('COMPRAS_SOLICITACOES_CONSULTAR')) {
        return <UnauthorizedState description="Solicitações de compra exigem COMPRAS_SOLICITACOES_CONSULTAR." />;
    }

    const close = () => setDialog(null);
    const podeGerenciar = solicitacao ? solicitacaoPodeGerenciar(Number(solicitacao.statusSolicitacao)) : false;

    const adicionarItem = async (values: ItemSolicitacaoFormValues) => {
        await runWithToast(async () => { await itemMutation.mutateAsync({ id: solicitacaoId, values }); close(); }, { success: { summary: 'Item adicionado' }, error: { summary: 'Erro ao adicionar item' }, rethrow: true });
    };
    const aprovar = () => runWithToast(() => aprovarMutation.mutateAsync(solicitacaoId), { success: { summary: 'Solicitação aprovada', detail: 'Agora é possível cotar.' }, error: { summary: 'Erro ao aprovar' } });
    const cancelar = async (motivo: string) => {
        await runWithToast(async () => { await cancelarMutation.mutateAsync({ id: solicitacaoId, motivo }); close(); }, { success: { summary: 'Solicitação cancelada' }, error: { summary: 'Erro ao cancelar' }, rethrow: true });
    };

    const headerActions = (
        <div className="flex gap-2 flex-wrap justify-content-end">
            <Button label="Voltar" icon="pi pi-arrow-left" severity="secondary" outlined onClick={() => router.push('/compras/solicitacoes')} />
            {podeGerenciar ? <PermissionGuard permission="COMPRAS_SOLICITACOES_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Adicionar item" icon="pi pi-plus" severity="secondary" disabled={disabled} onClick={() => setDialog('item')} />}</PermissionGuard> : null}
            {podeGerenciar ? <PermissionGuard permission="COMPRAS_SOLICITACOES_APROVAR" mode="disable">{({ disabled }) => <Button label="Aprovar" icon="pi pi-check" severity="success" disabled={disabled || (solicitacao?.itens.length ?? 0) === 0} loading={aprovarMutation.isPending} onClick={aprovar} />}</PermissionGuard> : null}
            {podeGerenciar ? <PermissionGuard permission="COMPRAS_SOLICITACOES_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Cancelar" icon="pi pi-ban" severity="danger" outlined disabled={disabled} onClick={() => setDialog('cancelar')} />}</PermissionGuard> : null}
        </div>
    );

    return (
        <>
            <PageHeader title={solicitacao ? `Solicitação ${solicitacao.numero}` : 'Solicitação de compra'} description="Itens da solicitação e aprovação para habilitar a cotação." actions={headerActions} />
            {solicitacaoQuery.isLoading ? <LoadingState variant="detail" /> : null}
            {solicitacaoQuery.error ? <ApiErrorPanel error={mapApiError(solicitacaoQuery.error)} /> : null}
            {solicitacao ? (
                <>
                    <Card className="mb-3">
                        <div className="grid">
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Status</span><Tag value={statusSolicitacaoLabel(Number(solicitacao.statusSolicitacao))} severity={statusSolicitacaoSeverity(Number(solicitacao.statusSolicitacao)) ?? undefined} /></div>
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Solicitante</span>{solicitacao.solicitante}</div>
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Data</span>{formatDate(solicitacao.dataSolicitacao)}</div>
                            {solicitacao.justificativa ? <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Justificativa</span>{solicitacao.justificativa}</div> : null}
                        </div>
                    </Card>
                    <Card title="Itens" className="mb-3">
                        <DataTable value={solicitacao.itens} dataKey="id" emptyMessage="Nenhum item." responsiveLayout="scroll" stripedRows size="small">
                            <Column field="sequencia" header="#" />
                            <Column header="Produto" body={(item: SolicitacaoCompraItemResponse) => produtoLabel(item.produtoId)} />
                            <Column header="Quantidade" body={(item: SolicitacaoCompraItemResponse) => item.quantidade} />
                            <Column field="observacao" header="Observação" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" />
                        </DataTable>
                    </Card>
                    <AnexosPanel modulo="Compras" entidade="SolicitacaoCompra" entidadeId={solicitacao.id} empresaId={solicitacao.empresaId} filialId={solicitacao.filialId} />
                    <ItemSolicitacaoDialog visible={dialog === 'item'} loading={itemMutation.isPending} produtoOptions={produtoOptions} onHide={close} onSubmit={adicionarItem} />
                    <ReasonDialog visible={dialog === 'cancelar'} title="Cancelar solicitação" confirmLabel="Cancelar solicitação" loading={cancelarMutation.isPending} onHide={close} onConfirm={cancelar} />
                </>
            ) : null}
        </>
    );
};
