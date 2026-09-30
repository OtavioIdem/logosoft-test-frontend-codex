// Schemas Zod de natureza de operação (v1.11.0a8b71 combo, D91; v1.11.0a8b72 manutenção, D98).
// `.strict()` só em REQUEST (montado pelo próprio frontend); a resposta NUNCA é estrita -- campo aditivo do
// backend não pode quebrar a tela (regra do módulo, NO-1).
//
// Limites do domínio (`NaturezaOperacao.cs`): código <= 40 sem espaço (`:196-205`), descrição <= 200 (`:42`),
// observação <= 500 (`:50,224-235`); enum fora do conjunto é 400 (`Enum.IsDefined`, `:43,207-209`). O motivo de
// inativação tem teto de 400 por causa da coluna de 500 da auditoria (NO-9, D98).

import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import {
    AMBITO_CFOP_OPTIONS,
    FINALIDADE_NATUREZA_OPTIONS,
    INDICADOR_PRESENCA_COMPRADOR_OPTIONS,
    NATUREZA_MOTIVO_INATIVAR_MAX,
    NATUREZA_OPERACAO_INATIVAR_DIALOG,
    NATUREZA_OPERACAO_VALIDACAO,
    NATUREZA_CFOP_GRADE,
    TIPO_DOCUMENTO_NATUREZA_OPTIONS,
    TIPO_ITEM_CFOP_OPTIONS,
    TIPO_OPERACAO_NATUREZA_OPTIONS
} from '@/features/fiscal/components/naturezasOperacaoLabels';

export const NATUREZAS_OPERACAO_TAMANHO_PAGINA_MAXIMO = 200;
export const NATUREZA_CODIGO_MAX = 40;
export const NATUREZA_DESCRICAO_MAX = 200;
export const NATUREZA_OBSERVACAO_MAX = 500;

const valoresDe = (options: { value: number | null }[]) => options.map((option) => option.value).filter((value): value is number => value !== null);

const enumNumerico = (valores: number[], mensagem: string) => z.number({ invalid_type_error: mensagem, required_error: mensagem }).int(mensagem).refine((valor) => valores.includes(valor), mensagem);

const guidObrigatorio = (mensagem: string) => z.string({ required_error: mensagem, invalid_type_error: mensagem }).trim().refine(isValidGuid, mensagem);

// `''`/`undefined` -> `null`: o campo opcional sai SEMPRE, como `null` explícito.
const guidOpcionalNulo = z.preprocess((value) => (value === '' || value === undefined ? null : value), z.union([z.string().trim().refine(isValidGuid, 'Selecione uma filial válida.'), z.null()]));

const tipoDocumentoSchema = enumNumerico(valoresDe(TIPO_DOCUMENTO_NATUREZA_OPTIONS), 'Selecione o tipo de documento.');
const tipoOperacaoSchema = enumNumerico(valoresDe(TIPO_OPERACAO_NATUREZA_OPTIONS), 'Selecione o tipo de operação.');
const finalidadeSchema = enumNumerico(valoresDe(FINALIDADE_NATUREZA_OPTIONS), 'Selecione a finalidade.');
const indicadorPresencaSchema = enumNumerico(valoresDe(INDICADOR_PRESENCA_COMPRADOR_OPTIONS), 'Selecione a presença do comprador.');
const ambitoSchema = enumNumerico(valoresDe(AMBITO_CFOP_OPTIONS), 'Selecione o âmbito.');
const tipoItemSchema = z
    .number()
    .int()
    .refine((valor) => valoresDe(TIPO_ITEM_CFOP_OPTIONS).includes(valor), 'Selecione o tipo de item.')
    .nullable();

const codigoSchema = z
    .string({ required_error: NATUREZA_OPERACAO_VALIDACAO.codigoObrigatorio, invalid_type_error: NATUREZA_OPERACAO_VALIDACAO.codigoObrigatorio })
    .trim()
    .min(1, NATUREZA_OPERACAO_VALIDACAO.codigoObrigatorio)
    .max(NATUREZA_CODIGO_MAX, NATUREZA_OPERACAO_VALIDACAO.codigoTamanho)
    .refine((valor) => !/\s/.test(valor), NATUREZA_OPERACAO_VALIDACAO.codigoEspaco);

const descricaoSchema = z
    .string({ required_error: NATUREZA_OPERACAO_VALIDACAO.descricaoObrigatoria, invalid_type_error: NATUREZA_OPERACAO_VALIDACAO.descricaoObrigatoria })
    .trim()
    .min(1, NATUREZA_OPERACAO_VALIDACAO.descricaoObrigatoria)
    .max(NATUREZA_DESCRICAO_MAX, NATUREZA_OPERACAO_VALIDACAO.descricaoTamanho);

// Vazio vira `null` (o backend faz o mesmo, `NaturezaOperacao.cs:224-235`).
const observacaoSchema = z.preprocess(
    (value) => (value === undefined || value === null || (typeof value === 'string' && value.trim() === '') ? null : value),
    z.string().trim().max(NATUREZA_OBSERVACAO_MAX, NATUREZA_OPERACAO_VALIDACAO.observacaoTamanho).nullable()
);

/** Chave do mapeamento: `(ambito, tipoItem)`, com `tipoItem` nulo = "qualquer item" (`NaturezaOperacaoCfopConfiguration.cs:41-43`). */
export const chaveMapeamentoCfop = (item: { ambito: number; tipoItem: number | null }) => `${item.ambito}|${item.tipoItem ?? 'qualquer'}`;

// `MapeamentoCfopRequest` (`NaturezaOperacaoContracts.cs:15`): 3 campos, o CFOP vai pelo CÓDIGO.
export const mapeamentoCfopSchema = z
    .object({
        ambito: ambitoSchema,
        cfopCodigo: z.string({ required_error: NATUREZA_CFOP_GRADE.cfopObrigatorio, invalid_type_error: NATUREZA_CFOP_GRADE.cfopObrigatorio }).trim().min(1, NATUREZA_CFOP_GRADE.cfopObrigatorio),
        tipoItem: tipoItemSchema
    })
    .strict();

// O backend ACEITA chave repetida e a última vence em silêncio (`ResolvedorMapeamentoCfop.cs`, NO-16/§4.3): o
// frontend impede (D98).
const semChaveRepetida = (cfops: { ambito: number; tipoItem: number | null }[], ctx: z.RefinementCtx) => {
    const vistas = new Set<string>();
    cfops.forEach((item, indice) => {
        const chave = chaveMapeamentoCfop(item);
        if (vistas.has(chave)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: [indice, 'ambito'], message: NATUREZA_CFOP_GRADE.chaveRepetida });
        }
        vistas.add(chave);
    });
};

// `cfops` é OBRIGATÓRIO e nunca nulo: `null` preserva no PUT, `[]` apaga, lista substitui (D98).
const cfopsSchema = z.array(mapeamentoCfopSchema).superRefine(semChaveRepetida);

// `CriarNaturezaOperacaoRequest` (`NaturezaOperacaoContracts.cs:17-30`), 13 campos.
export const criarNaturezaOperacaoSchema = z
    .object({
        empresaId: guidObrigatorio(NATUREZA_OPERACAO_VALIDACAO.empresaObrigatoria),
        filialId: guidOpcionalNulo,
        codigo: codigoSchema,
        descricao: descricaoSchema,
        tipoDocumento: tipoDocumentoSchema,
        tipoOperacao: tipoOperacaoSchema,
        finalidade: finalidadeSchema,
        indicadorPresencaComprador: indicadorPresencaSchema,
        indicadorConsumidorFinal: z.boolean(),
        movimentaEstoque: z.boolean(),
        geraFinanceiro: z.boolean(),
        observacao: observacaoSchema,
        cfops: cfopsSchema
    })
    .strict();

// `AtualizarNaturezaOperacaoRequest` (`NaturezaOperacaoContracts.cs:36-46`), 10 campos: sem empresa, filial e código.
export const atualizarNaturezaOperacaoSchema = z
    .object({
        descricao: descricaoSchema,
        tipoDocumento: tipoDocumentoSchema,
        tipoOperacao: tipoOperacaoSchema,
        finalidade: finalidadeSchema,
        indicadorPresencaComprador: indicadorPresencaSchema,
        indicadorConsumidorFinal: z.boolean(),
        movimentaEstoque: z.boolean(),
        geraFinanceiro: z.boolean(),
        observacao: observacaoSchema,
        cfops: cfopsSchema
    })
    .strict();

// `InativarNaturezaOperacaoRequest` (`NaturezaOperacaoContracts.cs:48`).
export const inativarNaturezaOperacaoSchema = z
    .object({
        motivo: z
            .string({ required_error: NATUREZA_OPERACAO_INATIVAR_DIALOG.motivoObrigatorio })
            .trim()
            .min(1, NATUREZA_OPERACAO_INATIVAR_DIALOG.motivoObrigatorio)
            .max(NATUREZA_MOTIVO_INATIVAR_MAX, NATUREZA_OPERACAO_INATIVAR_DIALOG.motivoTamanho)
    })
    .strict();

// Query da listagem: montada pelo frontend, `.strict()`. `termo`/`codigo` opcionais; "Todas" omite `somenteAtivas`.
export const naturezaOperacaoListQuerySchema = z
    .object({
        empresaId: z.string().trim().refine(isValidGuid, 'Selecione uma empresa válida.'),
        termo: z.string().trim().max(100).nullable().optional(),
        codigo: z.string().trim().max(NATUREZA_CODIGO_MAX).nullable().optional(),
        tipoDocumento: z.number().int().nullable().optional(),
        tipoOperacao: z.number().int().nullable().optional(),
        finalidade: z.number().int().nullable().optional(),
        somenteAtivas: z.boolean().nullable().optional(),
        pagina: z.number().int().positive().default(1),
        tamanhoPagina: z.number().int().positive().max(NATUREZAS_OPERACAO_TAMANHO_PAGINA_MAXIMO).default(20)
    })
    .strict();

// ---------------------------------------------------------------------------------------------
// Respostas: SEM `.strict()`.
// ---------------------------------------------------------------------------------------------

// `MapeamentoCfopResponse` (`NaturezaOperacaoContracts.cs:51`).
export const mapeamentoCfopResponseSchema = z.object({
    ambito: z.number(),
    cfopId: z.string(),
    cfopCodigo: z.string(),
    tipoItem: z.number().nullable().optional().transform((valor) => valor ?? null)
});

// `NaturezaOperacaoResponse` (`NaturezaOperacaoContracts.cs:53-68`), 15 campos. `cfops` é obrigatório e SEM
// `default`: uma resposta sem a lista falha alto, porque um `[]` inventado aqui viraria um PUT que apaga o
// mapeamento inteiro (D98).
export const naturezaOperacaoResponseSchema = z.object({
    id: z.string(),
    empresaId: z.string(),
    filialId: z.string().nullable().optional(),
    codigo: z.string(),
    descricao: z.string(),
    tipoDocumento: z.number(),
    tipoOperacao: z.number(),
    finalidade: z.number(),
    indicadorPresencaComprador: z.number(),
    indicadorConsumidorFinal: z.boolean(),
    movimentaEstoque: z.boolean(),
    geraFinanceiro: z.boolean(),
    observacao: z.string().nullable().optional(),
    ativa: z.boolean(),
    cfops: z.array(mapeamentoCfopResponseSchema)
});

// `CfopResolvidoResponse` (`NaturezaOperacaoContracts.cs:74-82`), 8 campos.
export const cfopResolvidoResponseSchema = z.object({
    naturezaOperacaoId: z.string(),
    naturezaCodigo: z.string(),
    ambito: z.number(),
    cfopId: z.string(),
    cfopCodigo: z.string(),
    cfopDescricao: z.string(),
    geraFinanceiro: z.boolean(),
    movimentaEstoque: z.boolean()
});

// Query de `GET {id}/cfop` (`NaturezasOperacaoController.cs:130-136`): `ufOrigem` e `ufDestino` obrigatórias.
export const resolverCfopNaturezaQuerySchema = z
    .object({
        ufOrigem: z.string().trim().length(2, 'Informe a UF de origem.'),
        ufDestino: z.string().trim().length(2, 'Informe a UF de destino.'),
        tipoItem: z.number().int().nullable().optional(),
        operacaoComExterior: z.boolean().optional()
    })
    .strict();
