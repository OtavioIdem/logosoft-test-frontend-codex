import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { GravidadeRecall, LoteOrigem, TipoMovimentacaoLote } from '@/features/alimentar/types/alimentar.types';

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
const requiredDate = (message: string) => z.union([z.date(), z.null(), z.undefined()]).refine((value) => value instanceof Date, message).transform((value) => (value as Date).toISOString());

export const criarLoteSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    produtoId: requiredGuid('Produto'),
    numeroLote: textRequired('Informe o número do lote.'),
    origem: z.nativeEnum(LoteOrigem),
    dataFabricacao: optionalDate,
    dataValidade: requiredDate('Informe a data de validade.'),
    quantidadeInicial: positive('Quantidade inicial'),
    fornecedorId: optionalGuid,
    localEstoqueId: optionalGuid,
    documentoOrigem: nullableText
});

export const registrarMovimentacaoLoteSchema = z.object({
    loteId: requiredGuid('Lote'),
    tipo: z.nativeEnum(TipoMovimentacaoLote),
    quantidade: positive('Quantidade'),
    documento: nullableText,
    observacao: nullableText
});

export const abrirRecallSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    gravidade: z.nativeEnum(GravidadeRecall),
    motivo: textRequired('Informe o motivo do recall.'),
    descricao: nullableText
});

export const motivoSchema = z.object({ motivo: textRequired('Informe o motivo.') });
export const adicionarLoteRecallSchema = z.object({ loteId: requiredGuid('Lote') });
