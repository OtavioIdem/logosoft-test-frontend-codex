import { describe, expect, it } from 'vitest';
import { ufEmitenteSugerida } from '@/features/faturamento/hooks/useUfEmitenteFaturamento';
import { UFS_BRASIL } from '@/lib/constants/ufs';

// AJ-38 (D113, AC-9): a UF sugerida para a "UF autorizadora" é a do endereço fiscal da FILIAL do faturamento; sem ela,
// a da EMPRESA. UF inválida (fora das 27) é ignorada, nunca vira sugestão.

describe('ufEmitenteSugerida — ordem filial antes da empresa', () => {
    it('com filial e empresa válidas, a UF da filial vence', () => {
        expect(ufEmitenteSugerida({ filialUf: 'RJ', empresaUf: 'SP' })).toBe('RJ');
    });

    it('sem UF na filial (null ou vazia), usa a da empresa', () => {
        expect(ufEmitenteSugerida({ filialUf: null, empresaUf: 'MG' })).toBe('MG');
        expect(ufEmitenteSugerida({ filialUf: '', empresaUf: 'MG' })).toBe('MG');
        expect(ufEmitenteSugerida({ empresaUf: 'MG' })).toBe('MG');
    });

    it('UF da filial inválida não bloqueia a da empresa', () => {
        expect(ufEmitenteSugerida({ filialUf: 'XX', empresaUf: 'SP' })).toBe('SP');
    });

    it('UF da empresa inválida é ignorada: vale a da filial', () => {
        expect(ufEmitenteSugerida({ filialUf: 'PR', empresaUf: 'ZZ' })).toBe('PR');
    });

    it('nenhuma das duas válida devolve null (o operador digita)', () => {
        expect(ufEmitenteSugerida({ filialUf: 'ZZ', empresaUf: '99' })).toBeNull();
        expect(ufEmitenteSugerida({})).toBeNull();
        expect(ufEmitenteSugerida({ filialUf: undefined, empresaUf: undefined })).toBeNull();
    });

    it('normaliza caixa e espaços antes de validar', () => {
        expect(ufEmitenteSugerida({ filialUf: ' rj ', empresaUf: 'SP' })).toBe('RJ');
    });

    it('UF do exterior ou sigla que não existe é inválida', () => {
        expect(ufEmitenteSugerida({ filialUf: 'EX', empresaUf: 'SP' })).toBe('SP');
    });
});

describe('lista de UFs usada na validação', () => {
    it('são as 27 unidades federativas, incluindo DF', () => {
        expect(UFS_BRASIL).toHaveLength(27);
        expect(UFS_BRASIL).toEqual(expect.arrayContaining(['SP', 'RJ', 'MG', 'DF', 'TO']));
    });
});
