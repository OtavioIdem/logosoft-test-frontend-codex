import { describe, expect, it } from 'vitest';
import { formatMoneyOptional } from '@/lib/formatters/money';

/**
 * AC-3: Item de tabela com precoMinimo e margemPercentual nulos renderiza "—" sem erro.
 * Testa os formatadores reais de lib/formatters/money.ts.
 */

describe('tabelas-preco — AC-3: formatadores com valores nulos', () => {
    it('formatMoneyOptional(null) retorna "—" (formatador real)', () => {
        expect(formatMoneyOptional(null)).toBe('—');
    });

    it('formatMoneyOptional(undefined) retorna "—" (formatador real)', () => {
        expect(formatMoneyOptional(undefined)).toBe('—');
    });

    it('formatMoneyOptional(0) retorna R$ 0,00 (não "—")', () => {
        const result = formatMoneyOptional(0);
        expect(result).toContain('0');
        expect(result).not.toBe('—');
    });

    it('formatMoneyOptional(NaN) retorna "—" (formatador real)', () => {
        expect(formatMoneyOptional(NaN)).toBe('—');
    });

    it('formatMoneyOptional com fallback customizado', () => {
        expect(formatMoneyOptional(null, '0,00')).toBe('0,00');
    });
});
