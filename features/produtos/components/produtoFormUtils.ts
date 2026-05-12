import { ZodError } from 'zod';
import { SelectOption } from '@/types/erp';

export type FieldErrors = Record<string, string | undefined>;

export const fieldErrorMap = (error: ZodError<unknown>): FieldErrors => {
    const flattened = error.flatten();
    const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;

    return Object.entries(fieldErrors).reduce<FieldErrors>((acc, [field, messages]) => {
        acc[field] = Array.isArray(messages) ? messages[0] : undefined;
        return acc;
    }, {});
};

export const textValue = (value: unknown) => (typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value));
export const boolValue = (value: unknown, fallback = false) => (typeof value === 'boolean' ? value : fallback);
export const numberOrNull = (value: unknown) => (typeof value === 'number' ? value : value === null || value === undefined || value === '' ? null : Number(value));
export const isFilled = (value: unknown) => typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;

export const toOptions = <T extends { id: string }>(items: T[], label: (item: T) => string): SelectOption<string>[] => items.map((item) => ({ label: label(item), value: item.id }));
