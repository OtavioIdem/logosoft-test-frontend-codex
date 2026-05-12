import { describe, expect, it } from 'vitest';
import { StatusPedidoCompra } from '@/types/erp';
import {
    calculateRecebimentoTotals,
    getPedidoCompraDescontoPercentual,
    getPedidoCompraNextAction,
    getPedidoCompraOperationalBlocks,
    getPedidoCompraStatusSteps
} from '@/features/compras/components/comprasUiUtils';
import { PedidoCompraResponse } from '@/features/compras/types/compras.types';

const pedidoBase: PedidoCompraResponse = {
    id: '78787878-7878-7878-7878-787878787878',
    empresaId: '11111111-1111-1111-1111-111111111111',
    filialId: null,
    numero: 'PC-0001',
    fornecedorId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    dataEmissao: '2026-05-05T10:00:00-03:00',
    dataPrevisaoEntrega: '2026-05-10T10:00:00-03:00',
    condicaoPagamentoId: null,
    statusPedido: StatusPedidoCompra.Rascunho,
    valorProdutos: 500,
    valorDesconto: 50,
    valorTotal: 450,
    observacao: 'Pedido de compra teste',
    itens: []
};

describe('compras UX rules', () => {
    it('calcula percentual de desconto do pedido', () => {
        expect(getPedidoCompraDescontoPercentual(pedidoBase)).toBe(10);
    });

    it('orienta inclusão de itens quando pedido não tem item', () => {
        expect(getPedidoCompraNextAction(pedidoBase)).toContain('Inclua itens');
        expect(getPedidoCompraOperationalBlocks(pedidoBase).find((item) => item.key === 'itens')?.blocked).toBe(true);
    });

    it('marca recebimento como etapa atual para pedido parcialmente recebido', () => {
        const steps = getPedidoCompraStatusSteps({ ...pedidoBase, statusPedido: StatusPedidoCompra.ParcialmenteRecebido, itens: [{ id: '56565656-5656-5656-5656-565656565656', produtoId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', localEstoqueId: '99999999-9999-9999-9999-999999999999', quantidade: 10, valorUnitario: 50, valorDesconto: 0, valorTotal: 500 }] });
        expect(steps.find((step) => step.key === 'recebimento')?.active).toBe(true);
    });

    it('calcula totais do recebimento somente com itens selecionados', () => {
        expect(calculateRecebimentoTotals([
            { selecionado: true, quantidade: 2, valorUnitario: 50 },
            { selecionado: false, quantidade: 10, valorUnitario: 100 },
            { selecionado: true, quantidade: 1, valorUnitario: 25 }
        ])).toEqual({ selectedCount: 2, total: 125 });
    });
});
