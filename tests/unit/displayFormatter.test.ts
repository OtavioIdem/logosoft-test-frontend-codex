import { describe, expect, it } from 'vitest';
import { formatEntityReference, formatDisplayValue, truncateLabel, formatDocumento } from '@/lib/formatters/display';

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

    it('mantém rótulos curtos intactos', () => {
        expect(truncateLabel('Triplos Tecnologia', 40)).toBe('Triplos Tecnologia');
    });

    it('corta rótulos longos e acrescenta reticências sem estourar o limite', () => {
        const label = 'Triplos Tecnologia • Triplos Tecnologia e Sistemas Ltda - EPP • 66980251000198';
        const result = truncateLabel(label, 40);
        expect(result.length).toBeLessThanOrEqual(40);
        expect(result.endsWith('…')).toBe(true);
    });

    it('formata CNPJ numérico com máscara de exibição', () => {
        expect(formatDocumento('66980251000198')).toBe('66.980.251/0001-98');
    });

    it('formata CPF com máscara de exibição', () => {
        expect(formatDocumento('12345678909')).toBe('123.456.789-09');
    });

    it('mantém documentos já mascarados ou fora do padrão sem duplicar máscara', () => {
        expect(formatDocumento('66.980.251/0001-98')).toBe('66.980.251/0001-98');
        expect(formatDocumento('ABC123')).toBe('ABC123');
        expect(formatDocumento(null)).toBe('-');
    });
});
