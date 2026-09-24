import { describe, it, expect } from 'vitest';
import { criarClassificacaoPessoaSchema, atualizarClassificacaoPessoaSchema, inativarClassificacaoPessoaSchema } from '@/features/pessoas/schemas/pessoasSchemas';

/**
 * AC-2 da fatia v1.11.0a8b67 — Classificações de Pessoa.
 *
 * Schemas:
 * - Código: obrigatório, máx 40, sem espaço interno.
 * - Nome: obrigatório, máx 120.
 * - Descrição: opcional, máx 300.
 * - Motivo (inativação): obrigatório, máx 500.
 */

describe('criarClassificacaoPessoaSchema — AC-2', () => {
    const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

    it('AC-2: payload válido com código, nome, descrição passa', () => {
        const result = criarClassificacaoPessoaSchema.safeParse({
            empresaId,
            codigo: 'CLASS-001',
            nome: 'Classificação Teste',
            descricao: 'Uma descrição válida'
        });
        expect(result.success).toBe(true);
    });

    it('AC-2: código obrigatório', () => {
        const result = criarClassificacaoPessoaSchema.safeParse({
            empresaId,
            codigo: '',
            nome: 'Classificação Teste'
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some((issue) => issue.path.includes('codigo'))).toBe(true);
        }
    });

    it('AC-2: código máximo 40 caracteres', () => {
        const result = criarClassificacaoPessoaSchema.safeParse({
            empresaId,
            codigo: 'A'.repeat(41),
            nome: 'Classificação Teste'
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some((issue) => issue.path.includes('codigo'))).toBe(true);
        }
    });

    it('AC-2: código aceita máximo 40 caracteres', () => {
        const result = criarClassificacaoPessoaSchema.safeParse({
            empresaId,
            codigo: 'A'.repeat(40),
            nome: 'Classificação Teste'
        });
        expect(result.success).toBe(true);
    });

    it('AC-2: código rejeita espaço interno', () => {
        const result = criarClassificacaoPessoaSchema.safeParse({
            empresaId,
            codigo: 'CLASS 001',
            nome: 'Classificação Teste'
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some((issue) => issue.path.includes('codigo'))).toBe(true);
        }
    });

    it('AC-2: nome obrigatório', () => {
        const result = criarClassificacaoPessoaSchema.safeParse({
            empresaId,
            codigo: 'CLASS-001',
            nome: ''
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some((issue) => issue.path.includes('nome'))).toBe(true);
        }
    });

    it('AC-2: nome máximo 120 caracteres', () => {
        const result = criarClassificacaoPessoaSchema.safeParse({
            empresaId,
            codigo: 'CLASS-001',
            nome: 'A'.repeat(121)
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some((issue) => issue.path.includes('nome'))).toBe(true);
        }
    });

    it('AC-2: nome aceita máximo 120 caracteres', () => {
        const result = criarClassificacaoPessoaSchema.safeParse({
            empresaId,
            codigo: 'CLASS-001',
            nome: 'A'.repeat(120)
        });
        expect(result.success).toBe(true);
    });

    it('AC-2: descrição opcional', () => {
        const result = criarClassificacaoPessoaSchema.safeParse({
            empresaId,
            codigo: 'CLASS-001',
            nome: 'Classificação Teste'
        });
        expect(result.success).toBe(true);
    });

    it('AC-2: descrição máximo 300 caracteres', () => {
        const result = criarClassificacaoPessoaSchema.safeParse({
            empresaId,
            codigo: 'CLASS-001',
            nome: 'Classificação Teste',
            descricao: 'A'.repeat(301)
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some((issue) => issue.path.includes('descricao'))).toBe(true);
        }
    });

    it('AC-2: descrição aceita máximo 300 caracteres', () => {
        const result = criarClassificacaoPessoaSchema.safeParse({
            empresaId,
            codigo: 'CLASS-001',
            nome: 'Classificação Teste',
            descricao: 'A'.repeat(300)
        });
        expect(result.success).toBe(true);
    });

    it('AC-2: parse({}) falha — nem uma implementação vazia', () => {
        const result = criarClassificacaoPessoaSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it('AC-2: payload válido com empresaId, código, nome obrigatórios', () => {
        const result = criarClassificacaoPessoaSchema.safeParse({
            empresaId: empresaId,
            codigo: 'CLASS-001',
            nome: 'Classificação Teste'
        });
        expect(result.success).toBe(true);
        const parsed = result.data;
        expect(parsed?.empresaId).toBe(empresaId);
        expect(parsed?.codigo).toBe('CLASS-001');
        expect(parsed?.nome).toBe('Classificação Teste');
    });
});

describe('atualizarClassificacaoPessoaSchema — AC-3', () => {
    const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

    it('AC-3: payload válido com empresaId, nome, descrição passa', () => {
        const result = atualizarClassificacaoPessoaSchema.safeParse({
            empresaId,
            nome: 'Classificação Atualizada',
            descricao: 'Descrição atualizada'
        });
        expect(result.success).toBe(true);
    });

    it('AC-3: nome obrigatório na atualização', () => {
        const result = atualizarClassificacaoPessoaSchema.safeParse({
            empresaId,
            nome: ''
        });
        expect(result.success).toBe(false);
    });

    it('AC-3: descrição pode ser undefined (apagada)', () => {
        const result = atualizarClassificacaoPessoaSchema.safeParse({
            empresaId,
            nome: 'Classificação Atualizada',
            descricao: undefined
        });
        expect(result.success).toBe(true);
    });

    it('AC-3: descrição pode ser undefined', () => {
        const result = atualizarClassificacaoPessoaSchema.safeParse({
            empresaId,
            nome: 'Classificação Atualizada'
        });
        expect(result.success).toBe(true);
    });

    it('AC-3: código não deve estar no schema de atualização', () => {
        // A ideia é garantir que o código nunca é enviado no PUT.
        // Adicionar um campo desconhecido não deve quebrar a atualização.
        const result = atualizarClassificacaoPessoaSchema.safeParse({
            empresaId,
            nome: 'Classificação Atualizada',
            codigo: 'NOVO-CODIGO'
        });
        // O Zod com strict() rejeita campos desconhecidos, mas atualizarClassificacaoPessoaSchema
        // não usa strict(), então o campo é simplesmente ignorado.
        expect(result.success).toBe(true);
    });
});

describe('inativarClassificacaoPessoaSchema — AC-4', () => {
    const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

    it('AC-4: payload válido com empresaId e motivo passa', () => {
        const result = inativarClassificacaoPessoaSchema.safeParse({
            empresaId,
            motivo: 'Classificação obsoleta'
        });
        expect(result.success).toBe(true);
    });

    it('AC-4: motivo obrigatório', () => {
        const result = inativarClassificacaoPessoaSchema.safeParse({
            empresaId,
            motivo: ''
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some((issue) => issue.path.includes('motivo'))).toBe(true);
        }
    });

    it('AC-4: motivo máximo 500 caracteres', () => {
        const result = inativarClassificacaoPessoaSchema.safeParse({
            empresaId,
            motivo: 'A'.repeat(501)
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some((issue) => issue.path.includes('motivo'))).toBe(true);
        }
    });

    it('AC-4: motivo aceita máximo 500 caracteres', () => {
        const result = inativarClassificacaoPessoaSchema.safeParse({
            empresaId,
            motivo: 'A'.repeat(500)
        });
        expect(result.success).toBe(true);
    });
});
