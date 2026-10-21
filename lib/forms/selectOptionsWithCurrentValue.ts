import { SelectOption } from '@/types/erp';

/**
 * Mantém um valor numérico devolvido pelo backend mesmo quando o frontend ainda
 * não conhece o enum. A opção é só de leitura visual: o schema continua
 * exigindo um valor suportado antes de uma nova gravação.
 */
export const selectOptionsWithCurrentValue = (options: SelectOption<number | null>[], value: number | null | undefined): SelectOption<number | null>[] => {
    if (value === null || value === undefined || options.some((option) => option.value === value)) {
        return options;
    }

    return [...options, { label: `Não mapeado (${String(value)})`, value }];
};
