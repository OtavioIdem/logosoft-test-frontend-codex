import { describe, expect, it } from 'vitest';
import {
    buildAdicionarItemPedidoCompraPayload,
    buildAprovarPedidoCompraPayload,
    buildCancelarPedidoCompraPayload,
    buildCriarPedidoCompraPayload,
    buildReceberPedidoCompraPayload
} from '@/features/compras/api/comprasApi';

const empresaId = '11111111-1111-1111-1111-111111111111';
const fornecedorId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const produtoId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const localEstoqueId = '99999999-9999-9999-9999-999999999999';
const itemPedidoCompraId = '56565656-5656-5656-5656-565656565656';

describe('payloads de Compras', () => {
    it('monta criação de pedido com fornecedor selecionado por nome e payload enviando somente referência técnica', () => {
        expect(buildCriarPedidoCompraPayload({
            empresaId,
            filialId: '',
            numero: 'PC-0001',
            fornecedorId,
            dataEmissao: '2026-05-05T10:00:00-03:00',
            dataPrevisaoEntrega: '2026-05-10T10:00:00-03:00',
            condicaoPagamentoId: '',
            observacao: ''
        })).toEqual({
            empresaId,
            filialId: null,
            numero: 'PC-0001',
            fornecedorId,
            dataEmissao: '2026-05-05T10:00:00-03:00',
            dataPrevisaoEntrega: '2026-05-10T10:00:00-03:00',
            condicaoPagamentoId: null,
            observacao: null
        });
    });

    it('monta item e rejeita desconto maior que o bruto', () => {
        expect(buildAdicionarItemPedidoCompraPayload({ produtoId, localEstoqueId, quantidade: 10, valorUnitario: 50, valorDesconto: 20, observacao: '' })).toEqual({
            produtoId,
            localEstoqueId,
            quantidade: 10,
            valorUnitario: 50,
            valorDesconto: 20,
            observacao: null
        });
        expect(() => buildAdicionarItemPedidoCompraPayload({ produtoId, localEstoqueId, quantidade: 1, valorUnitario: 50, valorDesconto: 51 })).toThrow('O desconto não pode ultrapassar o valor bruto do item.');
    });

    it('monta aprovação, cancelamento e recebimento com itens selecionados', () => {
        expect(buildAprovarPedidoCompraPayload({ observacao: '' })).toEqual({ observacao: null });
        expect(buildCancelarPedidoCompraPayload('Compra cancelada')).toEqual({ motivo: 'Compra cancelada' });
        expect(buildReceberPedidoCompraPayload({
            documento: 'NF-ENT-0001',
            dataRecebimento: '2026-05-06T10:00:00-03:00',
            permiteReceberAcimaDoPedido: false,
            gerarContaPagar: true,
            primeiroVencimento: '',
            observacao: '',
            itens: [{ itemPedidoCompraId, quantidade: 10, localEstoqueId, valorUnitario: 50 }]
        })).toEqual({
            documento: 'NF-ENT-0001',
            dataRecebimento: '2026-05-06T10:00:00-03:00',
            permiteReceberAcimaDoPedido: false,
            gerarContaPagar: true,
            primeiroVencimento: null,
            observacao: null,
            itens: [{ itemPedidoCompraId, quantidade: 10, localEstoqueId, valorUnitario: 50 }]
        });
    });
});
