import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';

const nullableText = z.string().trim().optional().nullable().transform((value) => value || null);
const requiredText = (label: string, min = 1) => z.string().trim().min(min, `${label} é obrigatório.`);
const requiredGuid = (label: string) => z.string().trim().refine(isValidGuid, `${label} deve ser selecionado.`);
const optionalGuid = z.string().trim().optional().nullable().transform((value) => value || null).refine((value) => value === null || isValidGuid(value), 'Selecione um registro válido.');
const quantidade = z.coerce.number().positive('Informe uma quantidade maior que zero.');
const quantidadeNaoNegativa = z.coerce.number().min(0, 'Quantidade não pode ser negativa.');
const motivo = requiredText('Motivo', 3).max(500, 'Motivo deve ter no máximo 500 caracteres.');

export const motivoSchema = z.object({ motivo });

export const criarLocalEstoqueSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    codigo: requiredText('Código').max(30, 'Código deve ter no máximo 30 caracteres.'),
    nome: requiredText('Nome', 2).max(120, 'Nome deve ter no máximo 120 caracteres.'),
    descricao: nullableText
});

export const atualizarLocalEstoqueSchema = z.object({
    nome: requiredText('Nome', 2).max(120, 'Nome deve ter no máximo 120 caracteres.'),
    descricao: nullableText
});

export const movimentoManualEstoqueSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    produtoId: requiredGuid('Produto'),
    localEstoqueId: requiredGuid('Local de estoque'),
    quantidade,
    origemModulo: requiredText('Origem', 2).default('ESTOQUE'),
    origemId: optionalGuid,
    documento: nullableText,
    motivo
});

export const ajusteEstoqueSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    produtoId: requiredGuid('Produto'),
    localEstoqueId: requiredGuid('Local de estoque'),
    quantidadeContada: quantidadeNaoNegativa,
    origemModulo: requiredText('Origem', 2).default('ESTOQUE'),
    origemId: optionalGuid,
    documento: nullableText,
    motivo
});

export const criarReservaEstoqueSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    produtoId: requiredGuid('Produto'),
    localEstoqueId: requiredGuid('Local de estoque'),
    quantidade,
    origemModulo: requiredText('Origem', 2).default('VENDAS'),
    origemId: optionalGuid,
    observacao: nullableText
});

export const baixarReservaEstoqueSchema = z.object({
    quantidade,
    origemModulo: requiredText('Origem', 2).default('VENDAS'),
    origemId: optionalGuid,
    documento: nullableText,
    motivo
});

export const cancelarReservaEstoqueSchema = z.object({
    quantidade: z.coerce.number().positive('Se informada, a quantidade deve ser maior que zero.').optional().nullable(),
    motivo
});

export const abrirInventarioSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    codigo: requiredText('Código').max(40, 'Código deve ter no máximo 40 caracteres.'),
    localEstoqueId: requiredGuid('Local de estoque'),
    descricao: nullableText
});

export const adicionarItemInventarioSchema = z.object({
    produtoId: requiredGuid('Produto'),
    quantidadeContada: quantidadeNaoNegativa,
    observacao: nullableText
});
