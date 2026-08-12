import { describe, expect, it } from 'vitest';
import { OrigemFinanceira } from '@/types/erp';
import {
    buildCriarContaPagarPayload,
    buildCriarContaReceberPayload,
    buildCriarFormaPagamentoPayload,
    buildEstornarPagamentoPayload,
    buildFluxoCaixaQuery,
    buildPagarContaPayload,
    buildReceberContaPayload
} from '@/features/financeiro/api/financeiroApi';

const empresaId = '11111111-1111-1111-1111-111111111111';
const clienteId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const fornecedorId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const baixaId = 'dededede-dede-dede-dede-dededededede';

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

    it('monta recebimento por parcela no DTO do endpoint /receber', () => {
        const payload = buildReceberContaPayload({ parcelaId: baixaId, formaPagamentoId: clienteId, dataRecebimento: '2026-05-05T10:00:00-03:00', valorRecebido: 100, valorJuros: 0, valorMulta: 0, valorDesconto: 0, gerarMovimentoCaixa: true, gerarMovimentoBancario: false, contaBancariaReferencia: '', observacao: '' });
        expect(payload).toEqual({ parcelaId: baixaId, formaPagamentoId: clienteId, dataRecebimento: '2026-05-05T10:00:00-03:00', valorRecebido: 100, valorJuros: 0, valorMulta: 0, valorDesconto: 0, gerarMovimentoCaixa: true, gerarMovimentoBancario: false });
        expect(payload).not.toHaveProperty('dataBaixa');
        expect(payload).not.toHaveProperty('valor');
    });

    it('monta pagamento por parcela no DTO do endpoint /pagar', () => {
        const payload = buildPagarContaPayload({ parcelaId: baixaId, formaPagamentoId: fornecedorId, dataPagamento: '2026-05-05T10:00:00-03:00', valorPago: 100, valorJuros: 0, valorMulta: 0, valorDesconto: 0, gerarMovimentoCaixa: true, gerarMovimentoBancario: false, contaBancariaReferencia: '', observacao: 'Pagamento parcial' });
        expect(payload).toMatchObject({ parcelaId: baixaId, formaPagamentoId: fornecedorId, dataPagamento: '2026-05-05T10:00:00-03:00', valorPago: 100, valorJuros: 0, valorMulta: 0, valorDesconto: 0, gerarMovimentoCaixa: true, gerarMovimentoBancario: false, observacao: 'Pagamento parcial' });
        expect(payload).not.toHaveProperty('dataBaixa');
    });

    it('monta estorno com a referência do pagamento e motivo', () => {
        const payload = buildEstornarPagamentoPayload({ pagamentoId: baixaId, motivo: 'Baixa duplicada' });
        expect(payload).toEqual({ pagamentoId: baixaId, motivo: 'Baixa duplicada' });
        expect(payload).not.toHaveProperty('baixaId');
    });

    it('monta filtro do fluxo de caixa omitindo filial inválida', () => {
        const payload = buildFluxoCaixaQuery({ empresaId, filialId: '', dataInicial: '2026-06-01T00:00:00-03:00', dataFinal: '2026-06-30T23:59:59-03:00' });
        expect(payload).toEqual({ empresaId, dataInicial: '2026-06-01T00:00:00-03:00', dataFinal: '2026-06-30T23:59:59-03:00' });
    });
});
