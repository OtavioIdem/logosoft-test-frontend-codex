import { z } from 'zod';
import { normalizeGuidOrNull } from '@/lib/http/requestUtils';

const optionalGuidSchema = z.preprocess((value) => normalizeGuidOrNull(value) ?? undefined, z.string().uuid('Selecione um registro válido.').optional());
const isoDateSchema = z.preprocess((value) => {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : '';
    if (typeof value === 'string') return value.trim();
    return value;
}, z.string().min(1, 'Informe a data.'));

export const relatorioPeriodoQuerySchema = z.object({
    empresaId: optionalGuidSchema,
    filialId: optionalGuidSchema,
    dataInicial: isoDateSchema,
    dataFinal: isoDateSchema
}).refine((value) => Date.parse(value.dataInicial) <= Date.parse(value.dataFinal), { path: ['dataFinal'], message: 'Data final deve ser maior ou igual à inicial.' });
