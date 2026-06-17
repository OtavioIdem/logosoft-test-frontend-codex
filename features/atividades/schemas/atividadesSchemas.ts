import { z } from 'zod';
import { isValidGuid, normalizeGuidOrNull } from '@/lib/http/requestUtils';

const requiredGuid = (label: string) => z.string().trim().refine(isValidGuid, `${label} deve ser selecionado.`);
const optionalGuid = z.preprocess((value) => normalizeGuidOrNull(value) ?? undefined, z.string().trim().refine(isValidGuid, 'Selecione um registro válido.').optional());
const nullableText = z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value ?? undefined), z.string().trim().optional());
const requiredText = (label: string, min = 1) => z.string().trim().min(min, `${label} é obrigatório.`);
const isoDateOptional = z.preprocess((value) => {
    if (value === null || value === undefined || value === '') return undefined;
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : undefined;
    if (typeof value === 'string') return value.trim() || undefined;
    return value;
}, z.string().trim().optional());

export const atividadePrioridadeSchema = z.enum(['Baixa', 'Media', 'Alta', 'Critica']);
export const atividadeStatusSchema = z.enum(['Aberta', 'EmAndamento', 'Concluida', 'Cancelada']);

export const criarAtividadeSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    titulo: requiredText('Título', 3).max(160, 'Título deve ter no máximo 160 caracteres.'),
    descricao: nullableText,
    prioridade: atividadePrioridadeSchema,
    responsavelUsuarioId: optionalGuid,
    prazoEm: isoDateOptional,
    entidadeOrigem: nullableText,
    entidadeOrigemId: optionalGuid
});

export const atualizarAtividadeSchema = z.object({
    titulo: requiredText('Título', 3).max(160, 'Título deve ter no máximo 160 caracteres.'),
    descricao: nullableText,
    prioridade: atividadePrioridadeSchema,
    prazoEm: isoDateOptional
});

export const atribuirAtividadeSchema = z.object({
    responsavelUsuarioId: requiredGuid('Responsável')
});

export const alterarStatusAtividadeSchema = z.object({
    status: atividadeStatusSchema,
    comentario: nullableText
});

export const comentarAtividadeSchema = z.object({
    mensagem: requiredText('Comentário', 3).max(1000, 'Comentário deve ter no máximo 1000 caracteres.')
});

export const cancelarAtividadeSchema = z.object({
    motivo: requiredText('Motivo', 3).max(500, 'Motivo deve ter no máximo 500 caracteres.')
});
