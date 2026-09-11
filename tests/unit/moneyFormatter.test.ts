import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatMoney, formatMoneyOptional } from '@/lib/formatters/money';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('formatMoney — contrato de campo obrigatório (F1.4)', () => {
    describe('AC-1: formatMoney(0) retorna "R$ 0,00"', () => {
        it('zero legitimo é renderizado como "R$ 0,00"', () => {
            const result = formatMoney(0);
            expect(result).toMatch(/R\$\s*0[.,]00/);
        });

        it('invariante que não pode quebrar: zero sempre é "R$ 0,00", nunca vira texto de denúncia', () => {
            const result = formatMoney(0);
            expect(result).not.toContain('ausente');
            expect(result).not.toContain('valor ausente');
            expect(result).toMatch(/R\$\s*0[.,]00/);
        });
    });

    describe('AC-2: formatMoney(undefined|null|NaN) nunca contém "0,00"', () => {
        it('undefined nunca contém "0,00"', () => {
            const result = formatMoney(undefined);
            expect(result).not.toContain('0,00');
        });

        it('null nunca contém "0,00"', () => {
            const result = formatMoney(null);
            expect(result).not.toContain('0,00');
        });

        it('NaN nunca contém "0,00"', () => {
            const result = formatMoney(NaN);
            expect(result).not.toContain('0,00');
        });

        it('NaN é tratado como ausente: indefinido não contém "0,00"', () => {
            const nan = Number.NaN;
            const result = formatMoney(nan);
            expect(Number.isNaN(nan)).toBe(true);
            expect(result).not.toContain('0,00');
        });
    });

    describe('AC-3: NODE_ENV=production → "—"; NODE_ENV=development → contém "ausente"', () => {
        afterEach(() => {
            vi.unstubAllEnvs();
        });

        it('em development, ausência (undefined) contém palavra "ausente"', () => {
            vi.stubEnv('NODE_ENV', 'development');
            const result = formatMoney(undefined);
            expect(result).toContain('ausente');
        });

        it('em development, ausência (null) contém palavra "ausente"', () => {
            vi.stubEnv('NODE_ENV', 'development');
            const result = formatMoney(null);
            expect(result).toContain('ausente');
        });

        it('em development, ausência (NaN) contém palavra "ausente"', () => {
            vi.stubEnv('NODE_ENV', 'development');
            const result = formatMoney(NaN);
            expect(result).toContain('ausente');
        });

        it('em production, ausência (undefined) é exatamente "—"', () => {
            vi.stubEnv('NODE_ENV', 'production');
            const result = formatMoney(undefined);
            expect(result).toBe('—');
        });

        it('em production, ausência (null) é exatamente "—"', () => {
            vi.stubEnv('NODE_ENV', 'production');
            const result = formatMoney(null);
            expect(result).toBe('—');
        });

        it('em production, ausência (NaN) é exatamente "—"', () => {
            vi.stubEnv('NODE_ENV', 'production');
            const result = formatMoney(NaN);
            expect(result).toBe('—');
        });
    });

    describe('AC-4: formatMoneyOptional(undefined) → "—"; com fallback → o fallback', () => {
        it('sem fallback, undefined rende "—"', () => {
            expect(formatMoneyOptional(undefined)).toBe('—');
        });

        it('sem fallback, null rende "—"', () => {
            expect(formatMoneyOptional(null)).toBe('—');
        });

        it('com fallback customizado, undefined rende o fallback', () => {
            expect(formatMoneyOptional(undefined, 'N/A')).toBe('N/A');
        });

        it('com fallback customizado, null rende o fallback', () => {
            expect(formatMoneyOptional(null, 'Não informado')).toBe('Não informado');
        });

        it('com fallback vazio, undefined rende string vazia', () => {
            expect(formatMoneyOptional(undefined, '')).toBe('');
        });

        it('valor válido ignora fallback', () => {
            const result = formatMoneyOptional(100, 'fallback');
            expect(result).toMatch(/R\$\s*100[.,]00/);
            expect(result).not.toBe('fallback');
        });
    });

    describe('AC-5: lib/formatters/money.ts não contém "?? 0"', () => {
        it('money.ts não tem a máscara "?? 0"', () => {
            const source = read('lib/formatters/money.ts');
            expect(source).not.toContain('?? 0');
        });

        it('money.ts contém as duas funções esperadas (formatMoney e formatMoneyOptional)', () => {
            const source = read('lib/formatters/money.ts');
            expect(source).toContain('export const formatMoney');
            expect(source).toContain('export const formatMoneyOptional');
        });
    });

    describe('AC-6: Catraca de sentido único — zero cópias locais em features/', () => {
        it('nenhum arquivo em features/ define "const formatMoney" (drenagem de b54)', () => {
            const path = require('path');
            const fs = require('fs');
            const glob = require('glob');

            // Buscar todos os arquivos .ts e .tsx em features/
            const files = glob.sync(`${root}/features/**/*.{ts,tsx}`);
            const infratores: string[] = [];

            for (const file of files) {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    // Procurar linhas que definem const formatMoney
                    const matches = content.match(/(?:const|export const)\s+formatMoney\s*=/g);
                    if (matches && matches.length > 0) {
                        const relative = path.relative(root, file);
                        infratores.push(relative);
                    }
                } catch {
                    // Ignore file read errors
                }
            }

            // Catraca de sentido único: a lista de arquivos infratores DEVE ser vazia.
            // Se quebrar, nomeia cada arquivo que reintroduziu a cópia local.
            expect(infratores, `Arquivos que reintroduziram "const formatMoney" (bloqueio de drenagem b54): ${infratores.join(', ')}`).toEqual([]);
        });
    });

    describe('Contratos monetários válidos em features/', () => {
        it('formatMoney com número positivo renderiza corretamente', () => {
            const result = formatMoney(251.50);
            expect(result).toMatch(/R\$\s*251[.,]50/);
        });

        it('formatMoney com número inteiro renderiza com ".00" ou "00"', () => {
            const result = formatMoney(1000);
            expect(result).toMatch(/R\$\s*1[.,]000[.,]00/);
        });

        it('formatMoney com número pequeno renderiza com centavos', () => {
            const result = formatMoney(0.99);
            expect(result).toMatch(/R\$\s*0[.,]99/);
        });

        it('formatMoney com número grande respeita separador de milhar', () => {
            const result = formatMoney(1234567.89);
            expect(result).toMatch(/R\$\s*1[.,]234[.,]567[.,]89/);
        });
    });
});
