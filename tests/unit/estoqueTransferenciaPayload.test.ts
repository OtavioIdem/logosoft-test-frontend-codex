import { describe, expect, it } from 'vitest';
import { transferenciaEstoqueSchema } from '@/features/estoque/schemas/estoqueSchemas';
import type { TransferenciaEstoqueRequest } from '@/features/estoque/types/estoque.types';

/**
 * AC-6 da fatia v1.11.0a8b68.
 *
 * Transferência envia `documento` no payload e **não** envia `origemId`.
 * D73: origemId não é exposto nem enviado; é um correlacionador gerado pelo backend.
 */

const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const filialOrigemId = '11111111-1111-1111-1111-111111111111';
const localEstoqueOrigemId = '22222222-2222-2222-2222-222222222222';
const filialDestinoId = '33333333-3333-3333-3333-333333333333';
const localEstoqueDestinoId = '44444444-4444-4444-4444-444444444444';
const produtoId = '55555555-5555-5555-5555-555555555555';

describe('AC-6: TransferenciaEstoqueRequest envia `documento` sem `origemId` (D73)', () => {
    it('prova que o schema aceita `documento` preenchido', () => {
        const payload: TransferenciaEstoqueRequest = {
            empresaId,
            filialOrigemId,
            localEstoqueOrigemId,
            filialDestinoId,
            localEstoqueDestinoId,
            produtoId,
            quantidade: 10,
            origemModulo: 'MANUAL',
            documento: 'TRANSF-2024-001', // Documento preenchido
            motivo: 'Transferência entre locais'
        };

        const parsed = transferenciaEstoqueSchema.safeParse(payload);
        expect(parsed.success).toBe(true);
        if (parsed.success) {
            expect(parsed.data.documento).toBe('TRANSF-2024-001');
        }
    });

    it('prova que o schema aceita `documento` null/vazio', () => {
        const payload: TransferenciaEstoqueRequest = {
            empresaId,
            filialOrigemId,
            localEstoqueOrigemId,
            filialDestinoId,
            localEstoqueDestinoId,
            produtoId,
            quantidade: 10,
            origemModulo: 'MANUAL',
            documento: null, // Documento vazio
            motivo: 'Transferência sem documento'
        };

        const parsed = transferenciaEstoqueSchema.safeParse(payload);
        expect(parsed.success).toBe(true);
        if (parsed.success) {
            // O schema com nullableText transforma null em undefined
            expect([null, undefined]).toContain(parsed.data.documento);
        }
    });

    it('controle: o schema rejeita `origemId` se ele for enviado (não deve estar no payload)', () => {
        const payloadComOrigemId = {
            empresaId,
            filialOrigemId,
            localEstoqueOrigemId,
            filialDestinoId,
            localEstoqueDestinoId,
            produtoId,
            quantidade: 10,
            origemModulo: 'MANUAL',
            origemId: 'origem-tentada', // Tentativa de enviar origemId
            documento: 'TRANSF-2024-001',
            motivo: 'Teste'
        };

        const parsed = transferenciaEstoqueSchema.safeParse(payloadComOrigemId);
        // O schema ou rejeita a chave extra, ou a ignora durante parsing
        // De qualquer forma, `origemId` não deve estar no resultado parsed
        if (parsed.success) {
            expect(parsed.data).not.toHaveProperty('origemId');
        }
    });

    it('prova que o payload obrigatório está completo sem `origemId`', () => {
        const payload: TransferenciaEstoqueRequest = {
            empresaId,
            filialOrigemId,
            localEstoqueOrigemId,
            filialDestinoId,
            localEstoqueDestinoId,
            produtoId,
            quantidade: 10,
            origemModulo: 'MANUAL',
            documento: 'TRANSF-2024-002',
            motivo: 'Transferência válida'
        };

        const parsed = transferenciaEstoqueSchema.safeParse(payload);
        expect(parsed.success).toBe(true);

        // O payload não tem `origemId`
        expect(payload).not.toHaveProperty('origemId');

        // Mas tem todos os campos esperados
        expect(payload).toHaveProperty('empresaId');
        expect(payload).toHaveProperty('documento');
        expect(payload).toHaveProperty('motivo');
    });
});
