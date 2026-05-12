import { describe, expect, it } from 'vitest';
import { isPotentialCnpj, normalizeCnpj } from '@/lib/validators/documentos';
describe('documentos', () => {
    it('preserva letras no CNPJ alfanumérico', () => expect(normalizeCnpj('12.abc.345/01de-35')).toBe('12ABC34501DE35'));
    it('aceita CNPJ alfanumérico potencial', () => expect(isPotentialCnpj('12ABC34501DE35')).toBe(true));
});
