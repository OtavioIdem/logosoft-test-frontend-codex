import { describe, expect, it } from 'vitest';
import { buildAdicionarItemPedidoVendaPayload, buildAprovarPedidoVendaPayload, buildCancelarPedidoVendaPayload, buildCriarPedidoVendaPayload, buildFaturarPedidoVendaPayload } from '@/features/vendas/api/vendasApi';
import { TipoPedidoVenda } from '@/types/erp';

const empresaId = '11111111-1111-1111-1111-111111111111';
const clienteId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const produtoId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const localEstoqueId = '99999999-9999-9999-9999-999999999999';

describe('payloads de Vendas', () => {
    it('monta criação de pedido com filial null, enum numérico e datas ISO/string', () => {
        expect(buildCriarPedidoVendaPayload({
            empresaId,
            filialId: '',
            numero: 'PV-0001',
            clienteId,
            dataEmissao: '2026-05-05T10:00:00-03:00',
            dataPrevisaoEntrega: '',
            tipo: TipoPedidoVenda.Pedido,
            observacao: ''
        })).toEqual({
            empresaId,
            filialId: null,
            numero: 'PV-0001',
            clienteId,
            dataEmissao: '2026-05-05T10:00:00-03:00',
            dataPrevisaoEntrega: null,
            tipo: TipoPedidoVenda.Pedido,
            observacao: null
        });
    });

    it('monta item e rejeita desconto maior que o bruto', () => {
        expect(buildAdicionarItemPedidoVendaPayload({ produtoId, localEstoqueId, quantidade: 2, valorUnitario: 100, valorDesconto: 10, observacao: '' })).toEqual({
            produtoId,
            localEstoqueId,
            quantidade: 2,
            valorUnitario: 100,
            valorDesconto: 10,
            observacao: null
        });
        expect(() => buildAdicionarItemPedidoVendaPayload({ produtoId, localEstoqueId, quantidade: 1, valorUnitario: 100, valorDesconto: 101 })).toThrow('O desconto não pode ultrapassar o valor bruto do item.');
    });

    it('monta ações críticas com motivo e flags booleanas', () => {
        expect(buildAprovarPedidoVendaPayload({ reservarEstoque: true, observacao: '' })).toEqual({ reservarEstoque: true, observacao: null });
        expect(buildFaturarPedidoVendaPayload({ baixarEstoque: true, documento: 'FAT-0001', observacao: '' })).toEqual({ baixarEstoque: true, documento: 'FAT-0001', observacao: null });
        expect(buildCancelarPedidoVendaPayload('Cliente desistiu')).toEqual({ motivo: 'Cliente desistiu' });
        expect(() => buildCancelarPedidoVendaPayload('')).toThrow('Informe o motivo');
    });
});
