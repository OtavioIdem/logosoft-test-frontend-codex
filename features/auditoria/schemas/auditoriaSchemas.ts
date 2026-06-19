import { z } from 'zod';
import { createResourceSchema } from '@/features/shared/schemas/createResourceSchema';
import { getResourceDefinition } from '@/features/shared/config/erpFeatureCatalog';
import { normalizeGuidOrNull } from '@/lib/http/requestUtils';

export const auditoriaEventosSchema = createResourceSchema(getResourceDefinition('auditoria-eventos'));

const optionalGuidSchema = z.preprocess((value) => normalizeGuidOrNull(value) ?? undefined, z.string().uuid('Selecione um registro válido.').optional());
const optionalTextSchema = z.preprocess((value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined), z.string().optional());
const optionalIsoDateSchema = z.preprocess((value) => {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : undefined;
    if (typeof value === 'string' && value.trim()) return value.trim();
    return undefined;
}, z.string().optional());

export const auditoriaOperacionalQuerySchema = z.object({
    empresaId: optionalGuidSchema,
    filialId: optionalGuidSchema,
    usuarioId: optionalGuidSchema,
    entidadeId: optionalGuidSchema,
    modulo: optionalTextSchema,
    entidade: optionalTextSchema,
    acao: optionalTextSchema,
    termo: optionalTextSchema,
    dataInicial: optionalIsoDateSchema,
    dataFinal: optionalIsoDateSchema,
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
}).refine((value) => !value.dataInicial || !value.dataFinal || Date.parse(value.dataInicial) <= Date.parse(value.dataFinal), { path: ['dataFinal'], message: 'Data final deve ser maior ou igual à inicial.' });
