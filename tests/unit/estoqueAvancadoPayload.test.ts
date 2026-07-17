import { describe, expect, it } from 'vitest';
import { sanitizePayload } from '@/lib/http/requestUtils';
import { ajusteEstoqueSchema, bloqueioEstoqueSchema, concluirInventarioSchema, criarInventarioSchema, itemInventarioSchema } from '@/features/estoque-avancado/schemas/estoqueAvancadoSchemas';
import { TipoAjusteEstoque } from '@/features/estoque-avancado/types/estoqueAvancado.types';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const localId = '33333333-3333-3333-3333-333333333333';
const produtoId = '44444444-4444-4444-4444-444444444444';

const build = <T>(schema: { parse: (v: unknown) => T }, values: unknown) => sanitizePayload(schema.parse(values));

describe('Estoque avançado — payloads', () => {
    it('monta inventário com data de referência em formato DateOnly (yyyy-MM-dd)', () => {
        const payload = build(criarInventarioSchema, { empresaId, filialId, localEstoqueId: localId, descricao: 'Inventário mensal', dataReferencia: new Date('2026-07-31T15:00:00.000Z') }) as Record<string, unknown>;
        expect(payload).toMatchObject({ empresaId, filialId, localEstoqueId: localId, descricao: 'Inventário mensal' });
        expect(payload.dataReferencia).toBe('2026-07-31');
    });

    it('exige filial no inventário (obrigatória no backend)', () => {
        expect(() => criarInventarioSchema.parse({ empresaId, filialId: '', localEstoqueId: localId, descricao: 'x', dataReferencia: new Date() })).toThrow();
    });

    it('monta item de inventário e motivo de conclusão', () => {
        expect(build(itemInventarioSchema, { produtoId, quantidadeSistema: 10, quantidadeContada: 8, observacao: '' })).toMatchObject({ produtoId, quantidadeSistema: 10, quantidadeContada: 8 });
        expect(build(concluirInventarioSchema, { motivoAjuste: 'Ajuste por contagem' })).toEqual({ motivoAjuste: 'Ajuste por contagem' });
        expect(() => concluirInventarioSchema.parse({ motivoAjuste: '' })).toThrow();
    });

    it('monta ajuste (entrada/saída) e bloqueio com quantidade positiva', () => {
        expect(build(ajusteEstoqueSchema, { empresaId, filialId, localEstoqueId: localId, produtoId, tipo: TipoAjusteEstoque.Saida, quantidade: 3, motivo: 'Perda' })).toMatchObject({ produtoId, tipo: TipoAjusteEstoque.Saida, quantidade: 3, motivo: 'Perda' });
        expect(() => ajusteEstoqueSchema.parse({ empresaId, filialId, localEstoqueId: localId, produtoId, tipo: TipoAjusteEstoque.Entrada, quantidade: 0, motivo: 'x' })).toThrow();
        expect(build(bloqueioEstoqueSchema, { empresaId, filialId, localEstoqueId: localId, produtoId, quantidade: 5, motivo: 'Recall' })).toMatchObject({ produtoId, quantidade: 5, motivo: 'Recall' });
    });
});
