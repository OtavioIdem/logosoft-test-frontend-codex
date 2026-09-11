'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAppToast } from '@/hooks/useAppToast';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useFormasPagamentoOptions } from '@/features/financeiro/hooks/useFinanceiroResources';
import { useCaixas, useVendasPdvMutations } from '@/features/pdv/hooks/usePdvResources';
import { ItemVendaFormValues, MeioPagamento, PagamentoVendaFormValues, StatusCaixa, VendaPdvResponse } from '@/features/pdv/types/pdv.types';
import { meioPagamentoLabel, meioPagamentoOptions } from '@/features/pdv/components/pdvLabels';
import { formatMoney } from '@/lib/formatters/money';

const itemLiquido = (item: ItemVendaFormValues) => item.quantidade * item.valorUnitario - item.valorDesconto;

export const VendaPdvPage = () => {
    const { hasPermission } = usePermissions();
    const toast = useAppToast();
    const runWithToast = useMutationWithToast();

    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [filialId, setFilialId] = useState<string | null>(null);
    const [caixaId, setCaixaId] = useState<string | null>(null);
    const [localEstoqueId, setLocalEstoqueId] = useState<string | null>(null);
    const [clienteId, setClienteId] = useState<string | null>(null);
    const [itens, setItens] = useState<ItemVendaFormValues[]>([]);
    const [pagamentos, setPagamentos] = useState<PagamentoVendaFormValues[]>([]);
    const [ultimaVenda, setUltimaVenda] = useState<VendaPdvResponse | null>(null);

    // formulário de item
    const [itemProduto, setItemProduto] = useState<string | null>(null);
    const [itemQtd, setItemQtd] = useState<number | null>(1);
    const [itemValor, setItemValor] = useState<number | null>(0);
    const [itemDesconto, setItemDesconto] = useState<number | null>(0);

    // formulário de pagamento
    const [pagForma, setPagForma] = useState<string | null>(null);
    const [pagMeio, setPagMeio] = useState<number>(MeioPagamento.Dinheiro);
    const [pagValor, setPagValor] = useState<number | null>(0);

    const scope = { empresaId, filialId };
    const caixasQuery = useCaixas({ empresaId, filialId, status: StatusCaixa.Aberto }, hasPermission('PDV_CONSULTAR') && Boolean(empresaId));
    const produtosQuery = useProdutos(scope);
    const locaisQuery = useLocaisEstoque(scope);
    const clientesQuery = useClientes(scope);
    const formasPagamento = useFormasPagamentoOptions(empresaId, 'recebimento');
    const { registrarMutation } = useVendasPdvMutations();

    const produtoMap = useMemo(() => new Map((produtosQuery.data ?? []).map((produto) => [produto.id, { label: `${produto.codigo} - ${produto.descricao}`, preco: produto.precoVendaBase }])), [produtosQuery.data]);
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);
    const caixaOptions = useMemo(() => (caixasQuery.data ?? []).map((caixa) => ({ label: `${caixa.codigo} • ${caixa.terminal}`, value: caixa.id })), [caixasQuery.data]);
    const localOptions = useMemo(() => (locaisQuery.data ?? []).map((local) => ({ label: `${local.codigo} - ${local.nome}`, value: local.id })), [locaisQuery.data]);
    const clienteOptions = useMemo(() => (clientesQuery.data ?? []).map((cliente) => ({ label: cliente.codigo, value: cliente.id })), [clientesQuery.data]);

    const liquido = useMemo(() => itens.reduce((total, item) => total + itemLiquido(item), 0), [itens]);
    const pago = useMemo(() => pagamentos.reduce((total, pagamento) => total + pagamento.valor, 0), [pagamentos]);
    const troco = Math.max(0, pago - liquido);
    const faltante = Math.max(0, liquido - pago);

    if (!hasPermission('PDV_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de PDV exige a permissão PDV_CONSULTAR." />;
    }

    const resetVenda = () => { setItens([]); setPagamentos([]); setClienteId(null); };

    const adicionarItem = () => {
        if (!itemProduto || !itemQtd || itemQtd <= 0) { toast.warn('Item incompleto', 'Selecione produto e quantidade.'); return; }
        setItens((current) => [...current, { produtoId: itemProduto, quantidade: itemQtd, valorUnitario: itemValor ?? 0, valorDesconto: itemDesconto ?? 0 }]);
        setItemProduto(null); setItemQtd(1); setItemValor(0); setItemDesconto(0);
    };

    const adicionarPagamento = () => {
        if (!pagForma || !pagValor || pagValor <= 0) { toast.warn('Pagamento incompleto', 'Selecione forma e valor.'); return; }
        setPagamentos((current) => [...current, { formaPagamentoId: pagForma, meio: pagMeio, valor: pagValor }]);
        setPagForma(null); setPagMeio(MeioPagamento.Dinheiro); setPagValor(0);
    };

    const podeRegistrar = Boolean(caixaId && localEstoqueId && itens.length > 0 && pagamentos.length > 0 && pago >= liquido);

    const registrar = async () => {
        if (!podeRegistrar || !caixaId || !localEstoqueId) return;
        await runWithToast(
            async () => {
                const venda = await registrarMutation.mutateAsync({ caixaId, localEstoqueId, clienteId: clienteId || null, itens, pagamentos });
                setUltimaVenda(venda);
                resetVenda();
            },
            { success: { summary: 'Venda registrada', detail: 'Estoque baixado e recebimentos lançados.' }, error: { summary: 'Erro ao registrar venda', detail: 'Não foi possível concluir a venda.' }, rethrow: true }
        );
    };

    const onSelecionarProduto = (value: string | null) => {
        setItemProduto(value);
        const preco = value ? produtoMap.get(value)?.preco : undefined;
        if (typeof preco === 'number') setItemValor(preco);
    };

    return (
        <>
            <PageHeader
                title="Venda (PDV)"
                description="Venda à vista com baixa de estoque, recebimentos por meio de pagamento e cálculo de troco."
                actions={<EmpresaFilialFilter empresaId={empresaId} filialId={filialId} onEmpresaChange={(value) => { setEmpresaId(value); setFilialId(null); setCaixaId(null); }} onFilialChange={setFilialId} />}
            />

            {ultimaVenda ? <Message className="w-full mb-3" severity="success" text={`Venda ${ultimaVenda.numero} finalizada — líquido ${formatMoney(ultimaVenda.valorLiquido)}, pago ${formatMoney(ultimaVenda.valorPago)}, troco ${formatMoney(ultimaVenda.troco)}.`} /> : null}

            <Card className="mb-3">
                <div className="grid formgrid p-fluid">
                    <div className="field col-12 md:col-4">
                        <label htmlFor="vendaCaixa" className="font-medium">Caixa aberto *</label>
                        <Dropdown inputId="vendaCaixa" value={caixaId} options={caixaOptions} onChange={(event) => setCaixaId(event.value)} placeholder={caixasQuery.isFetching ? 'Carregando…' : 'Selecione o caixa'} emptyMessage="Nenhum caixa aberto" />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label htmlFor="vendaLocal" className="font-medium">Local de estoque *</label>
                        <EntitySelect id="vendaLocal" entityName="local" value={localEstoqueId} options={localOptions} onChange={setLocalEstoqueId} />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label htmlFor="vendaCliente" className="font-medium">Cliente (opcional)</label>
                        <EntitySelect id="vendaCliente" entityName="cliente" value={clienteId} options={clienteOptions} onChange={setClienteId} />
                    </div>
                </div>
            </Card>

            <Card title="Itens" className="mb-3">
                <div className="grid formgrid p-fluid align-items-end">
                    <div className="field col-12 md:col-4"><label htmlFor="itemProduto" className="font-medium">Produto</label><EntitySelect id="itemProduto" entityName="produto" value={itemProduto} options={produtoOptions} onChange={onSelecionarProduto} /></div>
                    <div className="field col-6 md:col-2"><label htmlFor="itemQtd" className="font-medium">Qtd</label><QuantityInput id="itemQtd" value={itemQtd} onChange={setItemQtd} /></div>
                    <div className="field col-6 md:col-2"><label htmlFor="itemValor" className="font-medium">Valor unit.</label><MoneyInput id="itemValor" value={itemValor} onChange={setItemValor} /></div>
                    <div className="field col-6 md:col-2"><label htmlFor="itemDesc" className="font-medium">Desconto</label><MoneyInput id="itemDesc" value={itemDesconto} onChange={setItemDesconto} /></div>
                    <div className="field col-6 md:col-2"><Button className="w-full" label="Adicionar" icon="pi pi-plus" severity="secondary" onClick={adicionarItem} /></div>
                </div>
                <DataTable value={itens} dataKey="produtoId" emptyMessage="Nenhum item." responsiveLayout="scroll" stripedRows size="small">
                    <Column header="Produto" body={(item: ItemVendaFormValues) => produtoMap.get(item.produtoId)?.label ?? item.produtoId} />
                    <Column header="Qtd" body={(item: ItemVendaFormValues) => item.quantidade} />
                    <Column header="Valor unit." headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: ItemVendaFormValues) => formatMoney(item.valorUnitario)} />
                    <Column header="Desconto" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: ItemVendaFormValues) => formatMoney(item.valorDesconto)} />
                    <Column header="Total" body={(item: ItemVendaFormValues) => formatMoney(itemLiquido(item))} />
                    <Column header="" body={(_item: ItemVendaFormValues, options) => <Button type="button" icon="pi pi-trash" text severity="danger" size="small" aria-label="Remover item" onClick={() => setItens((current) => current.filter((_, index) => index !== options.rowIndex))} />} />
                </DataTable>
            </Card>

            <Card title="Pagamentos" className="mb-3">
                <div className="grid formgrid p-fluid align-items-end">
                    <div className="field col-12 md:col-4"><label htmlFor="pagForma" className="font-medium">Forma</label><EntitySelect id="pagForma" entityName="forma de pagamento" value={pagForma} options={formasPagamento.options} onChange={setPagForma} /></div>
                    <div className="field col-6 md:col-3"><label htmlFor="pagMeio" className="font-medium">Meio</label><Dropdown inputId="pagMeio" value={pagMeio} options={meioPagamentoOptions} onChange={(event) => setPagMeio(event.value)} /></div>
                    <div className="field col-6 md:col-3"><label htmlFor="pagValor" className="font-medium">Valor</label><MoneyInput id="pagValor" value={pagValor} onChange={setPagValor} /></div>
                    <div className="field col-12 md:col-2"><Button className="w-full" label="Adicionar" icon="pi pi-plus" severity="secondary" onClick={adicionarPagamento} /></div>
                </div>
                <DataTable value={pagamentos} emptyMessage="Nenhum pagamento." responsiveLayout="scroll" stripedRows size="small">
                    <Column header="Forma" body={(pag: PagamentoVendaFormValues) => formasPagamento.options.find((option) => option.value === pag.formaPagamentoId)?.label ?? pag.formaPagamentoId} />
                    <Column header="Meio" body={(pag: PagamentoVendaFormValues) => <Tag value={meioPagamentoLabel(Number(pag.meio))} />} />
                    <Column header="Valor" body={(pag: PagamentoVendaFormValues) => formatMoney(pag.valor)} />
                    <Column header="" body={(_pag: PagamentoVendaFormValues, options) => <Button type="button" icon="pi pi-trash" text severity="danger" size="small" aria-label="Remover pagamento" onClick={() => setPagamentos((current) => current.filter((_, index) => index !== options.rowIndex))} />} />
                </DataTable>
            </Card>

            <Card>
                <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
                    <div className="flex gap-4 flex-wrap">
                        <span><span className="block text-color-secondary text-sm">Líquido</span><strong>{formatMoney(liquido)}</strong></span>
                        <span><span className="block text-color-secondary text-sm">Pago</span><strong>{formatMoney(pago)}</strong></span>
                        <span><span className="block text-color-secondary text-sm">Troco</span><strong className="text-green-600">{formatMoney(troco)}</strong></span>
                        {faltante > 0 ? <span><span className="block text-color-secondary text-sm">Faltante</span><strong className="text-orange-600">{formatMoney(faltante)}</strong></span> : null}
                    </div>
                    <PermissionGuard permission="PDV_VENDER" mode="disable">{({ disabled }) => <Button label="Registrar venda" icon="pi pi-check" loading={registrarMutation.isPending} disabled={disabled || !podeRegistrar} onClick={registrar} />}</PermissionGuard>
                </div>
                {faltante > 0 ? <small className="block text-orange-600 mt-2">O total pago deve ser maior ou igual ao líquido para registrar a venda.</small> : null}
            </Card>
        </>
    );
};
