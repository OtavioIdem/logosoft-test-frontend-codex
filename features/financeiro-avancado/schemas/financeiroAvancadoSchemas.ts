import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';

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
const requiredDateOnly = (message: string) => z.union([z.date(), z.null(), z.undefined()]).refine((v) => v instanceof Date, message).transform((v) => (v as Date).toISOString().slice(0, 10));

export const criarContaSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    participanteId: requiredGuid('Participante'),
    descricao: textRequired('Informe a descrição.'),
    documento: nullableText,
    valorOriginal: positive('Valor'),
    dataEmissao: requiredDateOnly('Informe a data de emissão.'),
    dataVencimento: requiredDateOnly('Informe a data de vencimento.')
});

export const baixarContaSchema = z.object({
    valor: positive('Valor da baixa'),
    dataBaixa: requiredDateOnly('Informe a data da baixa.'),
    observacao: nullableText
});

export const estornarBaixaSchema = z.object({
    baixaId: requiredGuid('Baixa'),
    dataEstorno: requiredDateOnly('Informe a data do estorno.'),
    motivo: textRequired('Informe o motivo.')
});

export const cancelarContaSchema = z.object({ motivo: textRequired('Informe o motivo.') });
