import { z } from 'zod';
import { StatusPedidoVenda, TipoPedidoVenda } from '@/types/erp';
import { isValidGuid } from '@/lib/http/requestUtils';

const guidSchema = z.string().refine(isValidGuid, 'Selecione um registro válido.');
const optionalGuidSchema = z.preprocess((value) => (value === '' ? null : value), z.union([guidSchema, z.null()]).optional());
const isoOrDateSchema = z.union([z.string().min(1, 'Informe uma data.'), z.date()]);
const optionalIsoOrDateSchema = z.preprocess((value) => (value === '' ? null : value), z.union([z.string().min(1), z.date(), z.null()]).optional());
const moneySchema = z.coerce.number().min(0, 'O valor não pode ser negativo.');
const quantitySchema = z.coerce.number().positive('A quantidade deve ser maior que zero.');
const nullableText = z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().nullable().optional());

export const criarPedidoVendaSchema = z.object({
    empresaId: guidSchema,
    filialId: optionalGuidSchema,
    numero: z.string().trim().min(1, 'Informe o número do pedido.'),
    clienteId: guidSchema,
    dataEmissao: isoOrDateSchema,
    dataPrevisaoEntrega: optionalIsoOrDateSchema,
    tipo: z.coerce.number().refine((value) => value === TipoPedidoVenda.Orcamento || value === TipoPedidoVenda.Pedido, 'Tipo inválido.'),
    observacao: nullableText
});

export const atualizarPedidoVendaSchema = z.object({
    dataPrevisaoEntrega: optionalIsoOrDateSchema,
    tipo: z.coerce.number().refine((value) => value === TipoPedidoVenda.Orcamento || value === TipoPedidoVenda.Pedido, 'Tipo inválido.'),
    observacao: nullableText
});

const itemPedidoVendaBaseSchema = z.object({
    localEstoqueId: optionalGuidSchema,
    quantidade: quantitySchema,
    valorUnitario: moneySchema,
    valorDesconto: moneySchema,
    observacao: nullableText
});

const descontoValido = (data: { quantidade: number; valorUnitario: number; valorDesconto: number }) => data.valorDesconto <= data.quantidade * data.valorUnitario;
const descontoMessage = { path: ['valorDesconto'], message: 'O desconto não pode ultrapassar o valor bruto do item.' };

export const adicionarItemPedidoVendaSchema = itemPedidoVendaBaseSchema.extend({ produtoId: guidSchema }).refine(descontoValido, descontoMessage);
export const atualizarItemPedidoVendaSchema = itemPedidoVendaBaseSchema.refine(descontoValido, descontoMessage);

export const motivoPedidoVendaSchema = z.object({ motivo: z.string().trim().min(3, 'Informe o motivo com pelo menos 3 caracteres.') });

export const aprovarPedidoVendaSchema = z.object({
    reservarEstoque: z.boolean(),
    observacao: nullableText
});

export const faturarPedidoVendaSchema = z.object({
    baixarEstoque: z.boolean(),
    documento: z.string().trim().min(1, 'Informe o documento do faturamento.'),
    observacao: nullableText
});

export const pedidoVendaStatusFilterSchema = z.union([
    z.literal(StatusPedidoVenda.Rascunho),
    z.literal(StatusPedidoVenda.AguardandoAprovacao),
    z.literal(StatusPedidoVenda.Aprovado),
    z.literal(StatusPedidoVenda.Cancelado),
    z.literal(StatusPedidoVenda.Faturado)
]);
