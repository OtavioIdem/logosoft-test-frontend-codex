import { z } from 'zod';
import { OrigemFinanceira } from '@/types/erp';
import { isValidGuid } from '@/lib/http/requestUtils';

const guidSchema = z.string().trim().refine(isValidGuid, 'Selecione um registro válido.');
const optionalGuidSchema = z.union([guidSchema, z.null()]).optional();
const requiredText = (message: string) => z.string().trim().min(1, message);
const moneySchema = z.number({ required_error: 'Informe um valor.' }).min(0, 'O valor não pode ser negativo.');
const positiveMoneySchema = z.number({ required_error: 'Informe um valor.' }).positive('O valor precisa ser maior que zero.');
const positiveNumberSchema = z.number({ required_error: 'Informe um número.' }).int('Informe um número inteiro.').positive('O número precisa ser maior que zero.');
const isoDateSchema = z.union([z.date(), z.string().trim().min(1, 'Informe a data.')]);

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
    observacao: z.string().trim().nullable().optional(),
    parcelas: z.array(parcelaFinanceiraSchema).min(1, 'Informe ao menos uma parcela.')
});

export const gerarContaReceberPedidoSchema = z.object({
    condicaoPagamentoId: optionalGuidSchema,
    primeiraDataVencimento: isoDateSchema,
    documento: requiredText('Informe o documento.'),
    observacao: z.string().trim().nullable().optional()
});

export const receberContaSchema = z.object({
    parcelaId: guidSchema,
    formaPagamentoId: guidSchema,
    dataRecebimento: isoDateSchema,
    valorRecebido: positiveMoneySchema,
    valorJuros: moneySchema.default(0),
    valorMulta: moneySchema.default(0),
    valorDesconto: moneySchema.default(0),
    gerarMovimentoCaixa: z.boolean().default(true),
    gerarMovimentoBancario: z.boolean().default(false),
    contaBancariaReferencia: z.string().trim().nullable().optional(),
    observacao: z.string().trim().nullable().optional()
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
    observacao: z.string().trim().nullable().optional(),
    parcelas: z.array(parcelaFinanceiraSchema).min(1, 'Informe ao menos uma parcela.')
});

export const pagarContaSchema = z.object({
    parcelaId: guidSchema,
    formaPagamentoId: guidSchema,
    dataPagamento: isoDateSchema,
    valorPago: positiveMoneySchema,
    valorJuros: moneySchema.default(0),
    valorMulta: moneySchema.default(0),
    valorDesconto: moneySchema.default(0),
    gerarMovimentoCaixa: z.boolean().default(true),
    gerarMovimentoBancario: z.boolean().default(false),
    contaBancariaReferencia: z.string().trim().nullable().optional(),
    observacao: z.string().trim().nullable().optional()
});

export const estornarPagamentoSchema = z.object({ pagamentoId: guidSchema, motivo: requiredText('Informe o motivo.') });
