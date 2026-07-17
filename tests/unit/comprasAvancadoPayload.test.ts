import { describe, expect, it } from 'vitest';
import { sanitizePayload } from '@/lib/http/requestUtils';
import {
    aprovarCotacaoSchema,
    conferenciaFiscalSchema,
    criarCotacaoSchema,
    criarSolicitacaoSchema,
    itemCotacaoSchema,
    itemSolicitacaoSchema
} from '@/features/compras-avancado/schemas/comprasAvancadoSchemas';

const empresaId = '11111111-1111-1111-1111-111111111111';
const fornecedorId = '22222222-2222-2222-2222-222222222222';
const produtoId = '33333333-3333-3333-3333-333333333333';

const build = <T>(schema: { parse: (v: unknown) => T }, values: unknown) => sanitizePayload(schema.parse(values));

describe('Compras avançado — payloads', () => {
    it('monta solicitação e converte data para ISO', () => {
        const payload = build(criarSolicitacaoSchema, { empresaId, filialId: '', numero: 'SC-1', dataSolicitacao: new Date('2026-07-20T00:00:00.000Z'), solicitante: 'Maria', justificativa: '' }) as Record<string, unknown>;
        expect(payload).toMatchObject({ empresaId, numero: 'SC-1', solicitante: 'Maria' });
        expect(payload.dataSolicitacao).toBe('2026-07-20T00:00:00.000Z');
    });

    it('valida item de solicitação (quantidade positiva)', () => {
        expect(build(itemSolicitacaoSchema, { produtoId, quantidade: 5, observacao: '' })).toMatchObject({ produtoId, quantidade: 5 });
        expect(() => itemSolicitacaoSchema.parse({ produtoId, quantidade: 0 })).toThrow();
    });

    it('monta cotação com fornecedor e item com preço', () => {
        const cotacao = build(criarCotacaoSchema, { empresaId, numero: 'COT-1', fornecedorId, dataCotacao: new Date('2026-07-21T00:00:00.000Z') }) as Record<string, unknown>;
        expect(cotacao).toMatchObject({ empresaId, numero: 'COT-1', fornecedorId });
        expect(build(itemCotacaoSchema, { produtoId, quantidade: 3, valorUnitario: 12.5, observacao: '' })).toMatchObject({ produtoId, quantidade: 3, valorUnitario: 12.5 });
    });

    it('monta aprovação de cotação (gera pedido) com número e emissão obrigatórios', () => {
        const payload = build(aprovarCotacaoSchema, { numeroPedido: 'PC-100', dataEmissaoPedido: new Date('2026-07-22T00:00:00.000Z') }) as Record<string, unknown>;
        expect(payload).toMatchObject({ numeroPedido: 'PC-100' });
        expect(payload.dataEmissaoPedido).toBe('2026-07-22T00:00:00.000Z');
        expect(() => aprovarCotacaoSchema.parse({ numeroPedido: '', dataEmissaoPedido: new Date() })).toThrow();
    });

    it('monta conferência fiscal com dados da NF obrigatórios', () => {
        const payload = build(conferenciaFiscalSchema, { chaveAcesso: '', serie: '1', numero: '55', cnpjEmitente: '12345678000190', dataEmissaoNota: new Date('2026-07-23T00:00:00.000Z'), valorTotalNota: 999.9, observacao: '' }) as Record<string, unknown>;
        expect(payload).toMatchObject({ serie: '1', numero: '55', cnpjEmitente: '12345678000190', valorTotalNota: 999.9 });
        expect(() => conferenciaFiscalSchema.parse({ serie: '', numero: '55', cnpjEmitente: 'x', dataEmissaoNota: new Date(), valorTotalNota: 1 })).toThrow();
    });
});
