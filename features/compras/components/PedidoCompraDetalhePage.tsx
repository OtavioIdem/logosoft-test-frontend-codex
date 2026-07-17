'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Divider } from 'primereact/divider';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { StatusTag } from '@/components/data/StatusTag';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { useCondicoesPagamento } from '@/features/financeiro/hooks/useFinanceiroResources';
import { PedidoCompraFormDialog } from '@/features/compras/components/PedidoCompraFormDialog';
import { PedidoCompraItemDialog } from '@/features/compras/components/PedidoCompraItemDialog';
import { AprovarPedidoCompraDialog, ReceberPedidoCompraDialog } from '@/features/compras/components/PedidoCompraActionDialogs';
import { usePedidoCompra, usePedidoCompraMutations } from '@/features/compras/hooks/useComprasResources';
import { AprovarPedidoCompraRequest, ItemPedidoCompraFormValues, ItemPedidoCompraResponse, PedidoCompraResponse, ReceberPedidoCompraRequest, SalvarPedidoCompraValues } from '@/features/compras/types/compras.types';
import {
    condicaoPagamentoOptions,
    formatDate,
    formatMoney,
    getPedidoCompraDescontoPercentual,
    getPedidoCompraItensCount,
    getPedidoCompraNextAction,
    getPedidoCompraOperationalBlocks,
    getPedidoCompraStatusSteps,
    pedidoCompraPodeAprovar,
    pedidoCompraPodeCancelar,
    pedidoCompraPodeEditar,
    pedidoCompraPodeEnviar,
    pedidoCompraPodeReceber,
    statusPedidoCompraTagValue
} from '@/features/compras/components/comprasUiUtils';

const TotaisPanel = ({ pedido }: { pedido: PedidoCompraResponse }) => {
    const descontoPercentual = getPedidoCompraDescontoPercentual(pedido);
    return (
        <div className="flex flex-column gap-3">
            <div className="flex justify-content-between"><span>Itens</span><strong>{getPedidoCompraItensCount(pedido)}</strong></div>
            <div className="flex justify-content-between"><span>Produtos</span><strong>{formatMoney(pedido.valorProdutos)}</strong></div>
            <div className="flex justify-content-between"><span>Desconto</span><strong>{formatMoney(pedido.valorDesconto)}</strong></div>
            <div className="flex justify-content-between"><span>% desconto</span><strong>{descontoPercentual.toFixed(2)}%</strong></div>
            <Divider className="my-1" />
            <div className="flex justify-content-between text-xl"><span>Total</span><strong>{formatMoney(pedido.valorTotal)}</strong></div>
        </div>
    );
};

const StatusFlowPanel = ({ pedido }: { pedido: PedidoCompraResponse }) => {
    const steps = getPedidoCompraStatusSteps(pedido);
    return (
        <Card title="Fluxo do pedido" className="mb-3">
            <div className="flex flex-column md:flex-row gap-2">
                {steps.map((step) => (
                    <div key={step.key} className={`flex-1 border-1 surface-border border-round p-3 ${step.active ? 'surface-100' : ''}`}>
                        <span className="block text-color-secondary mb-2">{step.done ? 'Concluído' : step.active ? 'Atual' : 'Pendente'}</span>
                        <Tag value={step.label} severity={step.severity} />
                    </div>
                ))}
            </div>
        </Card>
    );
};

const OperationalBlocksPanel = ({ pedido }: { pedido: PedidoCompraResponse }) => {
    const blocks = getPedidoCompraOperationalBlocks(pedido);
    return (
        <Card title="Situação operacional" className="mb-3">
            <Message severity="info" text={getPedidoCompraNextAction(pedido)} className="w-full mb-3" />
            <div className="flex flex-column gap-2">
                {blocks.map((block) => (
                    <div key={block.key} className="flex align-items-center justify-content-between gap-3 border-1 surface-border border-round p-3">
                        <span>{block.label}</span>
                        <Tag value={block.blocked ? 'Bloqueado' : 'OK'} severity={block.severity} />
                    </div>
                ))}
            </div>
        </Card>
    );
};

export const PedidoCompraDetalhePage = ({ pedidoId }: { pedidoId?: string }) => {
    const router = useRouter();
    const runWithToast = useMutationWithToast();
    const { hasPermission } = usePermissions();
    const isNovo = !pedidoId;
    const pedidoQuery = usePedidoCompra(pedidoId ?? null);
    const pedido = pedidoQuery.data ?? null;
    const mutations = usePedidoCompraMutations();
    const [formVisible, setFormVisible] = useState(isNovo);
    const [itemDialog, setItemDialog] = useState<ItemPedidoCompraResponse | 'novo' | null>(null);
    const [removeItem, setRemoveItem] = useState<ItemPedidoCompraResponse | null>(null);
    const [cancelarVisible, setCancelarVisible] = useState(false);
    const [aprovarVisible, setAprovarVisible] = useState(false);
    const [receberVisible, setReceberVisible] = useState(false);
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);

    const fornecedoresQuery = useFornecedores({ empresaId: pedido?.empresaId ?? null, filialId: pedido?.filialId ?? null });
    const pessoasQuery = usePessoas({ empresaId: pedido?.empresaId ?? null, filialId: pedido?.filialId ?? null });
    const produtosQuery = useProdutos({ empresaId: pedido?.empresaId ?? null, filialId: pedido?.filialId ?? null });
    const locaisQuery = useLocaisEstoque({ empresaId: pedido?.empresaId ?? null, filialId: pedido?.filialId ?? null });
    const condicoesQuery = useCondicoesPagamento(pedido?.empresaId ?? null);

    const pessoaLabelMap = useMemo(() => new Map((pessoasQuery.data ?? []).map((pessoa) => [pessoa.id, pessoa.nomeFantasia ? `${pessoa.nomeRazaoSocial} • ${pessoa.nomeFantasia}` : pessoa.nomeRazaoSocial])), [pessoasQuery.data]);
    const fornecedorLabelMap = useMemo(() => new Map((fornecedoresQuery.data ?? []).map((fornecedor) => [fornecedor.id, `${fornecedor.codigo} • ${pessoaLabelMap.get(fornecedor.pessoaId) ?? 'Pessoa não carregada'}`])), [fornecedoresQuery.data, pessoaLabelMap]);
    const produtoLabelMap = useMemo(() => new Map((produtosQuery.data ?? []).map((produto) => [produto.id, `${produto.codigo} • ${produto.descricao}`])), [produtosQuery.data]);
    const localLabelMap = useMemo(() => new Map((locaisQuery.data ?? []).map((local) => [local.id, `${local.codigo} • ${local.nome}`])), [locaisQuery.data]);
    const condicaoLabelMap = useMemo(() => new Map(condicaoPagamentoOptions(condicoesQuery.data ?? []).map((option) => [option.value, option.label])), [condicoesQuery.data]);
    const itens = pedido?.itens ?? [];
    const visibleItens = useMemo(() => itens.slice(first, first + rows), [first, itens, rows]);

    if (!hasPermission('COMPRAS_CONSULTAR')) return <UnauthorizedState description="Pedidos de compra exigem COMPRAS_CONSULTAR." />;

    const save = async (values: SalvarPedidoCompraValues) => {
        await runWithToast(
            async () => {
                const saved = await mutations.saveMutation.mutateAsync({ id: pedido?.id, values });
                setFormVisible(false);
                if (isNovo) router.replace(`/compras/pedidos/${saved.id}`);
            },
            { success: { summary: 'Pedido salvo', detail: 'Pedido de compra salvo com sucesso.' }, error: { summary: 'Erro ao salvar pedido', detail: 'Não foi possível salvar o pedido.' }, rethrow: true }
        );
    };

    const saveItem = async (values: ItemPedidoCompraFormValues) => {
        if (!pedido) return;
        await runWithToast(
            async () => {
                await mutations.itemMutation.mutateAsync({ pedidoId: pedido.id, itemId: values.id, values });
                setItemDialog(null);
            },
            { success: { summary: 'Item salvo', detail: 'Item do pedido de compra atualizado.' }, error: { summary: 'Erro ao salvar item', detail: 'Não foi possível salvar o item.' }, rethrow: true }
        );
    };

    const removerItem = async (motivo: string) => {
        if (!pedido || !removeItem) return;
        await runWithToast(
            async () => {
                await mutations.removerItemMutation.mutateAsync({ pedidoId: pedido.id, itemId: removeItem.id, motivo });
                setRemoveItem(null);
            },
            { success: { summary: 'Item removido', detail: 'Motivo registrado e item removido logicamente.' }, error: { summary: 'Erro ao remover item', detail: 'Não foi possível remover o item.' } }
        );
    };

    const enviar = async () => {
        if (!pedido) return;
        await runWithToast(
            () => mutations.enviarMutation.mutateAsync(pedido.id),
            { success: { summary: 'Pedido enviado', detail: 'Pedido de compra enviado para aprovação.' }, error: { summary: 'Erro ao enviar pedido', detail: 'Não foi possível enviar o pedido.' } }
        );
    };

    const aprovar = async (values: AprovarPedidoCompraRequest) => {
        if (!pedido) return;
        await runWithToast(
            async () => {
                await mutations.aprovarMutation.mutateAsync({ id: pedido.id, values });
                setAprovarVisible(false);
            },
            { success: { summary: 'Pedido aprovado', detail: 'Pedido de compra aprovado com sucesso.' }, error: { summary: 'Erro ao aprovar pedido', detail: 'Não foi possível aprovar o pedido.' }, rethrow: true }
        );
    };

    const cancelar = async (motivo: string) => {
        if (!pedido) return;
        await runWithToast(
            async () => {
                await mutations.cancelarMutation.mutateAsync({ id: pedido.id, motivo });
                setCancelarVisible(false);
            },
            { success: { summary: 'Pedido cancelado', detail: 'Motivo registrado com sucesso.' }, error: { summary: 'Erro ao cancelar pedido', detail: 'Não foi possível cancelar o pedido.' } }
        );
    };

    const receber = async (values: ReceberPedidoCompraRequest) => {
        if (!pedido) return;
        await runWithToast(
            async () => {
                await mutations.receberMutation.mutateAsync({ id: pedido.id, values });
                setReceberVisible(false);
            },
            { success: { summary: 'Recebimento registrado', detail: values.gerarContaPagar ? 'Recebimento com geração de conta a pagar.' : 'Recebimento sem geração financeira.' }, error: { summary: 'Erro ao receber pedido', detail: 'Não foi possível receber o pedido.' }, rethrow: true }
        );
    };

    const headerActions = (
        <div className="flex gap-2 flex-wrap justify-content-end">
            <Button label="Voltar" icon="pi pi-arrow-left" severity="secondary" outlined onClick={() => router.push('/compras/pedidos')} />
            {!isNovo && pedido ? <PermissionGuard permission="COMPRAS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Editar" icon="pi pi-pencil" disabled={disabled || !pedidoCompraPodeEditar(pedido)} onClick={() => setFormVisible(true)} />}</PermissionGuard> : null}
            {!isNovo && pedido ? <PermissionGuard permission="COMPRAS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Enviar aprovação" icon="pi pi-send" disabled={disabled || !pedidoCompraPodeEnviar(pedido) || mutations.enviarMutation.isPending} loading={mutations.enviarMutation.isPending} onClick={enviar} />}</PermissionGuard> : null}
            {!isNovo && pedido ? <PermissionGuard permission="COMPRAS_APROVAR" mode="disable">{({ disabled }) => <Button label="Aprovar" icon="pi pi-check" severity="success" disabled={disabled || !pedidoCompraPodeAprovar(pedido)} onClick={() => setAprovarVisible(true)} />}</PermissionGuard> : null}
            {!isNovo && pedido ? <PermissionGuard permission="COMPRAS_RECEBER" mode="disable">{({ disabled }) => <Button label="Receber" icon="pi pi-download" severity="warning" disabled={disabled || !pedidoCompraPodeReceber(pedido)} onClick={() => setReceberVisible(true)} />}</PermissionGuard> : null}
            {!isNovo && pedido ? <PermissionGuard permission="COMPRAS_CANCELAR" mode="disable">{({ disabled }) => <Button label="Cancelar" icon="pi pi-ban" severity="danger" outlined disabled={disabled || !pedidoCompraPodeCancelar(pedido)} onClick={() => setCancelarVisible(true)} />}</PermissionGuard> : null}
        </div>
    );

    return (
        <>
            <PageHeader title={isNovo ? 'Novo pedido de compra' : `Pedido ${pedido?.numero ?? ''}`} description="Gerencie cabeçalho, itens, aprovação, cancelamento e recebimento do pedido de compra." actions={headerActions} />
            {isNovo ? <Message severity="info" className="w-full mb-3" text="Crie o cabeçalho do pedido para liberar inclusão de itens, aprovação e recebimento." /> : null}
            {!isNovo && pedidoQuery.isLoading ? <LoadingState variant="detail" /> : null}
            {!isNovo && pedidoQuery.error ? <ApiErrorPanel error={mapApiError(pedidoQuery.error)} /> : null}
            {!isNovo && pedido ? <StatusFlowPanel pedido={pedido} /> : null}
            {!isNovo && pedido ? (
                <div className="grid">
                    <div className="col-12 lg:col-8">
                        <Card title="Dados do pedido" className="mb-3">
                            <div className="grid">
                                <div className="col-12 md:col-4"><span className="block text-color-secondary">Status</span><StatusTag status={statusPedidoCompraTagValue(pedido.statusPedido)} /></div>
                                <div className="col-12 md:col-4"><span className="block text-color-secondary">Fornecedor</span><strong>{fornecedorLabelMap.get(pedido.fornecedorId) ?? 'Fornecedor não carregado'}</strong></div>
                                <div className="col-12 md:col-4"><span className="block text-color-secondary">Condição</span><strong>{pedido.condicaoPagamentoId ? condicaoLabelMap.get(pedido.condicaoPagamentoId) ?? 'Condição não carregada' : '-'}</strong></div>
                                <div className="col-12 md:col-4"><span className="block text-color-secondary">Emissão</span><strong>{formatDate(pedido.dataEmissao)}</strong></div>
                                <div className="col-12 md:col-4"><span className="block text-color-secondary">Previsão entrega</span><strong>{formatDate(pedido.dataPrevisaoEntrega)}</strong></div>
                                <div className="col-12 md:col-4"><span className="block text-color-secondary">Situação operacional</span><div className="flex gap-1 flex-wrap"><Tag value={pedidoCompraPodeReceber(pedido) ? 'Recebível' : 'Recebimento bloqueado'} severity={pedidoCompraPodeReceber(pedido) ? 'warning' : undefined} /></div></div>
                                <div className="col-12"><span className="block text-color-secondary">Observação</span><span>{pedido.observacao ?? '-'}</span></div>
                            </div>
                        </Card>
                        <Card title="Itens do pedido">
                            <div className="flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
                                <span className="text-color-secondary">Produto, local de estoque, quantidade, valor unitário e desconto.</span>
                                <PermissionGuard permission="COMPRAS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Adicionar item" icon="pi pi-plus" disabled={disabled || !pedidoCompraPodeEditar(pedido)} onClick={() => setItemDialog('novo')} />}</PermissionGuard>
                            </div>
                            <DataTableServer<ItemPedidoCompraResponse> value={visibleItens} totalRecords={itens.length} loading={pedidoQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum item informado.">
                                <Column header="Produto" body={(row: ItemPedidoCompraResponse) => produtoLabelMap.get(row.produtoId) ?? 'Produto não carregado'} />
                                <Column header="Local" body={(row: ItemPedidoCompraResponse) => row.localEstoqueId ? localLabelMap.get(row.localEstoqueId) ?? 'Local não carregado' : '-'} />
                                <Column header="Qtd." body={(row: ItemPedidoCompraResponse) => row.quantidade} />
                                <Column header="Unitário" body={(row: ItemPedidoCompraResponse) => formatMoney(row.valorUnitario)} />
                                <Column header="Desconto" body={(row: ItemPedidoCompraResponse) => formatMoney(row.valorDesconto)} />
                                <Column header="Total" body={(row: ItemPedidoCompraResponse) => formatMoney(row.valorTotal ?? row.quantidade * row.valorUnitario - row.valorDesconto)} />
                                <Column header="Ações" alignHeader="right" body={(row: ItemPedidoCompraResponse) => <DataTableActions actions={[{ key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'COMPRAS_GERENCIAR', disabled: !pedidoCompraPodeEditar(pedido), onClick: () => setItemDialog(row) }, { key: 'remover', label: 'Remover', icon: 'pi pi-trash', severity: 'danger', permission: 'COMPRAS_GERENCIAR', disabled: !pedidoCompraPodeEditar(pedido), onClick: () => setRemoveItem(row) }]} />} />
                            </DataTableServer>
                            {itens.length === 0 ? <EmptyState title="Pedido sem itens" description="Adicione pelo menos um item antes de enviar para aprovação." /> : null}
                        </Card>
                    </div>
                    <div className="col-12 lg:col-4">
                        <Card title="Totais" className="mb-3"><TotaisPanel pedido={pedido} /></Card>
                        <OperationalBlocksPanel pedido={pedido} />
                        <Card title="Impacto em estoque e financeiro">
                            <Message severity="warn" text="Recebimento pode gerar entrada de estoque e conta a pagar. O backend é a fonte final das regras e recusará ações inválidas por status, tolerância, estoque ou permissão." className="w-full mb-3" />
                            <div className="flex flex-column gap-2">
                                <div className="border-1 surface-border border-round p-3"><strong>Estoque</strong><span className="block text-color-secondary mt-1">Ao receber, cada item selecionado movimenta o local de estoque informado.</span></div>
                                <div className="border-1 surface-border border-round p-3"><strong>Financeiro</strong><span className="block text-color-secondary mt-1">Se a opção estiver marcada, o recebimento solicita geração de conta a pagar.</span></div>
                                <div className="border-1 surface-border border-round p-3"><strong>Tolerância</strong><span className="block text-color-secondary mt-1">Receber acima do pedido só é enviado quando a opção explícita for marcada.</span></div>
                            </div>
                        </Card>
                    </div>
                </div>
            ) : null}
            <PedidoCompraFormDialog visible={formVisible} record={pedido} loading={mutations.saveMutation.isPending} onHide={() => { setFormVisible(false); if (isNovo) router.push('/compras/pedidos'); }} onSubmit={save} />
            <PedidoCompraItemDialog visible={Boolean(itemDialog)} pedido={pedido} item={itemDialog && itemDialog !== 'novo' ? itemDialog : null} loading={mutations.itemMutation.isPending} onHide={() => setItemDialog(null)} onSubmit={saveItem} />
            <ReasonDialog visible={Boolean(removeItem)} title="Motivo da remoção do item" confirmLabel="Remover" loading={mutations.removerItemMutation.isPending} onHide={() => setRemoveItem(null)} onConfirm={removerItem} />
            <ReasonDialog visible={cancelarVisible} title="Motivo do cancelamento" confirmLabel="Cancelar pedido" loading={mutations.cancelarMutation.isPending} onHide={() => setCancelarVisible(false)} onConfirm={cancelar} />
            <AprovarPedidoCompraDialog visible={aprovarVisible} loading={mutations.aprovarMutation.isPending} onHide={() => setAprovarVisible(false)} onSubmit={aprovar} />
            <ReceberPedidoCompraDialog visible={receberVisible} pedido={pedido} produtoLabelMap={produtoLabelMap} loading={mutations.receberMutation.isPending} onHide={() => setReceberVisible(false)} onSubmit={receber} />
        </>
    );
};
