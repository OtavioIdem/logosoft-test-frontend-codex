import { z } from 'zod';
import { OrigemFinanceira } from '@/types/erp';
import { isValidGuid, normalizeGuidOrNull } from '@/lib/http/requestUtils';

const guidSchema = z.string().trim().refine(isValidGuid, 'Selecione um registro válido.');
const optionalGuidSchema = z.preprocess((value) => normalizeGuidOrNull(value) ?? undefined, guidSchema.optional());
const requiredText = (message: string) => z.string().trim().min(1, message);
const positiveMoneySchema = z.number({ required_error: 'Informe um valor.' }).positive('O valor precisa ser maior que zero.');
const positiveNumberSchema = z.number({ required_error: 'Informe um número.' }).int('Informe um número inteiro.').positive('O número precisa ser maior que zero.');
const isoDateSchema = z.preprocess((value) => {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : '';
    if (typeof value === 'string') return value.trim();
    return value;
}, z.string().min(1, 'Informe a data.'));

export const criarFormaPagamentoSchema = z.object({
    empresaId: guidSchema,
    filialId: optionalGuidSchema,
    codigo: requiredText('Informe o código.'),
    nome: requiredText('Informe o nome.'),
    permiteRecebimento: z.boolean(),
    permitePagamento: z.boolean()
}).refine((value) => value.permiteRecebimento || value.permitePagamento, { path: ['permiteRecebimento'], message: 'A forma precisa permitir recebimento, pagamento ou ambos.' });

export const atualizarFormaPagamentoSchema = z.object({
    nome: requiredText('Informe o nome.'),
    permiteRecebimento: z.boolean(),
    permitePagamento: z.boolean()
}).refine((value) => value.permiteRecebimento || value.permitePagamento, { path: ['permiteRecebimento'], message: 'A forma precisa permitir recebimento, pagamento ou ambos.' });

export const criarCondicaoPagamentoSchema = z.object({
    empresaId: guidSchema,
    filialId: optionalGuidSchema,
    codigo: requiredText('Informe o código.'),
    nome: requiredText('Informe o nome.'),
    quantidadeParcelas: positiveNumberSchema,
    intervaloDias: z.number({ required_error: 'Informe o intervalo.' }).int('Informe um número inteiro.').min(0, 'O intervalo não pode ser negativo.'),
    permiteEntrada: z.boolean()
});

export const atualizarCondicaoPagamentoSchema = z.object({
    nome: requiredText('Informe o nome.'),
    quantidadeParcelas: positiveNumberSchema,
    intervaloDias: z.number({ required_error: 'Informe o intervalo.' }).int('Informe um número inteiro.').min(0, 'O intervalo não pode ser negativo.'),
    permiteEntrada: z.boolean()
});

export const parcelaFinanceiraSchema = z.object({
    numero: positiveNumberSchema,
    vencimento: isoDateSchema,
    valor: positiveMoneySchema
});

export const criarContaReceberSchema = z.object({
    empresaId: guidSchema,
    filialId: optionalGuidSchema,
    clienteId: guidSchema,
    documento: requiredText('Informe o documento.'),
    origem: z.number().default(OrigemFinanceira.Manual),
    origemId: optionalGuidSchema,
    dataEmissao: isoDateSchema,
    observacao: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), z.string().trim().optional()),
    parcelas: z.array(parcelaFinanceiraSchema).min(1, 'Informe ao menos uma parcela.')
});

export const gerarContaReceberPedidoSchema = z.object({
    condicaoPagamentoId: optionalGuidSchema,
    primeiraDataVencimento: isoDateSchema,
    documento: requiredText('Informe o documento.'),
    observacao: z.string().trim().nullable().optional()
});

const movimentoFinanceiroSchema = {
    parcelaId: guidSchema,
    formaPagamentoId: guidSchema,
    valorJuros: z.number().nonnegative(),
    valorMulta: z.number().nonnegative(),
    valorDesconto: z.number().nonnegative(),
    gerarMovimentoCaixa: z.boolean(),
    gerarMovimentoBancario: z.boolean(),
    contaBancariaReferencia: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), z.string().trim().optional()),
    observacao: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), z.string().trim().optional())
};

export const receberContaSchema = z.object({
    ...movimentoFinanceiroSchema,
    dataRecebimento: isoDateSchema,
    valorRecebido: positiveMoneySchema
});

export const estornarRecebimentoSchema = z.object({ recebimentoId: guidSchema, motivo: requiredText('Informe o motivo.') });
export const cancelarContaFinanceiraSchema = z.object({ motivo: requiredText('Informe o motivo.') });

export const criarContaPagarSchema = z.object({
    empresaId: guidSchema,
    filialId: optionalGuidSchema,
    fornecedorId: guidSchema,
    documento: requiredText('Informe o documento.'),
    origem: z.number().default(OrigemFinanceira.Manual),
    origemId: optionalGuidSchema,
    dataEmissao: isoDateSchema,
    observacao: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), z.string().trim().optional()),
    parcelas: z.array(parcelaFinanceiraSchema).min(1, 'Informe ao menos uma parcela.')
});

export const pagarContaSchema = z.object({
    ...movimentoFinanceiroSchema,
    dataPagamento: isoDateSchema,
    valorPago: positiveMoneySchema
});
export const estornarPagamentoSchema = z.object({ pagamentoId: guidSchema, motivo: requiredText('Informe o motivo.') });


export const fluxoCaixaQuerySchema = z.object({
    empresaId: optionalGuidSchema,
    filialId: optionalGuidSchema,
    dataInicial: isoDateSchema,
    dataFinal: isoDateSchema
});
