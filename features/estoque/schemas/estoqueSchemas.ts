import { z } from 'zod';
import { isValidGuid, normalizeGuidOrNull } from '@/lib/http/requestUtils';

const nullableText = z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value ?? undefined), z.string().trim().optional());
const requiredText = (label: string, min = 1) => z.string().trim().min(min, `${label} é obrigatório.`);
const requiredGuid = (label: string) => z.string().trim().refine(isValidGuid, `${label} deve ser selecionado.`);
const optionalGuid = z.preprocess((value) => normalizeGuidOrNull(value) ?? undefined, z.string().trim().refine(isValidGuid, 'Selecione um registro válido.').optional());
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


export const transferenciaEstoqueSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialOrigemId: requiredGuid('Filial de origem'),
    localOrigemId: requiredGuid('Local de origem'),
    filialDestinoId: requiredGuid('Filial de destino'),
    localDestinoId: requiredGuid('Local de destino'),
    produtoId: requiredGuid('Produto'),
    quantidade,
    motivo
}).refine((values) => values.localOrigemId !== values.localDestinoId || values.filialOrigemId !== values.filialDestinoId, { path: ['localDestinoId'], message: 'Destino deve ser diferente da origem.' });

export const criarBloqueioEstoqueSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    localEstoqueId: requiredGuid('Local de estoque'),
    produtoId: requiredGuid('Produto'),
    quantidade,
    motivo
});

export const bloqueioEstoqueAcaoSchema = z.object({
    bloqueioId: requiredGuid('Bloqueio'),
    motivo
});

export const concluirInventarioSchema = z.object({
    motivoAjuste: motivo
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
