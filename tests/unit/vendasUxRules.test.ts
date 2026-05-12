import { describe, expect, it } from 'vitest';
import { StatusPedidoVenda, TipoPedidoVenda } from '@/types/erp';
import { pedidoVendaAcoesDisponiveis, pedidoVendaBloqueiosVisuais, pedidoVendaDescontoPercentual, pedidoVendaItensCount } from '@/features/vendas/components/vendasUiUtils';
import { PedidoVendaResponse } from '@/features/vendas/types/vendas.types';

const basePedido: PedidoVendaResponse = {
    id: 'abababab-abab-abab-abab-abababababab',
    empresaId: '11111111-1111-1111-1111-111111111111',
    filialId: null,
    numero: 'PV-0001',
    clienteId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    dataEmissao: '2026-05-05T10:00:00-03:00',
    dataPrevisaoEntrega: null,
    tipo: TipoPedidoVenda.Pedido,
    statusPedido: StatusPedidoVenda.Rascunho,
    valorProdutos: 200,
    valorDesconto: 20,
    valorTotal: 180,
    observacao: null,
    motivoCancelamento: null,
    aprovadoEm: null,
    canceladoEm: null,
    faturadoEm: null,
    itens: []
};

describe('regras visuais de pedidos de venda', () => {
    it('calcula quantidade de itens e percentual de desconto para painéis visuais', () => {
        expect(pedidoVendaItensCount({ ...basePedido, itens: [{ id: '1' } as never, { id: '2' } as never] })).toBe(2);
        expect(pedidoVendaDescontoPercentual(basePedido)).toBe(10);
    });

    it('mostra bloqueio quando pedido em rascunho não possui item', () => {
        expect(pedidoVendaBloqueiosVisuais(basePedido)).toContain('Inclua pelo menos um item para enviar o pedido para aprovação.');
        expect(pedidoVendaAcoesDisponiveis(basePedido)).toContain('Editar cabeçalho e itens');
    });

    it('não oferece ações operacionais para pedido faturado', () => {
        const pedido = { ...basePedido, statusPedido: StatusPedidoVenda.Faturado };
        expect(pedidoVendaAcoesDisponiveis(pedido)).toEqual([]);
        expect(pedidoVendaBloqueiosVisuais(pedido)).toContain('Pedido faturado não deve ser alterado diretamente.');
    });
});
