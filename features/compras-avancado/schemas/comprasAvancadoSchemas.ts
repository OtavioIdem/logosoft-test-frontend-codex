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
const money = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).min(0, `${label} não pode ser negativo.`);
const quantidade = z.coerce.number({ invalid_type_error: 'Quantidade deve ser numérica.' }).positive('Quantidade deve ser maior que zero.');
const optionalDate = z.union([z.date(), z.null(), z.undefined()]).transform((value) => (value instanceof Date ? value.toISOString() : null));
const requiredDate = (message: string) => z.union([z.date(), z.null(), z.undefined()]).refine((v) => v instanceof Date, message).transform((v) => (v as Date).toISOString());

export const motivoOpcionalSchema = z.object({ motivo: nullableText });

// Solicitação
export const criarSolicitacaoSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    numero: textRequired('Informe o número.'),
    dataSolicitacao: requiredDate('Informe a data da solicitação.'),
    solicitante: textRequired('Informe o solicitante.'),
    justificativa: nullableText
});
export const itemSolicitacaoSchema = z.object({ produtoId: requiredGuid('Produto'), quantidade, observacao: nullableText });

// Cotação
export const criarCotacaoSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    numero: textRequired('Informe o número.'),
    fornecedorId: requiredGuid('Fornecedor'),
    dataCotacao: requiredDate('Informe a data da cotação.'),
    validade: optionalDate,
    solicitacaoCompraId: optionalGuid,
    observacao: nullableText
});
export const itemCotacaoSchema = z.object({ produtoId: requiredGuid('Produto'), quantidade, valorUnitario: money('Valor unitário'), observacao: nullableText });
export const aprovarCotacaoSchema = z.object({
    numeroPedido: textRequired('Informe o número do pedido.'),
    dataEmissaoPedido: requiredDate('Informe a data de emissão do pedido.'),
    dataPrevisaoEntrega: optionalDate,
    condicaoPagamentoId: optionalGuid,
    observacao: nullableText
});

// Conferência fiscal de entrada
export const conferenciaFiscalSchema = z.object({
    chaveAcesso: nullableText,
    serie: textRequired('Informe a série.'),
    numero: textRequired('Informe o número.'),
    cnpjEmitente: textRequired('Informe o CNPJ do emitente.'),
    dataEmissaoNota: requiredDate('Informe a data de emissão da nota.'),
    valorTotalNota: money('Valor total da nota'),
    observacao: nullableText
});
