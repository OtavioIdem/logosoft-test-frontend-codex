import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { TipoDocumentoFiscal } from '@/features/faturamento/types/faturamento.types';

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
const requiredDate = z.union([z.date(), z.null(), z.undefined()]).refine((value) => value instanceof Date, 'Informe a primeira data de vencimento.').transform((value) => (value as Date).toISOString());

export const prepararFaturamentoSchema = z.object({
    pedidoVendaId: requiredGuid('Pedido de venda'),
    observacao: nullableText
});

export const confirmarFaturamentoSchema = z.object({
    ufAutorizadora: textRequired('Informe a UF autorizadora.'),
    tipoDocumento: z.nativeEnum(TipoDocumentoFiscal),
    serie: textRequired('Informe a série.'),
    numero: textRequired('Informe o número.'),
    cfopPadrao: nullableText,
    unidadeComercialPadrao: textRequired('Informe a unidade comercial padrão.'),
    validarDadosFiscaisProduto: z.boolean().default(true),
    condicaoPagamentoId: optionalGuid,
    primeiraDataVencimentoContaReceber: requiredDate
});

export const cancelarFaturamentoSchema = z.object({ motivo: textRequired('Informe o motivo.') });
