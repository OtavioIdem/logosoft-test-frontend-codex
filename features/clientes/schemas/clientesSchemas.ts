import { z } from 'zod';

const guid = z.string().uuid('Selecione um registro válido.');
const optionalGuid = z.union([guid, z.null()]).optional();
const nullableText = z.string().trim().transform((value) => (value ? value : null)).nullable().optional();

export const criarClienteSchema = z.object({
    empresaId: guid,
    filialId: optionalGuid,
    pessoaId: guid,
    codigo: z.string().trim().min(1, 'Código é obrigatório.'),
    limiteCredito: z.number({ invalid_type_error: 'Limite de crédito é obrigatório.' }).min(0, 'Limite de crédito não pode ser negativo.'),
    observacao: nullableText
});

export const atualizarClienteSchema = z.object({
    limiteCredito: z.number({ invalid_type_error: 'Limite de crédito é obrigatório.' }).min(0, 'Limite de crédito não pode ser negativo.'),
    observacao: nullableText
});

export const clienteMotivoSchema = z.object({ motivo: z.string().trim().min(5, 'Informe um motivo com pelo menos 5 caracteres.') });
