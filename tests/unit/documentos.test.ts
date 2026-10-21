import { describe, expect, it } from 'vitest';
import { isPotentialCnpj, normalizeCnpj } from '@/lib/validators/documentos';
describe('documentos', () => {
    it('preserva letras no CNPJ alfanumérico', () => expect(normalizeCnpj('12.abc.345/01de-35')).toBe('12ABC34501DE35'));
    it('aceita CNPJ alfanumérico potencial', () => expect(isPotentialCnpj('12ABC34501DE35')).toBe(true));
    it.each(['1234567890123', '123456789012345', '12ABC34501DE3*'])('recusa CNPJ fora do formato de 14 caracteres: %s', (value) => expect(isPotentialCnpj(value)).toBe(false));
});
