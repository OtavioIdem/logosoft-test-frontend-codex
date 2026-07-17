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
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { AnexosPanel } from '@/features/anexos/components/AnexosPanel';
import { useCotacaoCompra, useCotacoesCompraMutations } from '@/features/compras-avancado/hooks/useComprasAvancadoResources';
import { AprovarCotacaoFormValues, CotacaoCompraItemResponse, ItemCotacaoFormValues, StatusCotacaoCompra } from '@/features/compras-avancado/types/comprasAvancado.types';
import { AprovarCotacaoDialog, ItemCotacaoDialog } from '@/features/compras-avancado/components/CotacaoDialogs';
import { cotacaoPodeGerenciar, statusCotacaoLabel, statusCotacaoSeverity } from '@/features/compras-avancado/components/comprasAvancadoLabels';

const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

export const CotacaoCompraDetalhePage = ({ cotacaoId }: { cotacaoId: string }) => {
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [dialog, setDialog] = useState<'item' | 'aprovar' | 'cancelar' | null>(null);

    const cotacaoQuery = useCotacaoCompra(cotacaoId);
    const cotacao = cotacaoQuery.data ?? null;
    const { itemMutation, aprovarMutation, recusarMutation, cancelarMutation } = useCotacoesCompraMutations();
    const produtosQuery = useProdutos({ empresaId: cotacao?.empresaId ?? null, filialId: cotacao?.filialId ?? null });
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);
    const produtoLabel = (id: string) => produtoOptions.find((option) => option.value === id)?.label ?? id;

    if (!hasPermission('COMPRAS_COTACOES_CONSULTAR')) {
        return <UnauthorizedState description="Cotações de compra exigem COMPRAS_COTACOES_CONSULTAR." />;
    }

    const close = () => setDialog(null);
    const podeGerenciar = cotacao ? cotacaoPodeGerenciar(Number(cotacao.statusCotacao)) : false;
    const aprovada = cotacao ? Number(cotacao.statusCotacao) === StatusCotacaoCompra.Aprovada : false;

    const adicionarItem = async (values: ItemCotacaoFormValues) => {
        await runWithToast(async () => { await itemMutation.mutateAsync({ id: cotacaoId, values }); close(); }, { success: { summary: 'Item adicionado' }, error: { summary: 'Erro ao adicionar item' }, rethrow: true });
    };
    const aprovar = async (values: AprovarCotacaoFormValues) => {
        await runWithToast(async () => { await aprovarMutation.mutateAsync({ id: cotacaoId, values }); close(); }, { success: { summary: 'Cotação aprovada', detail: `Pedido de compra ${values.numeroPedido} gerado (ver Compras › Pedidos).` }, error: { summary: 'Erro ao aprovar cotação' }, rethrow: true });
    };
    const recusar = () => runWithToast(() => recusarMutation.mutateAsync(cotacaoId), { success: { summary: 'Cotação recusada' }, error: { summary: 'Erro ao recusar' } });
    const cancelar = async (motivo: string) => {
        await runWithToast(async () => { await cancelarMutation.mutateAsync({ id: cotacaoId, motivo }); close(); }, { success: { summary: 'Cotação cancelada' }, error: { summary: 'Erro ao cancelar' }, rethrow: true });
    };

    const total = (cotacao?.itens ?? []).reduce((sum, item) => sum + item.valorTotal, 0);

    const headerActions = (
        <div className="flex gap-2 flex-wrap justify-content-end">
            <Button label="Voltar" icon="pi pi-arrow-left" severity="secondary" outlined onClick={() => router.push('/compras/cotacoes')} />
            {podeGerenciar ? <PermissionGuard permission="COMPRAS_COTACOES_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Adicionar item" icon="pi pi-plus" severity="secondary" disabled={disabled} onClick={() => setDialog('item')} />}</PermissionGuard> : null}
            {podeGerenciar ? <PermissionGuard permission="COMPRAS_COTACOES_APROVAR" mode="disable">{({ disabled }) => <Button label="Aprovar" icon="pi pi-check" severity="success" disabled={disabled || (cotacao?.itens.length ?? 0) === 0} onClick={() => setDialog('aprovar')} />}</PermissionGuard> : null}
            {podeGerenciar ? <PermissionGuard permission="COMPRAS_COTACOES_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Recusar" icon="pi pi-times-circle" severity="warning" outlined disabled={disabled} loading={recusarMutation.isPending} onClick={recusar} />}</PermissionGuard> : null}
            {podeGerenciar ? <PermissionGuard permission="COMPRAS_COTACOES_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Cancelar" icon="pi pi-ban" severity="danger" outlined disabled={disabled} onClick={() => setDialog('cancelar')} />}</PermissionGuard> : null}
        </div>
    );

    return (
        <>
            <PageHeader title={cotacao ? `Cotação ${cotacao.numero}` : 'Cotação de compra'} description="Itens com preço; aprovar gera o pedido de compra." actions={headerActions} />
            {cotacaoQuery.isLoading ? <LoadingState variant="detail" /> : null}
            {cotacaoQuery.error ? <ApiErrorPanel error={mapApiError(cotacaoQuery.error)} /> : null}
            {cotacao ? (
                <>
                    <Card className="mb-3">
                        <div className="grid">
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Status</span><Tag value={statusCotacaoLabel(Number(cotacao.statusCotacao))} severity={statusCotacaoSeverity(Number(cotacao.statusCotacao)) ?? undefined} /></div>
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Data</span>{formatDate(cotacao.dataCotacao)}</div>
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Validade</span>{formatDate(cotacao.validade)}</div>
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Total</span><strong>{formatMoney(total)}</strong></div>
                        </div>
                        {aprovada ? <Message className="w-full mt-3" severity="success" text="Cotação aprovada — pedido de compra gerado. Consulte em Compras › Pedidos." /> : null}
                    </Card>
                    <Card title="Itens" className="mb-3">
                        <DataTable value={cotacao.itens} dataKey="id" emptyMessage="Nenhum item." responsiveLayout="scroll" stripedRows size="small">
                            <Column field="sequencia" header="#" />
                            <Column header="Produto" body={(item: CotacaoCompraItemResponse) => produtoLabel(item.produtoId)} />
                            <Column header="Qtd" body={(item: CotacaoCompraItemResponse) => item.quantidade} />
                            <Column header="Valor unit." headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: CotacaoCompraItemResponse) => formatMoney(item.valorUnitario)} />
                            <Column header="Total" body={(item: CotacaoCompraItemResponse) => formatMoney(item.valorTotal)} />
                        </DataTable>
                    </Card>
                    <AnexosPanel modulo="Compras" entidade="CotacaoCompra" entidadeId={cotacao.id} empresaId={cotacao.empresaId} filialId={cotacao.filialId} />
                    <ItemCotacaoDialog visible={dialog === 'item'} loading={itemMutation.isPending} produtoOptions={produtoOptions} onHide={close} onSubmit={adicionarItem} />
                    <AprovarCotacaoDialog visible={dialog === 'aprovar'} loading={aprovarMutation.isPending} empresaId={cotacao.empresaId} onHide={close} onSubmit={aprovar} />
                    <ReasonDialog visible={dialog === 'cancelar'} title="Cancelar cotação" confirmLabel="Cancelar cotação" loading={cancelarMutation.isPending} onHide={close} onConfirm={cancelar} />
                </>
            ) : null}
        </>
    );
};
