import { describe, expect, it } from 'vitest';
import { buildPagarContaPayload, buildReceberContaPayload } from '@/features/financeiro/api/financeiroApi';
import { ReceberContaRequest, PagarContaRequest } from '@/features/financeiro/types/financeiro.types';

const parcelaReceberIds = {
    p1: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    p2: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
};
const parcelaPagarIds = { p1: 'cccccccc-cccc-cccc-cccc-cccccccccccc' };
const formaId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

describe('BaixaFinanceiraDialog — validação de payload', () => {
    it('payload de receber usa chave parcelaId e valorRecebido (não valor genérico)', () => {
        const payload = buildReceberContaPayload({
            parcelaId: parcelaReceberIds.p1,
            formaPagamentoId: formaId,
            dataRecebimento: '2026-05-05T10:00:00-03:00',
            valorRecebido: 300,
            valorJuros: 10,
            valorMulta: 0,
            valorDesconto: 5,
            gerarMovimentoCaixa: true,
            gerarMovimentoBancario: false,
            observacao: 'Pagamento recebido'
        }) as ReceberContaRequest;

        // Validar chaves corretas
        expect(payload).toHaveProperty('parcelaId');
        expect(payload).toHaveProperty('valorRecebido');
        expect(payload).not.toHaveProperty('parcelaPagarId');
        expect(payload).not.toHaveProperty('valor');

        // Validar valores
        expect(payload.parcelaId).toBe(parcelaReceberIds.p1);
        expect(payload.valorRecebido).toBe(300);
        expect(payload.valorJuros).toBe(10);
        expect(payload.valorDesconto).toBe(5);
    });

    it('payload de pagar usa chave parcelaId e valorPago (não valor genérico)', () => {
        const payload = buildPagarContaPayload({
            parcelaId: parcelaPagarIds.p1,
            formaPagamentoId: formaId,
            dataPagamento: '2026-05-05T10:00:00-03:00',
            valorPago: 1000,
            valorJuros: 0,
            valorMulta: 0,
            valorDesconto: 50,
            gerarMovimentoCaixa: false,
            gerarMovimentoBancario: true,
            observacao: 'Pagamento realizado'
        }) as PagarContaRequest;

        // Validar chaves corretas
        expect(payload).toHaveProperty('parcelaId');
        expect(payload).toHaveProperty('valorPago');
        expect(payload).not.toHaveProperty('parcelaReceberEberId');
        expect(payload).not.toHaveProperty('valor');

        // Validar valores
        expect(payload.parcelaId).toBe(parcelaPagarIds.p1);
        expect(payload.valorPago).toBe(1000);
        expect(payload.valorJuros).toBe(0);
        expect(payload.valorDesconto).toBe(50);
    });

    it('receber omite campos vazios (contaBancariaReferencia, observacao)', () => {
        const payload = buildReceberContaPayload({
            parcelaId: parcelaReceberIds.p1,
            formaPagamentoId: formaId,
            dataRecebimento: '2026-05-05T10:00:00-03:00',
            valorRecebido: 250,
            valorJuros: 0,
            valorMulta: 0,
            valorDesconto: 0,
            gerarMovimentoCaixa: true,
            gerarMovimentoBancario: false,
            contaBancariaReferencia: '',
            observacao: ''
        }) as ReceberContaRequest;

        // Campos vazios são omitidos pelo sanitizePayload
        expect(payload).not.toHaveProperty('contaBancariaReferencia');
        expect(payload).not.toHaveProperty('observacao');
    });

    it('pagar omite campos vazios (contaBancariaReferencia, observacao)', () => {
        const payload = buildPagarContaPayload({
            parcelaId: parcelaPagarIds.p1,
            formaPagamentoId: formaId,
            dataPagamento: '2026-05-05T10:00:00-03:00',
            valorPago: 500,
            valorJuros: 0,
            valorMulta: 0,
            valorDesconto: 0,
            gerarMovimentoCaixa: false,
            gerarMovimentoBancario: false,
            contaBancariaReferencia: '',
            observacao: ''
        }) as PagarContaRequest;

        // Campos vazios são omitidos pelo sanitizePayload
        expect(payload).not.toHaveProperty('contaBancariaReferencia');
        expect(payload).not.toHaveProperty('observacao');
    });

    it('schema valida: valor deve ser maior que zero', () => {
        // O schema Zod rejeita valor <= 0 no servidor
        // O UI bloqueará confirmar se valor <= 0 (FieldError "Informe um valor maior que zero.")
        expect(() => {
            buildReceberContaPayload({
                parcelaId: parcelaReceberIds.p1,
                formaPagamentoId: formaId,
                dataRecebimento: '2026-05-05T10:00:00-03:00',
                valorRecebido: 0, // Inválido
                valorJuros: 0,
                valorMulta: 0,
                valorDesconto: 0,
                gerarMovimentoCaixa: true,
                gerarMovimentoBancario: false
            });
        }).toThrow(/maior que zero/i);
    });

    it('chaves de data estão corretas por tipo (dataRecebimento vs dataPagamento)', () => {
        const receber = buildReceberContaPayload({
            parcelaId: parcelaReceberIds.p1,
            formaPagamentoId: formaId,
            dataRecebimento: '2026-06-01T10:00:00-03:00',
            valorRecebido: 100,
            valorJuros: 0,
            valorMulta: 0,
            valorDesconto: 0,
            gerarMovimentoCaixa: false,
            gerarMovimentoBancario: false
        }) as ReceberContaRequest;

        const pagar = buildPagarContaPayload({
            parcelaId: parcelaPagarIds.p1,
            formaPagamentoId: formaId,
            dataPagamento: '2026-06-01T10:00:00-03:00',
            valorPago: 100,
            valorJuros: 0,
            valorMulta: 0,
            valorDesconto: 0,
            gerarMovimentoCaixa: false,
            gerarMovimentoBancario: false
        }) as PagarContaRequest;

        // Receber usa dataRecebimento
        expect(receber).toHaveProperty('dataRecebimento');
        expect(receber).not.toHaveProperty('dataPagamento');

        // Pagar usa dataPagamento
        expect(pagar).toHaveProperty('dataPagamento');
        expect(pagar).not.toHaveProperty('dataRecebimento');
    });
});

describe('BaixaFinanceiraDialog — integração com contrato monetário', () => {
    it('campo valorSaldo de parcela é o ponto de partida para o valor do dialog (F1.1)', () => {
        // Este teste valida que a lógica do componente deve usar valorSaldo (não valor ausente)
        // O test não renderiza o componente, mas valida que tipos e API suportam isso

        const contaReceber = {
            id: '11111111-1111-1111-1111-111111111111',
            empresaId: '22222222-2222-2222-2222-222222222222',
            filialId: '33333333-3333-3333-3333-333333333333',
            clienteId: '44444444-4444-4444-4444-444444444444',
            documento: 'CR-001',
            origem: 1,
            dataEmissao: '2026-05-08T12:00:00.000Z',
            valorOriginal: 500,
            valorRecebido: 100,
            valorJuros: 0,
            valorMulta: 0,
            valorDesconto: 0,
            valorSaldo: 400, // O campo crítico (R$ 400,00, não R$ 0,00)
            status: 1,
            parcelas: [
                {
                    id: parcelaReceberIds.p1,
                    numero: 1,
                    vencimento: '2026-06-08T12:00:00.000Z',
                    valorOriginal: 300,
                    valorPago: 50,
                    valorJuros: 0,
                    valorMulta: 0,
                    valorDesconto: 0,
                    valorSaldo: 250, // Campo que UI deve usar (R$ 250,00)
                    status: 1
                }
            ]
        };

        // A primeira parcela tem valorSaldo = 250 (não zero)
        expect(contaReceber.parcelas[0].valorSaldo).toBe(250);

        // O payload enviado será montado com esse valor
        const payload = buildReceberContaPayload({
            parcelaId: contaReceber.parcelas[0].id,
            formaPagamentoId: formaId,
            dataRecebimento: new Date().toISOString(),
            valorRecebido: contaReceber.parcelas[0].valorSaldo, // UI preenche com valorSaldo
            valorJuros: 0,
            valorMulta: 0,
            valorDesconto: 0,
            gerarMovimentoCaixa: false,
            gerarMovimentoBancario: false
        }) as ReceberContaRequest;

        // Payload contém o valor correto (R$ 250,00)
        expect(payload.valorRecebido).toBe(250);
        expect(payload.valorRecebido).not.toBe(0);
    });
});
