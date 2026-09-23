import { z } from 'zod';

const guid = z.string().uuid('Selecione um registro válido.');
const nullableGuid = z.union([guid, z.null()]);
const optionalGuid = nullableGuid.optional();
const nullableText = z.string().trim().transform((value) => (value ? value : null)).nullable().optional();

const diaVencimentoPreferencialSchema = z.union([
    z
        .number({ invalid_type_error: 'Dia de vencimento preferencial deve ser um número.' })
        .int('Dia de vencimento preferencial deve ser um número inteiro.')
        .min(1, 'Dia de vencimento preferencial deve estar entre 1 e 31.')
        .max(31, 'Dia de vencimento preferencial deve estar entre 1 e 31.'),
    z.null()
]);

const permiteVendaAPrazoSchema = z.boolean({ invalid_type_error: 'Permite venda a prazo é obrigatório.' });

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

// PUT .../configuracao-comercial substitui o bloco inteiro (D62): `.nullable()` em todo Id/número —
// nunca `.optional()` — para que `schema.parse({})` lance quando falta uma chave (armadilha da
// omissão silenciosa, DECISOES.md D62); `permiteVendaAPrazo` é booleano obrigatório pelo mesmo motivo.
export const configurarComercialClienteSchema = z.object({
    tabelaPrecoPadraoId: nullableGuid,
    condicaoPagamentoPadraoId: nullableGuid,
    classificacaoId: nullableGuid,
    diaVencimentoPreferencial: diaVencimentoPreferencialSchema,
    permiteVendaAPrazo: permiteVendaAPrazoSchema
});
