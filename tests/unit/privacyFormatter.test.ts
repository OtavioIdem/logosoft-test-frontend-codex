import { describe, expect, it } from 'vitest';
import { buildPrivacySafeEntityLabel, maskDocument, maskEmail, maskPhone } from '@/lib/formatters/privacy';

describe('privacy formatters', () => {
    it('mascara documento preservando CNPJ alfanumérico normalizado', () => {
        expect(maskDocument('12ABC34501DE35')).toBe('12A••••35');
    });

    it('monta label de entidade sem expor documento cru', () => {
        expect(buildPrivacySafeEntityLabel('Cliente Demonstração', '12ABC34501DE35')).toBe('Cliente Demonstração — 12A••••35');
    });

    it('mascara e-mail e telefone para exibição minimizada', () => {
        expect(maskEmail('manager@erp.local')).toBe('ma•••@erp.local');
        expect(maskPhone('(11) 99999-1234')).toBe('••••1234');
    });
});
