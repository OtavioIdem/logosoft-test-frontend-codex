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
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { AprovarPedidoVendaDialog, FaturarPedidoVendaDialog } from '@/features/vendas/components/PedidoVendaActionDialogs';
import { PedidoVendaFormDialog } from '@/features/vendas/components/PedidoVendaFormDialog';
import { PedidoVendaItemDialog } from '@/features/vendas/components/PedidoVendaItemDialog';
import { GerarNotaFiscalPedidoVendaDialog } from '@/features/fiscal/components/FiscalActionDialogs';
import { usePedidoVenda, usePedidoVendaMutations } from '@/features/vendas/hooks/useVendasResources';
import { useFiscalMutations } from '@/features/fiscal/hooks/useFiscalResources';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { AprovarPedidoVendaRequest, FaturarPedidoVendaRequest, ItemPedidoVendaFormValues, ItemPedidoVendaResponse, PedidoVendaResponse, SalvarPedidoVendaValues } from '@/features/vendas/types/vendas.types';
import { formatDate, formatMoney, pedidoPodeAprovar, pedidoPodeCancelar, pedidoPodeEditar, pedidoPodeEnviar, pedidoPodeFaturar, pedidoVendaAcoesDisponiveis, pedidoVendaBloqueiosVisuais, pedidoVendaDescontoPercentual, pedidoVendaItensCount, statusPedidoVendaLabel, statusPedidoVendaTagValue, tipoPedidoVendaLabel } from '@/features/vendas/components/vendasUiUtils';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { StatusPedidoVenda } from '@/types/erp';

const MetricBox = ({ label, value, detail }: { label: string; value: string; detail?: string }) => (
    <div className="surface-100 p-3 border-round h-full">
        <span className="block text-color-secondary mb-1">{label}</span>
        <strong className="text-lg">{value}</strong>
        {detail ? <small className="block text-color-secondary mt-1">{detail}</small> : null}
    </div>
);

const TotaisPanel = ({ pedido }: { pedido: PedidoVendaResponse }) => {
    const itens = pedidoVendaItensCount(pedido);
    const descontoPercentual = pedidoVendaDescontoPercentual(pedido);

    return (
        <div className="grid">
            <div className="col-12 md:col-6"><MetricBox label="Produtos" value={formatMoney(pedido.valorProdutos)} detail={`${itens} item(ns) no pedido`} /></div>
            <div className="col-12 md:col-6"><MetricBox label="Descontos" value={formatMoney(pedido.valorDesconto)} detail={`${descontoPercentual.toFixed(2)}% sobre produtos`} /></div>
            <div className="col-12"><MetricBox label="Total do pedido" value={formatMoney(pedido.valorTotal)} detail="Valor usado pelo faturamento e geração financeira." /></div>
        </div>
    );
};

const StatusFlowPanel = ({ pedido }: { pedido: PedidoVendaResponse }) => {
    const status = Number(pedido.statusPedido);
    const steps = [
        { label: 'Rascunho', done: true, active: status === StatusPedidoVenda.Rascunho },
        { label: 'Aprovação', done: [StatusPedidoVenda.AguardandoAprovacao, StatusPedidoVenda.Aprovado, StatusPedidoVenda.Faturado].includes(status), active: status === StatusPedidoVenda.AguardandoAprovacao },
        { label: 'Aprovado', done: [StatusPedidoVenda.Aprovado, StatusPedidoVenda.Faturado].includes(status), active: status === StatusPedidoVenda.Aprovado },
        { label: 'Faturado', done: status === StatusPedidoVenda.Faturado, active: status === StatusPedidoVenda.Faturado }
    ];

    return (
        <div className="flex flex-column gap-2">
            <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                <strong>{statusPedidoVendaLabel(status)}</strong>
                <StatusTag status={statusPedidoVendaTagValue(status)} />
            </div>
            <div className="flex flex-column gap-2 mt-2">
                {steps.map((step) => (
                    <div key={step.label} className="flex align-items-center gap-2">
                        <i className={`pi ${step.done ? 'pi-check-circle text-green-500' : step.active ? 'pi-clock text-primary' : 'pi-circle text-color-secondary'}`} />
                        <span className={step.done || step.active ? 'font-medium' : 'text-color-secondary'}>{step.label}</span>
                    </div>
                ))}
                {status === StatusPedidoVenda.Cancelado ? (
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-ban text-red-500" />
                        <span className="font-medium">Cancelado</span>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

const AcoesDisponiveisPanel = ({ pedido }: { pedido: PedidoVendaResponse }) => {
    const actions = pedidoVendaAcoesDisponiveis(pedido);
    const blockers = pedidoVendaBloqueiosVisuais(pedido);

    return (
        <div className="flex flex-column gap-2">
            {actions.length > 0 ? actions.map((action) => <Tag key={action} value={action} severity="info" />) : <span className="text-color-secondary">Nenhuma ação operacional disponível para o status atual.</span>}
            {blockers.length > 0 ? (
                <div className="mt-2">
                    {blockers.map((blocker) => <Message key={blocker} severity="warn" text={blocker} className="w-full mb-2" />)}
                </div>
            ) : null}
        </div>
    );
};

export const PedidoVendaDetalhePage = ({ pedidoId }: { pedidoId?: string }) => {
    const router = useRouter();
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const isNovo = !pedidoId;
    const pedidoQuery = usePedidoVenda(pedidoId);
    const mutations = usePedidoVendaMutations();
    const fiscalMutations = useFiscalMutations();
    const [formVisible, setFormVisible] = useState(isNovo);
    const [itemDialog, setItemDialog] = useState<ItemPedidoVendaResponse | null | 'novo'>(null);
    const [removeItem, setRemoveItem] = useState<ItemPedidoVendaResponse | null>(null);
    const [cancelarVisible, setCancelarVisible] = useState(false);
    const [aprovarVisible, setAprovarVisible] = useState(false);
    const [faturarVisible, setFaturarVisible] = useState(false);
    const [gerarNotaFiscalVisible, setGerarNotaFiscalVisible] = useState(false);
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);

    const pedido = pedidoQuery.data ?? null;
    const clientesQuery = useClientes({ empresaId: pedido?.empresaId ?? null, filialId: pedido?.filialId ?? null });
    const pessoasQuery = usePessoas({ empresaId: pedido?.empresaId ?? null, filialId: pedido?.filialId ?? null });
    const produtosQuery = useProdutos({ empresaId: pedido?.empresaId ?? null, filialId: pedido?.filialId ?? null });
    const locaisQuery = useLocaisEstoque({ empresaId: pedido?.empresaId ?? null, filialId: pedido?.filialId ?? null });
    const pessoaLabelMap = useMemo(() => new Map((pessoasQuery.data ?? []).map((pessoa) => [pessoa.id, pessoa.nomeFantasia ? `${pessoa.nomeRazaoSocial} • ${pessoa.nomeFantasia}` : pessoa.nomeRazaoSocial])), [pessoasQuery.data]);
    const clienteLabelMap = useMemo(() => new Map((clientesQuery.data ?? []).map((cliente) => [cliente.id, `${cliente.codigo} • ${pessoaLabelMap.get(cliente.pessoaId) ?? 'Pessoa não carregada'}`])), [clientesQuery.data, pessoaLabelMap]);
    const produtoLabelMap = useMemo(() => new Map((produtosQuery.data ?? []).map((produto) => [produto.id, `${produto.codigo} • ${produto.descricao}`])), [produtosQuery.data]);
    const localLabelMap = useMemo(() => new Map((locaisQuery.data ?? []).map((local) => [local.id, `${local.codigo} • ${local.nome}`])), [locaisQuery.data]);
    const itens = useMemo(() => pedido?.itens ?? [], [pedido]);
    const visibleItens = useMemo(() => itens.slice(first, first + rows), [first, itens, rows]);

    if (!hasPermission('VENDAS_CONSULTAR')) return <UnauthorizedState description="Pedidos de venda exigem VENDAS_CONSULTAR." />;

    const save = async (values: SalvarPedidoVendaValues) => {
        try {
            const saved = await mutations.saveMutation.mutateAsync({ id: values.id, values });
            toast.success('Pedido salvo', 'Pedido de venda gravado com sucesso.');
            setFormVisible(false);
            if (isNovo) router.replace(`/vendas/pedidos/${saved.id}`);
        } catch (error) {
            toast.error('Erro ao salvar pedido', error instanceof Error ? error.message : 'Não foi possível salvar o pedido.');
            throw error;
        }
    };

    const saveItem = async (values: ItemPedidoVendaFormValues) => {
        if (!pedido) return;
        try {
            await mutations.itemMutation.mutateAsync({ pedidoId: pedido.id, itemId: values.id, values });
            toast.success('Item salvo', 'Item do pedido gravado com sucesso.');
            setItemDialog(null);
        } catch (error) {
            toast.error('Erro ao salvar item', error instanceof Error ? error.message : 'Não foi possível salvar o item.');
            throw error;
        }
    };

    const removerItem = async (motivo: string) => {
        if (!pedido || !removeItem) return;
        try {
            await mutations.removerItemMutation.mutateAsync({ pedidoId: pedido.id, itemId: removeItem.id, motivo });
            toast.success('Item removido', 'Motivo registrado e item removido logicamente.');
            setRemoveItem(null);
        } catch (error) {
            toast.error('Erro ao remover item', error instanceof Error ? error.message : 'Não foi possível remover o item.');
        }
    };

    const enviar = async () => {
        if (!pedido) return;
        try {
            await mutations.enviarMutation.mutateAsync(pedido.id);
            toast.success('Pedido enviado', 'Pedido enviado para aprovação.');
        } catch (error) {
            toast.error('Erro ao enviar pedido', error instanceof Error ? error.message : 'Não foi possível enviar o pedido.');
        }
    };

    const aprovar = async (values: AprovarPedidoVendaRequest) => {
        if (!pedido) return;
        try {
            await mutations.aprovarMutation.mutateAsync({ id: pedido.id, values });
            toast.success('Pedido aprovado', values.reservarEstoque ? 'Pedido aprovado com reserva de estoque.' : 'Pedido aprovado sem reserva de estoque.');
            setAprovarVisible(false);
        } catch (error) {
            toast.error('Erro ao aprovar pedido', error instanceof Error ? error.message : 'Não foi possível aprovar o pedido.');
            throw error;
        }
    };

    const cancelar = async (motivo: string) => {
        if (!pedido) return;
        try {
            await mutations.cancelarMutation.mutateAsync({ id: pedido.id, motivo });
            toast.success('Pedido cancelado', 'Motivo registrado com sucesso.');
            setCancelarVisible(false);
        } catch (error) {
            toast.error('Erro ao cancelar pedido', error instanceof Error ? error.message : 'Não foi possível cancelar o pedido.');
        }
    };


    const gerarNotaFiscal = async (values: unknown) => {
        if (!pedido) return;
        try {
            const result = await fiscalMutations.gerarNotaPedidoMutation.mutateAsync(values);
            toast.success('Nota fiscal gerada', 'Nota fiscal criada em rascunho a partir do pedido de venda.');
            setGerarNotaFiscalVisible(false);
            router.push(`/fiscal/notas/${result.notaFiscal.id}`);
        } catch (error) {
            toast.error('Erro ao gerar nota fiscal', error instanceof Error ? error.message : 'Não foi possível gerar a nota fiscal.');
            throw error;
        }
    };

    const faturar = async (values: FaturarPedidoVendaRequest) => {
        if (!pedido) return;
        try {
            await mutations.faturarMutation.mutateAsync({ id: pedido.id, values });
            toast.success('Pedido faturado', values.baixarEstoque ? 'Pedido faturado com baixa de estoque.' : 'Pedido faturado sem baixa de estoque.');
            setFaturarVisible(false);
        } catch (error) {
            toast.error('Erro ao faturar pedido', error instanceof Error ? error.message : 'Não foi possível faturar o pedido.');
            throw error;
        }
    };

    const headerActions = (
        <div className="flex gap-2 flex-wrap justify-content-end">
            <Button label="Voltar" icon="pi pi-arrow-left" severity="secondary" outlined onClick={() => router.push('/vendas/pedidos')} />
            {!isNovo && pedido ? <PermissionGuard permission="VENDAS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Editar" icon="pi pi-pencil" disabled={disabled || !pedidoPodeEditar(pedido)} onClick={() => setFormVisible(true)} />}</PermissionGuard> : null}
            {!isNovo && pedido ? <PermissionGuard permission="VENDAS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Enviar aprovação" icon="pi pi-send" disabled={disabled || !pedidoPodeEnviar(pedido) || mutations.enviarMutation.isPending} loading={mutations.enviarMutation.isPending} onClick={enviar} />}</PermissionGuard> : null}
            {!isNovo && pedido ? <PermissionGuard permission="VENDAS_APROVAR" mode="disable">{({ disabled }) => <Button label="Aprovar" icon="pi pi-check" severity="success" disabled={disabled || !pedidoPodeAprovar(pedido)} onClick={() => setAprovarVisible(true)} />}</PermissionGuard> : null}
            {!isNovo && pedido ? <PermissionGuard permission="VENDAS_FATURAR" mode="disable">{({ disabled }) => <Button label="Faturar" icon="pi pi-dollar" severity="warning" disabled={disabled || !pedidoPodeFaturar(pedido)} onClick={() => setFaturarVisible(true)} />}</PermissionGuard> : null}
            {!isNovo && pedido ? <PermissionGuard permission="FISCAL_EMITIR" mode="disable">{({ disabled }) => <Button label="Gerar NF" icon="pi pi-file" severity="help" disabled={disabled || !pedidoPodeFaturar(pedido)} onClick={() => setGerarNotaFiscalVisible(true)} />}</PermissionGuard> : null}
            {!isNovo && pedido ? <PermissionGuard permission="VENDAS_CANCELAR" mode="disable">{({ disabled }) => <Button label="Cancelar" icon="pi pi-ban" severity="danger" outlined disabled={disabled || !pedidoPodeCancelar(pedido)} onClick={() => setCancelarVisible(true)} />}</PermissionGuard> : null}
        </div>
    );

    return (
        <>
            <PageHeader title={isNovo ? 'Novo pedido de venda' : `Pedido ${pedido?.numero ?? ''}`} description="Gerencie cabeçalho, itens, status, aprovação e faturamento do pedido de venda." actions={headerActions} />
            {isNovo ? <Message severity="info" className="w-full mb-3" text="Crie o cabeçalho do pedido para liberar inclusão de itens, aprovação e faturamento." /> : null}
            {!isNovo && pedidoQuery.isLoading ? <LoadingState variant="detail" /> : null}
            {!isNovo && pedidoQuery.error ? <ApiErrorPanel error={mapApiError(pedidoQuery.error)} /> : null}
            {!isNovo && pedido ? (
                <div className="grid">
                    <div className="col-12 lg:col-8">
                        <Card title="Dados do pedido" className="mb-3">
                            <div className="grid">
                                <div className="col-12 md:col-4"><span className="block text-color-secondary">Status</span><StatusTag status={statusPedidoVendaTagValue(pedido.statusPedido)} /></div>
                                <div className="col-12 md:col-4"><span className="block text-color-secondary">Cliente</span><strong>{clienteLabelMap.get(pedido.clienteId) ?? 'Cliente não carregado'}</strong></div>
                                <div className="col-12 md:col-4"><span className="block text-color-secondary">Tipo</span><strong>{tipoPedidoVendaLabel(pedido.tipo)}</strong></div>
                                <div className="col-12 md:col-4"><span className="block text-color-secondary">Emissão</span><strong>{formatDate(pedido.dataEmissao)}</strong></div>
                                <div className="col-12 md:col-4"><span className="block text-color-secondary">Previsão entrega</span><strong>{formatDate(pedido.dataPrevisaoEntrega)}</strong></div>
                                <div className="col-12 md:col-4"><span className="block text-color-secondary">Eventos</span><div className="flex gap-1 flex-wrap"><Tag value={pedido.aprovadoEm ? 'Aprovado' : 'Sem aprovação'} severity={pedido.aprovadoEm ? 'success' : undefined} /><Tag value={pedido.faturadoEm ? 'Faturado' : 'Não faturado'} severity={pedido.faturadoEm ? 'warning' : undefined} /></div></div>
                                <div className="col-12"><span className="block text-color-secondary">Observação</span><span>{pedido.observacao ?? '-'}</span></div>
                            </div>
                        </Card>
                        <Card title="Itens do pedido">
                            <div className="flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
                                <span className="text-color-secondary">Produto, local de estoque, quantidade, valor unitário e desconto.</span>
                                <PermissionGuard permission="VENDAS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Adicionar item" icon="pi pi-plus" disabled={disabled || !pedidoPodeEditar(pedido)} onClick={() => setItemDialog('novo')} />}</PermissionGuard>
                            </div>
                            <DataTableServer<ItemPedidoVendaResponse> value={visibleItens} totalRecords={itens.length} loading={pedidoQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum item informado.">
                                <Column header="Produto" body={(row: ItemPedidoVendaResponse) => produtoLabelMap.get(row.produtoId) ?? 'Produto não carregado'} />
                                <Column header="Local" body={(row: ItemPedidoVendaResponse) => row.localEstoqueId ? localLabelMap.get(row.localEstoqueId) ?? 'Local não carregado' : '-'} />
                                <Column header="Qtd." body={(row: ItemPedidoVendaResponse) => row.quantidade} />
                                <Column header="Unitário" body={(row: ItemPedidoVendaResponse) => formatMoney(row.valorUnitario)} />
                                <Column header="Desconto" body={(row: ItemPedidoVendaResponse) => formatMoney(row.valorDesconto)} />
                                <Column header="Total" body={(row: ItemPedidoVendaResponse) => formatMoney(row.valorTotal ?? row.quantidade * row.valorUnitario - row.valorDesconto)} />
                                <Column header="Ações" alignHeader="right" body={(row: ItemPedidoVendaResponse) => <DataTableActions actions={[{ key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'VENDAS_GERENCIAR', disabled: !pedidoPodeEditar(pedido), onClick: () => setItemDialog(row) }, { key: 'remover', label: 'Remover', icon: 'pi pi-trash', severity: 'danger', permission: 'VENDAS_GERENCIAR', disabled: !pedidoPodeEditar(pedido), onClick: () => setRemoveItem(row) }]} />} />
                            </DataTableServer>
                            {itens.length === 0 ? <EmptyState title="Pedido sem itens" description="Adicione pelo menos um item antes de enviar para aprovação." /> : null}
                        </Card>
                    </div>
                    <div className="col-12 lg:col-4">
                        <Card title="Fluxo do pedido" className="mb-3"><StatusFlowPanel pedido={pedido} /></Card>
                        <Card title="Totais" className="mb-3"><TotaisPanel pedido={pedido} /></Card>
                        <Card title="Ações disponíveis" className="mb-3"><AcoesDisponiveisPanel pedido={pedido} /></Card>
                        <Card title="Impacto operacional">
                            <Message severity="warn" text="Aprovação pode reservar estoque. Faturamento pode baixar estoque. O backend é a fonte final das regras e recusará ações inválidas por status, saldo ou permissão." />
                            <Divider />
                            <ul className="m-0 pl-3 line-height-3">
                                <li>Pedido sem item não deve ser aprovado.</li>
                                <li>Pedido cancelado não pode ser faturado.</li>
                                <li>Pedido faturado não deve ser alterado diretamente.</li>
                            </ul>
                        </Card>
                    </div>
                </div>
            ) : null}
            <PedidoVendaFormDialog visible={formVisible} record={pedido} loading={mutations.saveMutation.isPending} onHide={() => { setFormVisible(false); if (isNovo) router.push('/vendas/pedidos'); }} onSubmit={save} />
            <PedidoVendaItemDialog visible={Boolean(itemDialog)} pedido={pedido} item={itemDialog && itemDialog !== 'novo' ? itemDialog : null} loading={mutations.itemMutation.isPending} onHide={() => setItemDialog(null)} onSubmit={saveItem} />
            <ReasonDialog visible={Boolean(removeItem)} title="Motivo da remoção do item" confirmLabel="Remover" loading={mutations.removerItemMutation.isPending} onHide={() => setRemoveItem(null)} onConfirm={removerItem} />
            <ReasonDialog visible={cancelarVisible} title="Motivo do cancelamento" confirmLabel="Cancelar pedido" loading={mutations.cancelarMutation.isPending} onHide={() => setCancelarVisible(false)} onConfirm={cancelar} />
            <AprovarPedidoVendaDialog visible={aprovarVisible} loading={mutations.aprovarMutation.isPending} onHide={() => setAprovarVisible(false)} onSubmit={aprovar} />
            <FaturarPedidoVendaDialog visible={faturarVisible} loading={mutations.faturarMutation.isPending} onHide={() => setFaturarVisible(false)} onSubmit={faturar} />
            <GerarNotaFiscalPedidoVendaDialog visible={gerarNotaFiscalVisible} loading={fiscalMutations.gerarNotaPedidoMutation.isPending} onHide={() => setGerarNotaFiscalVisible(false)} onSubmit={gerarNotaFiscal} pedidoVendaId={pedido?.id} />
        </>
    );
};
