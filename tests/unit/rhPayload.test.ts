import { describe, expect, it } from 'vitest';
import { admitirColaboradorSchema } from '@/features/rh/schemas/rhSchemas';
import { sanitizePayload } from '@/lib/http/requestUtils';

const empresaId = '11111111-1111-1111-1111-111111111111';
const cargoId = '33333333-3333-3333-3333-333333333333';
const pessoaId = '44444444-4444-4444-4444-444444444444';

describe('RH — AC-1, AC-2 — admitirColaboradorSchema com pessoaId', () => {
    describe('AC-1: pessoaId é enviado quando uma Pessoa é escolhida', () => {
        it('schema normaliza pessoaId quando fornecido válido', () => {
            const input = {
                empresaId,
                filialId: null,
                matricula: 'MAT001',
                nome: 'João Silva',
                cpf: '111.111.111-11',
                cargoId,
                setorId: null,
                pessoaId,
                jornadaId: null,
                regime: 1, // CLT
                salarioBase: 3000,
                dataAdmissao: new Date('2026-01-01'),
                dataNascimento: null,
                email: null,
                telefone: null
            };

            const parsed = admitirColaboradorSchema.parse(input);
            // O schema faz transform, então pessoaId é preservado
            expect(parsed).toHaveProperty('pessoaId');
            expect(parsed.pessoaId).toBe(pessoaId);

            // Após sanitizePayload, o pessoaId deve estar presente no payload
            const sanitized = sanitizePayload(parsed) as Record<string, unknown>;
            expect(sanitized).toHaveProperty('pessoaId');
            expect(sanitized.pessoaId).toBe(pessoaId);
        });
    });

    describe('AC-2: pessoaId é null quando nenhuma Pessoa é escolhida', () => {
        it('schema transforma string vazia em null', () => {
            const input = {
                empresaId,
                filialId: null,
                matricula: 'MAT001',
                nome: 'João Silva',
                cpf: '111.111.111-11',
                cargoId,
                setorId: null,
                pessoaId: '', // String vazia
                jornadaId: null,
                regime: 1,
                salarioBase: 3000,
                dataAdmissao: new Date('2026-01-01'),
                dataNascimento: null,
                email: null,
                telefone: null
            };

            const parsed = admitirColaboradorSchema.parse(input);
            expect(parsed.pessoaId).toBe(null);

            // Crítico: sanitizePayload MANTÉM null em campos GUID
            const sanitized = sanitizePayload(parsed) as Record<string, unknown>;
            expect(sanitized).toHaveProperty('pessoaId');
            expect(sanitized.pessoaId).toBe(null);
            expect(sanitized.pessoaId).not.toBeUndefined();
        });

        it('schema transforma undefined em null', () => {
            const input = {
                empresaId,
                filialId: null,
                matricula: 'MAT001',
                nome: 'João Silva',
                cpf: '111.111.111-11',
                cargoId,
                setorId: null,
                pessoaId: undefined,
                jornadaId: null,
                regime: 1,
                salarioBase: 3000,
                dataAdmissao: new Date('2026-01-01'),
                dataNascimento: null,
                email: null,
                telefone: null
            };

            const parsed = admitirColaboradorSchema.parse(input);
            expect(parsed.pessoaId).toBe(null);

            const sanitized = sanitizePayload(parsed) as Record<string, unknown>;
            expect(sanitized).toHaveProperty('pessoaId');
            expect(sanitized.pessoaId).toBe(null);
        });

        it('schema transforma null em null', () => {
            const input = {
                empresaId,
                filialId: null,
                matricula: 'MAT001',
                nome: 'João Silva',
                cpf: '111.111.111-11',
                cargoId,
                setorId: null,
                pessoaId: null,
                jornadaId: null,
                regime: 1,
                salarioBase: 3000,
                dataAdmissao: new Date('2026-01-01'),
                dataNascimento: null,
                email: null,
                telefone: null
            };

            const parsed = admitirColaboradorSchema.parse(input);
            expect(parsed.pessoaId).toBe(null);

            const sanitized = sanitizePayload(parsed) as Record<string, unknown>;
            expect(sanitized).toHaveProperty('pessoaId');
            expect(sanitized.pessoaId).toBe(null);
        });

        it('rejeita GUID inválido em pessoaId', () => {
            const input = {
                empresaId,
                filialId: null,
                matricula: 'MAT001',
                nome: 'João Silva',
                cpf: '111.111.111-11',
                cargoId,
                setorId: null,
                pessoaId: 'nao-e-guid-valido',
                jornadaId: null,
                regime: 1,
                salarioBase: 3000,
                dataAdmissao: new Date('2026-01-01'),
                dataNascimento: null,
                email: null,
                telefone: null
            };

            expect(() => admitirColaboradorSchema.parse(input)).toThrow('Selecione um registro válido.');
        });
    });

    describe('Sanidade: outros campos opcionais também funcionam como esperado', () => {
        it('filialId null é preservado no sanitizePayload', () => {
            const input = {
                empresaId,
                filialId: null,
                matricula: 'MAT001',
                nome: 'João Silva',
                cpf: '111.111.111-11',
                cargoId,
                setorId: null,
                pessoaId: null,
                jornadaId: null,
                regime: 1,
                salarioBase: 3000,
                dataAdmissao: new Date('2026-01-01'),
                dataNascimento: null,
                email: null,
                telefone: null
            };

            const parsed = admitirColaboradorSchema.parse(input);
            const sanitized = sanitizePayload(parsed) as Record<string, unknown>;

            // null em GUID é preservado
            expect(sanitized).toHaveProperty('filialId');
            expect(sanitized.filialId).toBe(null);
        });

        it('email null é preservado como null', () => {
            const input = {
                empresaId,
                filialId: null,
                matricula: 'MAT001',
                nome: 'João Silva',
                cpf: '111.111.111-11',
                cargoId,
                setorId: null,
                pessoaId: null,
                jornadaId: null,
                regime: 1,
                salarioBase: 3000,
                dataAdmissao: new Date('2026-01-01'),
                dataNascimento: null,
                email: null,
                telefone: null
            };

            const parsed = admitirColaboradorSchema.parse(input);
            const sanitized = sanitizePayload(parsed) as Record<string, unknown>;

            // email é texto, null é preservado
            expect(sanitized).toHaveProperty('email');
            expect(sanitized.email).toBe(null);
        });
    });
});
