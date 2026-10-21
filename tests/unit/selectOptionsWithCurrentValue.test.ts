import { describe, expect, it } from 'vitest';
import { selectOptionsWithCurrentValue } from '@/lib/forms/selectOptionsWithCurrentValue';

const options = [
    { label: 'Valor conhecido', value: 1 },
    { label: 'Outro valor conhecido', value: 2 }
];

describe('selectOptionsWithCurrentValue', () => {
    it('preserva o valor conhecido sem duplicar opções', () => {
        expect(selectOptionsWithCurrentValue(options, 1)).toBe(options);
    });

    it('mantém null como ausência de seleção', () => {
        expect(selectOptionsWithCurrentValue(options, null)).toBe(options);
    });

    it('acrescenta o valor desconhecido para a leitura do registro', () => {
        expect(selectOptionsWithCurrentValue(options, 99)).toEqual([
            ...options,
            { label: 'Não mapeado (99)', value: 99 }
        ]);
    });
});
