import { describe, expect, it } from 'vitest';
import { OrigemFinanceira } from '@/types/erp';
import {
    buildCriarContaPagarPayload,
    buildCriarContaReceberPayload,
    buildCriarFormaPagamentoPayload,
    buildPagarContaPayload,
    buildReceberContaPayload
} from '@/features/financeiro/api/financeiroApi';

const empresaId = '11111111-1111-1111-1111-111111111111';
const clienteId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const fornecedorId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const parcelaId = 'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd';
const formaPagamentoId = 'efefefef-efef-efef-efef-efefefefefef';

describe('financeiro payloads', () => {
    it('monta forma de pagamento sem enviar filial inválida', () => {
        const payload = buildCriarFormaPagamentoPayload({ empresaId, filialId: '99', codigo: 'DINHEIRO', nome: 'Dinheiro', permiteRecebimento: true, permitePagamento: true });
        expect(payload).toEqual({ empresaId, codigo: 'DINHEIRO', nome: 'Dinheiro', permiteRecebimento: true, permitePagamento: true });
    });

    it('monta conta a receber manual com parcelas e enum numérico', () => {
        const payload = buildCriarContaReceberPayload({ empresaId, filialId: null, clienteId, documento: 'CR-0001', origem: OrigemFinanceira.Manual, origemId: '', dataEmissao: new Date('2026-05-05T13:00:00.000Z'), observacao: 'Conta manual', parcelas: [{ numero: 1, vencimento: new Date('2026-06-05T03:00:00.000Z'), valor: 100 }] });
        expect(payload.origem).toBe(OrigemFinanceira.Manual);
        expect(payload.origemId).toBeUndefined();
        expect(payload.parcelas).toHaveLength(1);
    });

    it('monta conta a pagar com fornecedor e sem guid vazio', () => {
        const payload = buildCriarContaPagarPayload({ empresaId, filialId: '', fornecedorId, documento: 'CP-0001', origem: OrigemFinanceira.Manual, origemId: null, dataEmissao: '2026-05-05T10:00:00-03:00', parcelas: [{ numero: 1, vencimento: '2026-06-05T00:00:00-03:00', valor: 100 }] });
        expect(payload.filialId).toBeUndefined();
        expect(payload.fornecedorId).toBe(fornecedorId);
    });

    it('monta recebimento com forma de pagamento e valores financeiros', () => {
        const payload = buildReceberContaPayload({ parcelaId, formaPagamentoId, dataRecebimento: '2026-05-05T10:00:00-03:00', valorRecebido: 100, valorJuros: 0, valorMulta: 0, valorDesconto: 0, gerarMovimentoCaixa: true, gerarMovimentoBancario: false, contaBancariaReferencia: '', observacao: 'Recebimento integral' });
        expect(payload.contaBancariaReferencia).toBeUndefined();
        expect(payload.valorRecebido).toBe(100);
    });

    it('monta pagamento com forma de pagamento e valores financeiros', () => {
        const payload = buildPagarContaPayload({ parcelaId, formaPagamentoId, dataPagamento: '2026-05-05T10:00:00-03:00', valorPago: 100, valorJuros: 0, valorMulta: 0, valorDesconto: 0, gerarMovimentoCaixa: true, gerarMovimentoBancario: false });
        expect(payload.formaPagamentoId).toBe(formaPagamentoId);
        expect(payload.valorPago).toBe(100);
    });
});
