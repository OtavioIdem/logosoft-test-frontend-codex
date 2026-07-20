import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { CategoriaBem } from '@/features/patrimonio/types/patrimonio.types';

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
const money = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).min(0, `${label} não pode ser negativo.`);
const positiveInt = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).int(`${label} inválido.`).positive(`${label} deve ser maior que zero.`);
const optionalMoney = z.union([z.coerce.number().min(0, 'Valor não pode ser negativo.'), z.null(), z.undefined()]).transform((value) => (typeof value === 'number' && Number.isFinite(value) ? value : null));
const requiredDate = (message: string) => z.union([z.date(), z.null(), z.undefined()]).refine((value) => value instanceof Date, message).transform((value) => (value as Date).toISOString());
const optionalDate = z.union([z.date(), z.null(), z.undefined()]).transform((value) => (value instanceof Date ? value.toISOString() : null));

export const cadastrarBemSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    codigo: textRequired('Informe o código do bem.'),
    descricao: textRequired('Informe a descrição.'),
    categoria: z.nativeEnum(CategoriaBem),
    dataAquisicao: requiredDate('Informe a data de aquisição.'),
    valorAquisicao: money('Valor de aquisição'),
    valorResidual: money('Valor residual'),
    vidaUtilMeses: positiveInt('Vida útil (meses)'),
    setorId: optionalGuid,
    responsavelId: optionalGuid
});

export const transferirBemSchema = z.object({
    setorNovoId: optionalGuid,
    responsavelNovoId: optionalGuid,
    data: optionalDate,
    observacao: nullableText
});

export const baixarBemSchema = z.object({
    data: optionalDate,
    motivo: textRequired('Informe o motivo.'),
    justificativa: textRequired('Informe a justificativa.'),
    valorBaixa: optionalMoney
});

export const processarDepreciacaoSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    ano: z.coerce.number().int().min(2000, 'Ano inválido.').max(2100, 'Ano inválido.'),
    mes: z.coerce.number().int().min(1, 'Mês inválido.').max(12, 'Mês inválido.')
});

export const abrirInventarioSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    descricao: textRequired('Informe a descrição.'),
    dataReferencia: optionalDate
});

export const registrarContagemSchema = z.object({
    itemId: requiredGuid('Item'),
    localizado: z.boolean(),
    setorEncontradoId: optionalGuid,
    observacao: nullableText
});

export const motivoSchema = z.object({ motivo: textRequired('Informe o motivo.') });
