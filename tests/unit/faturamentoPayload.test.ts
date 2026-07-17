import { describe, expect, it } from 'vitest';
import { sanitizePayload } from '@/lib/http/requestUtils';
import { cancelarFaturamentoSchema, confirmarFaturamentoSchema, prepararFaturamentoSchema } from '@/features/faturamento/schemas/faturamentoSchemas';
import { TipoDocumentoFiscal } from '@/features/faturamento/types/faturamento.types';

const pedidoId = '11111111-1111-1111-1111-111111111111';
const condicaoId = '22222222-2222-2222-2222-222222222222';

const build = <T>(schema: { parse: (v: unknown) => T }, values: unknown) => sanitizePayload(schema.parse(values));

describe('Faturamento — payloads', () => {
    it('monta preparar com pedido e observação opcional', () => {
        expect(build(prepararFaturamentoSchema, { pedidoVendaId: pedidoId, observacao: 'Urgente' })).toEqual({ pedidoVendaId: pedidoId, observacao: 'Urgente' });
        const semObs = build(prepararFaturamentoSchema, { pedidoVendaId: pedidoId, observacao: '' }) as Record<string, unknown>;
        expect(semObs).toMatchObject({ pedidoVendaId: pedidoId });
        expect(semObs.observacao).toBeNull();
    });

    it('rejeita preparar sem pedido válido', () => {
        expect(() => prepararFaturamentoSchema.parse({ pedidoVendaId: '99' })).toThrow();
    });

    it('monta confirmar com dados fiscais e converte a data de vencimento para ISO', () => {
        const payload = build(confirmarFaturamentoSchema, {
            ufAutorizadora: 'SP',
            tipoDocumento: TipoDocumentoFiscal.NFe,
            serie: '1',
            numero: '1001',
            cfopPadrao: '5102',
            unidadeComercialPadrao: 'UN',
            validarDadosFiscaisProduto: true,
            condicaoPagamentoId: condicaoId,
            primeiraDataVencimentoContaReceber: new Date('2026-08-10T00:00:00.000Z')
        }) as Record<string, unknown>;
        expect(payload).toMatchObject({ ufAutorizadora: 'SP', tipoDocumento: TipoDocumentoFiscal.NFe, serie: '1', numero: '1001', unidadeComercialPadrao: 'UN', condicaoPagamentoId: condicaoId });
        expect(payload.primeiraDataVencimentoContaReceber).toBe('2026-08-10T00:00:00.000Z');
    });

    it('exige campos fiscais obrigatórios e a data de vencimento no confirmar', () => {
        expect(() => confirmarFaturamentoSchema.parse({ ufAutorizadora: '', tipoDocumento: TipoDocumentoFiscal.NFe, serie: '1', numero: '1', unidadeComercialPadrao: 'UN', primeiraDataVencimentoContaReceber: new Date() })).toThrow();
        expect(() => confirmarFaturamentoSchema.parse({ ufAutorizadora: 'SP', tipoDocumento: TipoDocumentoFiscal.NFe, serie: '1', numero: '1', unidadeComercialPadrao: 'UN', primeiraDataVencimentoContaReceber: null })).toThrow();
    });

    it('monta cancelamento com motivo', () => {
        expect(build(cancelarFaturamentoSchema, { motivo: 'Erro de emissão' })).toEqual({ motivo: 'Erro de emissão' });
        expect(() => cancelarFaturamentoSchema.parse({ motivo: '' })).toThrow();
    });
});
