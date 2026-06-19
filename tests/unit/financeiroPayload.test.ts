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

    it('monta baixa de conta a receber no contrato oficial /baixar', () => {
        const payload = buildReceberContaPayload({ dataBaixa: '2026-05-05T10:00:00-03:00', valor: 100, observacao: '' });
        expect(payload).toEqual({ dataBaixa: '2026-05-05T10:00:00-03:00', valor: 100 });
        expect(payload).not.toHaveProperty('parcelaId');
        expect(payload).not.toHaveProperty('formaPagamentoId');
    });

    it('monta baixa de conta a pagar no contrato oficial /baixar', () => {
        const payload = buildPagarContaPayload({ dataBaixa: '2026-05-05T10:00:00-03:00', valor: 100, observacao: 'Pagamento parcial' });
        expect(payload).toMatchObject({ dataBaixa: '2026-05-05T10:00:00-03:00', valor: 100, observacao: 'Pagamento parcial' });
    });

    it('monta estorno financeiro com baixaId, dataEstorno e motivo', () => {
        const payload = buildEstornarPagamentoPayload({ baixaId, dataEstorno: '2026-05-06T10:00:00-03:00', motivo: 'Baixa duplicada' });
        expect(payload).toEqual({ baixaId, dataEstorno: '2026-05-06T10:00:00-03:00', motivo: 'Baixa duplicada' });
        expect(payload).not.toHaveProperty('pagamentoId');
    });

    it('monta filtro do fluxo de caixa omitindo filial inválida', () => {
        const payload = buildFluxoCaixaQuery({ empresaId, filialId: '', dataInicial: '2026-06-01T00:00:00-03:00', dataFinal: '2026-06-30T23:59:59-03:00' });
        expect(payload).toEqual({ empresaId, dataInicial: '2026-06-01T00:00:00-03:00', dataFinal: '2026-06-30T23:59:59-03:00' });
    });
});
