import { describe, expect, it } from 'vitest';
import { sanitizePayload } from '@/lib/http/requestUtils';
import { abrirCaixaSchema, fecharCaixaSchema, itemVendaPdvSchema, movimentoCaixaSchema, pagamentoVendaPdvSchema, registrarVendaPdvSchema } from '@/features/pdv/schemas/pdvSchemas';
import { MeioPagamento } from '@/features/pdv/types/pdv.types';

const empresaId = '11111111-1111-1111-1111-111111111111';
const caixaId = '22222222-2222-2222-2222-222222222222';
const localId = '33333333-3333-3333-3333-333333333333';
const produtoId = '44444444-4444-4444-4444-444444444444';
const formaId = '55555555-5555-5555-5555-555555555555';

const build = <T>(schema: { parse: (v: unknown) => T }, values: unknown) => sanitizePayload(schema.parse(values));

describe('PDV — payloads', () => {
    it('monta abertura de caixa e omite filial vazia', () => {
        const payload = build(abrirCaixaSchema, { empresaId, filialId: '', codigo: 'CX1', terminal: 'T1', valorAbertura: 100 }) as Record<string, unknown>;
        expect(payload).toMatchObject({ empresaId, codigo: 'CX1', terminal: 'T1', valorAbertura: 100 });
        expect(payload.filialId).toBeNull();
    });

    it('valida movimento (valor positivo) e fechamento', () => {
        expect(build(movimentoCaixaSchema, { valor: 50, descricao: 'Troco inicial' })).toEqual({ valor: 50, descricao: 'Troco inicial' });
        expect(() => movimentoCaixaSchema.parse({ valor: 0, descricao: 'x' })).toThrow();
        expect(build(fecharCaixaSchema, { valorInformado: 250.5 })).toEqual({ valorInformado: 250.5 });
    });

    it('valida item e pagamento de venda', () => {
        expect(build(itemVendaPdvSchema, { produtoId, quantidade: 2, valorUnitario: 10, valorDesconto: 1 })).toEqual({ produtoId, quantidade: 2, valorUnitario: 10, valorDesconto: 1 });
        expect(() => itemVendaPdvSchema.parse({ produtoId, quantidade: 0, valorUnitario: 10, valorDesconto: 0 })).toThrow();
        expect(build(pagamentoVendaPdvSchema, { formaPagamentoId: formaId, meio: MeioPagamento.Dinheiro, valor: 20 })).toEqual({ formaPagamentoId: formaId, meio: MeioPagamento.Dinheiro, valor: 20 });
        expect(() => pagamentoVendaPdvSchema.parse({ formaPagamentoId: formaId, meio: MeioPagamento.Pix, valor: 0 })).toThrow();
    });

    it('monta registro de venda com itens e pagamentos', () => {
        const payload = build(registrarVendaPdvSchema, {
            caixaId,
            localEstoqueId: localId,
            clienteId: '',
            itens: [{ produtoId, quantidade: 1, valorUnitario: 30, valorDesconto: 0 }],
            pagamentos: [{ formaPagamentoId: formaId, meio: MeioPagamento.Dinheiro, valor: 50 }]
        }) as Record<string, unknown>;
        expect(payload).toMatchObject({ caixaId, localEstoqueId: localId });
        expect(payload.clienteId).toBeNull();
        expect((payload.itens as unknown[]).length).toBe(1);
        expect((payload.pagamentos as unknown[]).length).toBe(1);
    });

    it('rejeita venda sem itens ou sem pagamentos', () => {
        expect(() => registrarVendaPdvSchema.parse({ caixaId, localEstoqueId: localId, itens: [], pagamentos: [{ formaPagamentoId: formaId, meio: MeioPagamento.Dinheiro, valor: 10 }] })).toThrow();
        expect(() => registrarVendaPdvSchema.parse({ caixaId, localEstoqueId: localId, itens: [{ produtoId, quantidade: 1, valorUnitario: 10, valorDesconto: 0 }], pagamentos: [] })).toThrow();
    });
});
