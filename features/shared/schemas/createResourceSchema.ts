import { z } from 'zod';
import { ResourceDefinition, ResourceField } from '@/features/shared/types/resource.types';

const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

const createNumberSchema = (field: ResourceField) => {
    const base = z.preprocess(
        emptyToUndefined,
        z.coerce.number({ invalid_type_error: `${field.label} deve ser numérico.` }).finite(`${field.label} deve ser numérico.`)
    );

    return field.required ? base : base.optional();
};

const createTextSchema = (field: ResourceField) => {
    const base = z.string();
    return field.required ? base.min(1, `${field.label} é obrigatório.`) : base.optional().or(z.literal(''));
};

const createFieldSchema = (field: ResourceField): z.ZodTypeAny => {
    switch (field.kind) {
        case 'money':
        case 'number':
        case 'percent':
            return createNumberSchema(field);
        case 'checkbox':
            return z.coerce.boolean().optional();
        default:
            return createTextSchema(field);
    }
};

export const createResourceSchema = (definition: ResourceDefinition) => z.object(Object.fromEntries(definition.fields.map((field) => [field.name, createFieldSchema(field)])));
