import { ZodError } from 'zod';

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
export const nullableTextValue = (value: unknown) => {
    const text = textValue(value).trim();
    return text ? text : null;
};
export const numberValue = (value: unknown) => (typeof value === 'number' ? value : value === null || value === undefined || value === '' ? null : Number(value));
