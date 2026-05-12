import { z } from 'zod';

const guid = z.string().uuid('Selecione um registro válido.');
const optionalGuid = z.union([guid, z.null()]).optional();
const nullableText = z.string().trim().transform((value) => (value ? value : null)).nullable().optional();

export const criarFornecedorSchema = z.object({
    empresaId: guid,
    filialId: optionalGuid,
    pessoaId: guid,
    codigo: z.string().trim().min(1, 'Código é obrigatório.'),
    observacao: nullableText
});

export const atualizarFornecedorSchema = z.object({
    observacao: nullableText
});

export const fornecedorMotivoSchema = z.object({ motivo: z.string().trim().min(5, 'Informe um motivo com pelo menos 5 caracteres.') });
