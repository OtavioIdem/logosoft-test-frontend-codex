import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { OrigemInspecao } from '@/features/qualidade/types/qualidade.types';

const requiredGuid = (label: string) => z.string().trim().refine(isValidGuid, `${label} deve ser selecionado corretamente.`);
const optionalGuid = z
    .union([z.string().trim().refine((value) => value === '' || isValidGuid(value), 'Selecione um registro válido.'), z.null(), z.undefined()])
    .transform((value) => (typeof value === 'string' && value.trim() === '' ? null : value ?? null));
const textRequired = (message: string) => z.string().trim().min(1, message);
const nullableText = z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
    if (value === null || value === undefined) return null;
    const normalized = value.trim();
    return normalized.length ? normalized : null;
});
const positive = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).positive(`${label} deve ser maior que zero.`);
const optionalDate = z.union([z.date(), z.null(), z.undefined()]).transform((value) => (value instanceof Date ? value.toISOString() : null));

export const adicionarCriterioSchema = z.object({
    descricao: textRequired('Informe a descrição do critério.'),
    critico: z.boolean(),
    valorEsperado: nullableText
});

export const criarInspecaoSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    origem: z.nativeEnum(OrigemInspecao),
    produtoId: requiredGuid('Produto'),
    quantidade: positive('Quantidade'),
    localEstoqueId: optionalGuid,
    responsavelId: optionalGuid,
    dataInspecao: optionalDate,
    observacao: nullableText
});

export const registrarResultadoSchema = z.object({
    criterioId: requiredGuid('Critério'),
    conforme: z.boolean(),
    valorMedido: nullableText,
    observacao: nullableText
});

export const reprovarInspecaoSchema = z.object({ descricao: textRequired('Informe a descrição da reprovação.') });
export const encerrarInspecaoSchema = z.object({ evidencia: textRequired('Informe a evidência.') });

export const adicionarAcaoCorretivaSchema = z.object({
    descricao: textRequired('Informe a descrição da ação.'),
    responsavelId: optionalGuid,
    prazo: optionalDate
});

export const motivoSchema = z.object({ motivo: textRequired('Informe o motivo.') });
