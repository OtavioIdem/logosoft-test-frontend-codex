import { describe, expect, it } from 'vitest';
import { sanitizePayload } from '@/lib/http/requestUtils';
import { baixarContaSchema, cancelarContaSchema, criarContaSchema, estornarBaixaSchema } from '@/features/financeiro-avancado/schemas/financeiroAvancadoSchemas';

const empresaId = '11111111-1111-1111-1111-111111111111';
const participanteId = '22222222-2222-2222-2222-222222222222';
const baixaId = '33333333-3333-3333-3333-333333333333';

const build = <T>(schema: { parse: (v: unknown) => T }, values: unknown) => sanitizePayload(schema.parse(values));

describe('Financeiro avançado — payloads', () => {
    it('monta conta com datas em DateOnly (yyyy-MM-dd)', () => {
        const payload = build(criarContaSchema, { empresaId, filialId: '', participanteId, descricao: 'Serviço', documento: '', valorOriginal: 1500, dataEmissao: new Date('2026-07-01T10:00:00.000Z'), dataVencimento: new Date('2026-08-01T10:00:00.000Z') }) as Record<string, unknown>;
        expect(payload).toMatchObject({ empresaId, participanteId, descricao: 'Serviço', valorOriginal: 1500 });
        expect(payload.dataEmissao).toBe('2026-07-01');
        expect(payload.dataVencimento).toBe('2026-08-01');
        expect(payload.filialId).toBeNull();
    });

    it('rejeita conta com valor não positivo', () => {
        expect(() => criarContaSchema.parse({ empresaId, participanteId, descricao: 'x', valorOriginal: 0, dataEmissao: new Date(), dataVencimento: new Date() })).toThrow();
    });

    it('monta baixa e exige data', () => {
        const payload = build(baixarContaSchema, { valor: 500, dataBaixa: new Date('2026-07-15T00:00:00.000Z'), observacao: '' }) as Record<string, unknown>;
        expect(payload).toMatchObject({ valor: 500 });
        expect(payload.dataBaixa).toBe('2026-07-15');
        expect(() => baixarContaSchema.parse({ valor: 100, dataBaixa: null })).toThrow();
    });

    it('monta estorno com baixaId + motivo e cancelamento com motivo', () => {
        const estorno = build(estornarBaixaSchema, { baixaId, dataEstorno: new Date('2026-07-20T00:00:00.000Z'), motivo: 'Estorno indevido' }) as Record<string, unknown>;
        expect(estorno).toMatchObject({ baixaId, motivo: 'Estorno indevido' });
        expect(estorno.dataEstorno).toBe('2026-07-20');
        expect(() => estornarBaixaSchema.parse({ baixaId: '99', dataEstorno: new Date(), motivo: 'x' })).toThrow();
        expect(build(cancelarContaSchema, { motivo: 'Duplicidade' })).toEqual({ motivo: 'Duplicidade' });
    });
});
