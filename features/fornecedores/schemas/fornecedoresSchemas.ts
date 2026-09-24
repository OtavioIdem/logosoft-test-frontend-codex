import { z } from 'zod';

const guid = z.string().uuid('Selecione um registro válido.');
const nullableGuid = z.union([guid, z.null()]);
const optionalGuid = nullableGuid.optional();
const nullableText = z.string().trim().transform((value) => (value ? value : null)).nullable().optional();

const vazioParaNulo = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? null : value);

const prazoEntregaMedioSchema = z.union([
    z
        .number({ invalid_type_error: 'Prazo de entrega médio deve ser um número.' })
        .int('Prazo de entrega médio deve ser um número inteiro.')
        .min(0, 'Prazo de entrega médio não pode ser negativo.'),
    z.null()
]);

const categoriaFornecimentoSchema = z.preprocess(
    vazioParaNulo,
    z.union([z.string().trim().max(80, 'Categoria de fornecimento deve ter no máximo 80 caracteres.'), z.null()])
);

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

// PUT .../configuracao-compra substitui o bloco inteiro (D62): mesma trava de `.nullable()` sem
// `.optional()` do schema de Cliente — `schema.parse({})` precisa lançar quando falta uma chave.
export const configurarCompraFornecedorSchema = z.object({
    condicaoPagamentoPadraoId: nullableGuid,
    prazoEntregaMedio: prazoEntregaMedioSchema,
    categoriaFornecimento: categoriaFornecimentoSchema
});

// POST .../revogar-homologacao — motivo obrigatório (backend: NotEmpty + máx. 500, D63).
export const revogarHomologacaoFornecedorSchema = z.object({
    motivo: z.string().trim().min(5, 'Informe um motivo com pelo menos 5 caracteres.').max(500, 'Motivo deve ter no máximo 500 caracteres.')
});
