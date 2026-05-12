import { describe, expect, it } from 'vitest';
import { formatEntityReference, formatDisplayValue } from '@/lib/formatters/display';

describe('display formatter', () => {
    it('não expõe referência técnica cru na interface', () => {
        expect(formatEntityReference('11111111-1111-1111-1111-111111111111')).toBe('Referência selecionada');
    });

    it('prefere nome, razão social, código ou descrição quando recebe objeto de referência', () => {
        expect(formatEntityReference({ id: '11111111-1111-1111-1111-111111111111', codigo: 'LOGO', nome: 'Logosoft' })).toBe('Logosoft - LOGO');
    });

    it('formata valor monetário sem expor detalhes técnicos', () => {
        expect(formatDisplayValue(10, 'money')).toContain('10,00');
    });
});
