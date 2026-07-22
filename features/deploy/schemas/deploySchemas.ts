import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';

const requiredGuid = (label: string) => z.string().trim().refine(isValidGuid, `${label} deve ser selecionado corretamente.`);
const textRequired = (message: string) => z.string().trim().min(1, message);
const nullableText = z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
    if (value === null || value === undefined) return null;
    const normalized = value.trim();
    return normalized.length ? normalized : null;
});

export const criarDeploySchema = z.object({
    versao: textRequired('Informe a versão.'),
    descricao: nullableText,
    ambiente: nullableText
});

export const criarChecklistItemSchema = z.object({
    deployId: requiredGuid('Deploy'),
    descricao: textRequired('Informe a descrição do item.'),
    obrigatorio: z.boolean()
});

export const resultadoChecklistSchema = z.object({
    aprovado: z.boolean(),
    observacao: nullableText
});

export const motivoSchema = z.object({ motivo: textRequired('Informe o motivo.') });
