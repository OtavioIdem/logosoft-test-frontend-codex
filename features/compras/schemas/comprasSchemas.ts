import { z } from 'zod';
import { StatusPedidoCompra } from '@/types/erp';
import { isValidGuid } from '@/lib/http/requestUtils';

const guidSchema = z.string().refine(isValidGuid, 'Selecione um registro válido.');
const optionalGuidSchema = z.preprocess((value) => (value === '' ? null : value), z.union([guidSchema, z.null()]).optional());
const isoOrDateSchema = z.union([z.string().min(1, 'Informe uma data.'), z.date()]);
const optionalIsoOrDateSchema = z.preprocess((value) => (value === '' ? null : value), z.union([z.string().min(1), z.date(), z.null()]).optional());
const moneySchema = z.coerce.number().min(0, 'O valor não pode ser negativo.');
const quantitySchema = z.coerce.number().positive('A quantidade deve ser maior que zero.');
const nullableText = z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().nullable().optional());

export const criarPedidoCompraSchema = z.object({
    empresaId: guidSchema,
    filialId: optionalGuidSchema,
    numero: z.string().trim().min(1, 'Informe o número do pedido.'),
    fornecedorId: guidSchema,
    dataEmissao: isoOrDateSchema,
    dataPrevisaoEntrega: optionalIsoOrDateSchema,
    condicaoPagamentoId: optionalGuidSchema,
    observacao: nullableText
});

export const atualizarPedidoCompraSchema = z.object({
    dataPrevisaoEntrega: optionalIsoOrDateSchema,
    condicaoPagamentoId: optionalGuidSchema,
    observacao: nullableText
});

const itemPedidoCompraBaseSchema = z.object({
    localEstoqueId: guidSchema,
    quantidade: quantitySchema,
    valorUnitario: moneySchema,
    valorDesconto: moneySchema,
    observacao: nullableText
});

const descontoValido = (data: { quantidade: number; valorUnitario: number; valorDesconto: number }) => data.valorDesconto <= data.quantidade * data.valorUnitario;
const descontoMessage = { path: ['valorDesconto'], message: 'O desconto não pode ultrapassar o valor bruto do item.' };

export const adicionarItemPedidoCompraSchema = itemPedidoCompraBaseSchema.extend({ produtoId: guidSchema }).refine(descontoValido, descontoMessage);
export const atualizarItemPedidoCompraSchema = itemPedidoCompraBaseSchema.refine(descontoValido, descontoMessage);

export const motivoPedidoCompraSchema = z.object({ motivo: z.string().trim().min(3, 'Informe o motivo com pelo menos 3 caracteres.') });
export const aprovarPedidoCompraSchema = z.object({ observacao: nullableText });

export const receberPedidoCompraSchema = z.object({
    documento: z.string().trim().min(1, 'Informe o documento do recebimento.'),
    dataRecebimento: isoOrDateSchema,
    permiteReceberAcimaDoPedido: z.boolean(),
    gerarContaPagar: z.boolean(),
    primeiroVencimento: optionalIsoOrDateSchema,
    observacao: nullableText,
    itens: z.array(
        z.object({
            itemPedidoCompraId: guidSchema,
            quantidade: quantitySchema,
            localEstoqueId: guidSchema,
            valorUnitario: moneySchema
        })
    ).min(1, 'Informe ao menos um item para recebimento.')
});

export const pedidoCompraStatusFilterSchema = z.union([
    z.literal(StatusPedidoCompra.Rascunho),
    z.literal(StatusPedidoCompra.AguardandoAprovacao),
    z.literal(StatusPedidoCompra.Aprovado),
    z.literal(StatusPedidoCompra.ParcialmenteRecebido),
    z.literal(StatusPedidoCompra.Recebido),
    z.literal(StatusPedidoCompra.Cancelado)
]);
