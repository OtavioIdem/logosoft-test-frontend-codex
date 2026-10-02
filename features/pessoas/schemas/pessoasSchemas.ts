import { z } from 'zod';
import { TipoPessoa } from '@/types/erp';
import { isPotentialCpf, isPotentialCnpj, normalizeCnpj, normalizeCpf } from '@/lib/validators/documentos';
import { UFS_BRASIL } from '@/lib/constants/ufs';
import { PESSOA_ENDERECO_LIMITES, PESSOA_ENDERECO_VALIDACAO } from '@/features/pessoas/components/pessoaEnderecosLabels';
import { INDICADOR_CONTRIBUINTE_ICMS_OPTIONS, PESSOA_FISCAL_LIMITES, PESSOA_FISCAL_VALIDACAO, REGIME_TRIBUTARIO_PARCEIRO_OPTIONS } from '@/features/pessoas/components/pessoaFiscalLabels';
import { TipoEndereco } from '@/features/pessoas/types/pessoaEnderecos.types';

const guid = z.string().uuid('Selecione um registro válido.');
const optionalGuid = z.union([guid, z.null()]).optional();
const nullableText = z.string().trim().transform((value) => (value ? value : null)).nullable().optional();

const documentoPessoaSchema = z
    .string()
    .trim()
    .min(1, 'Documento é obrigatório.')
    .transform((value) => normalizeCnpj(value))
    .refine((value) => value.length >= 11 && value.length <= 14, 'Documento deve ter tamanho compatível com CPF ou CNPJ.')
    .superRefine((value, ctx) => {
        if (normalizeCpf(value).length === 11 && !isPotentialCpf(value)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CPF deve possuir 11 dígitos.' });
        }
        if (value.length === 14 && !isPotentialCnpj(value)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CNPJ pode conter números e letras, com 14 caracteres.' });
        }
    });

export const criarPessoaSchema = z
    .object({
        empresaId: guid,
        filialId: optionalGuid,
        tipoPessoa: z.nativeEnum(TipoPessoa),
        nomeRazaoSocial: z.string().trim().min(2, 'Nome/razão social é obrigatório.'),
        nomeFantasia: nullableText,
        documento: documentoPessoaSchema,
        inscricaoEstadual: nullableText,
        inscricaoMunicipal: nullableText,
        observacao: nullableText
    })
    .superRefine((value, ctx) => {
        if (value.tipoPessoa === TipoPessoa.Fisica && normalizeCpf(value.documento).length !== 11) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['documento'], message: 'Pessoa física deve informar CPF com 11 dígitos.' });
        }

        if (value.tipoPessoa === TipoPessoa.Juridica && normalizeCnpj(value.documento).length !== 14) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['documento'], message: 'Pessoa jurídica deve informar CNPJ numérico ou alfanumérico com 14 caracteres.' });
        }
    });

export const atualizarPessoaSchema = z.object({
    nomeRazaoSocial: z.string().trim().min(2, 'Nome/razão social é obrigatório.'),
    nomeFantasia: nullableText,
    inscricaoEstadual: nullableText,
    inscricaoMunicipal: nullableText,
    observacao: nullableText
});

export const inativarPessoaSchema = z.object({ motivo: z.string().trim().min(5, 'Informe um motivo com pelo menos 5 caracteres.') });

const classificacaoPessoaCodigoSchema = z
    .string()
    .trim()
    .min(1, 'Informe o código.')
    .max(40, 'Código deve ter no máximo 40 caracteres.')
    .refine((value) => !/\s/.test(value), 'Código não pode conter espaço.');
const classificacaoPessoaNomeSchema = z.string().trim().min(1, 'Informe o nome.').max(120, 'Nome deve ter no máximo 120 caracteres.');
const classificacaoPessoaDescricaoSchema = z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(300, 'Descrição deve ter no máximo 300 caracteres.').optional()
);
const classificacaoPessoaMotivoSchema = z.string().trim().min(1, 'Informe o motivo.').max(500, 'Motivo deve ter no máximo 500 caracteres.');

export const criarClassificacaoPessoaSchema = z.object({
    empresaId: guid,
    codigo: classificacaoPessoaCodigoSchema,
    nome: classificacaoPessoaNomeSchema,
    descricao: classificacaoPessoaDescricaoSchema
});

export const atualizarClassificacaoPessoaSchema = z.object({
    empresaId: guid,
    nome: classificacaoPessoaNomeSchema,
    descricao: classificacaoPessoaDescricaoSchema
});

export const inativarClassificacaoPessoaSchema = z.object({
    empresaId: guid,
    motivo: classificacaoPessoaMotivoSchema
});

// Endereços da Pessoa (v1.11.0a8b73, D102). Limites e obrigatoriedade de `EnderecoContatoValidators.cs:5-33` e
// `EnderecoPessoa.cs:11-26,129-186`. O Swagger declara tudo opcional; no C# sete dos nove campos são obrigatórios
// (inventário §3.2). Request `.strict()`: não existe `municipioIbgeCodigo` aqui, que é do PATCH da b75.
const ufsEndereco = new Set<string>(UFS_BRASIL);

const textoEnderecoObrigatorio = (obrigatorio: string, limite: number, tamanho: string) =>
    z.string({ required_error: obrigatorio, invalid_type_error: obrigatorio }).trim().min(1, obrigatorio).max(limite, tamanho);

const tipoEnderecoSchema = z.nativeEnum(TipoEndereco, { errorMap: () => ({ message: PESSOA_ENDERECO_VALIDACAO.tipoInvalido }) });
const logradouroEnderecoSchema = textoEnderecoObrigatorio(PESSOA_ENDERECO_VALIDACAO.logradouroObrigatorio, PESSOA_ENDERECO_LIMITES.logradouro, PESSOA_ENDERECO_VALIDACAO.logradouroTamanho);
const numeroEnderecoSchema = textoEnderecoObrigatorio(PESSOA_ENDERECO_VALIDACAO.numeroObrigatorio, PESSOA_ENDERECO_LIMITES.numero, PESSOA_ENDERECO_VALIDACAO.numeroTamanho);
const complementoEnderecoSchema = z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
        if (value === null || value === undefined) return null;
        const normalizado = value.trim();
        return normalizado.length ? normalizado : null;
    })
    .refine((value) => value === null || value.length <= PESSOA_ENDERECO_LIMITES.complemento, PESSOA_ENDERECO_VALIDACAO.complementoTamanho);
const bairroEnderecoSchema = textoEnderecoObrigatorio(PESSOA_ENDERECO_VALIDACAO.bairroObrigatorio, PESSOA_ENDERECO_LIMITES.bairro, PESSOA_ENDERECO_VALIDACAO.bairroTamanho);
const cidadeEnderecoSchema = textoEnderecoObrigatorio(PESSOA_ENDERECO_VALIDACAO.cidadeObrigatoria, PESSOA_ENDERECO_LIMITES.cidade, PESSOA_ENDERECO_VALIDACAO.cidadeTamanho);
const ufEnderecoSchema = z
    .string({ required_error: PESSOA_ENDERECO_VALIDACAO.ufObrigatoria, invalid_type_error: PESSOA_ENDERECO_VALIDACAO.ufObrigatoria })
    .trim()
    .min(1, PESSOA_ENDERECO_VALIDACAO.ufObrigatoria)
    .transform((value) => value.toUpperCase())
    .refine((value) => ufsEndereco.has(value), PESSOA_ENDERECO_VALIDACAO.ufInvalida);
// O backend remove o que não é dígito e exige 8 (`EnderecoPessoa.cs:177-187`); o request leva só os dígitos.
const cepEnderecoSchema = z
    .string({ required_error: PESSOA_ENDERECO_VALIDACAO.cepObrigatorio, invalid_type_error: PESSOA_ENDERECO_VALIDACAO.cepObrigatorio })
    .transform((value) => value.replace(/\D/g, ''))
    .superRefine((value, ctx) => {
        if (value.length === 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: PESSOA_ENDERECO_VALIDACAO.cepObrigatorio });
        } else if (value.length !== PESSOA_ENDERECO_LIMITES.cepDigitos) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: PESSOA_ENDERECO_VALIDACAO.cepInvalido });
        }
    });

// AdicionarEnderecoPessoaRequest (`EnderecoContatoRequests.cs:5-14`, 9 campos).
export const criarEnderecoPessoaSchema = z
    .object({
        tipo: tipoEnderecoSchema,
        logradouro: logradouroEnderecoSchema,
        numero: numeroEnderecoSchema,
        complemento: complementoEnderecoSchema,
        bairro: bairroEnderecoSchema,
        cidade: cidadeEnderecoSchema,
        uf: ufEnderecoSchema,
        cep: cepEnderecoSchema,
        principal: z.boolean()
    })
    .strict();

// AtualizarEnderecoPessoaRequest (`EnderecoContatoRequests.cs:16-25`, os mesmos 9 campos).
export const atualizarEnderecoPessoaSchema = z
    .object({
        tipo: tipoEnderecoSchema,
        logradouro: logradouroEnderecoSchema,
        numero: numeroEnderecoSchema,
        complemento: complementoEnderecoSchema,
        bairro: bairroEnderecoSchema,
        cidade: cidadeEnderecoSchema,
        uf: ufEnderecoSchema,
        cep: cepEnderecoSchema,
        principal: z.boolean()
    })
    .strict();

// EnderecoPessoaResponse (`EnderecoContatoResponse.cs:6-19`, 13 campos). Response nunca é estrita: campo aditivo do
// backend não pode quebrar a aba. `tipo` é numérico (EP-10); se a API passar a devolver texto, o erro aparece, sem
// fallback silencioso.
export const enderecoPessoaResponseSchema = z.object({
    id: z.string(),
    pessoaId: z.string(),
    tipo: z.number(),
    logradouro: z.string(),
    numero: z.string(),
    complemento: z.string().nullable().optional(),
    bairro: z.string(),
    cidade: z.string(),
    uf: z.string(),
    cep: z.string(),
    principal: z.boolean(),
    status: z.number(),
    municipioIbgeId: z.string().nullable().optional()
});

export const enderecosPessoaResponseSchema = z.array(enderecoPessoaResponseSchema);

// Vínculo de município do endereço (v1.11.0a8b75, D104). `VincularMunicipioEnderecoPessoaRequest` (`EnderecoContatoRequests.cs:31`,
// 1 campo). O C# aceita nulo/vazio para DESVINCULAR (`EnderecoContatoValidators.cs:41-44`), mas a b75 só vincula: o
// código é obrigatório e tem 7 dígitos (`Length(7)` + `^[0-9]{7}$`). O código vem da busca, nunca digitado (D52).
export const vincularMunicipioEnderecoPessoaSchema = z
    .object({
        municipioIbgeCodigo: z
            .string({ required_error: PESSOA_FISCAL_VALIDACAO.municipioIbgeCodigoInvalido, invalid_type_error: PESSOA_FISCAL_VALIDACAO.municipioIbgeCodigoInvalido })
            .trim()
            .regex(/^[0-9]{7}$/, PESSOA_FISCAL_VALIDACAO.municipioIbgeCodigoInvalido)
    })
    .strict();

// Bloco fiscal da Pessoa (v1.11.0a8b75, D104). `AtualizarDadosFiscaisPessoaRequest` (`PessoaRequests.cs:37-45`, 8
// campos; validador em `PessoaValidators.cs:44-57`). O PATCH SUBSTITUI o bloco inteiro (PF-1): os 8 campos são
// OBRIGATÓRIOS no schema, com `null` explícito para "não informado". Campo omitido reprova aqui, em vez de apagar o
// valor gravado em silêncio. Request `.strict()`.
const opcaoNumericaFiscal = (opcoes: { value: number }[]) =>
    z
        .union([z.number(), z.null()], { errorMap: () => ({ message: PESSOA_FISCAL_VALIDACAO.valorInvalido }) })
        .refine((value) => value === null || opcoes.some((opcao) => opcao.value === value), PESSOA_FISCAL_VALIDACAO.valorInvalido);

const textoFiscalNormalizado = z.union([z.string(), z.null()]).transform((value) => {
    if (value === null) return null;
    const normalizado = value.trim();
    return normalizado.length ? normalizado : null;
});

const triEstadoFiscal = z.union([z.boolean(), z.null()], { errorMap: () => ({ message: PESSOA_FISCAL_VALIDACAO.valorInvalido }) });

export const atualizarDadosFiscaisPessoaSchema = z
    .object({
        indicadorContribuinteIcms: opcaoNumericaFiscal(INDICADOR_CONTRIBUINTE_ICMS_OPTIONS),
        inscricaoEstadualSt: textoFiscalNormalizado.refine((value) => value === null || value.length <= PESSOA_FISCAL_LIMITES.inscricaoEstadualSt, PESSOA_FISCAL_VALIDACAO.inscricaoEstadualStTamanho),
        suframa: textoFiscalNormalizado.superRefine((value, ctx) => {
            if (value === null) return;
            if (!/^[0-9]+$/.test(value)) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: PESSOA_FISCAL_VALIDACAO.suframaSoDigitos });
            } else if (value.length > PESSOA_FISCAL_LIMITES.suframa) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: PESSOA_FISCAL_VALIDACAO.suframaTamanho });
            }
        }),
        regimeTributarioParceiro: opcaoNumericaFiscal(REGIME_TRIBUTARIO_PARCEIRO_OPTIONS),
        // A aba só os envia nulos, e só quando o registro também os tem nulos (emenda da D104). O contrato aceita o código.
        municipioIbgeCodigo: textoFiscalNormalizado.refine((value) => value === null || /^[0-9]{7}$/.test(value), PESSOA_FISCAL_VALIDACAO.municipioIbgeCodigoInvalido),
        paisCodigoBacen: textoFiscalNormalizado.refine((value) => value === null || /^[0-9]{1,4}$/.test(value), PESSOA_FISCAL_VALIDACAO.paisCodigoBacenTamanho),
        contribuinteIpi: triEstadoFiscal,
        tomadorOrgaoPublico: triEstadoFiscal
    })
    .strict()
    .superRefine((value, ctx) => {
        // `PessoaDadosFiscaisResolver.cs:38-41`: com qualquer outro campo preenchido, o indicador é obrigatório. Tudo em
        // branco é válido e LIMPA o bloco (`:31-36`). `false` conta como preenchido (`HasValue`, `:84-92`).
        const outroPreenchido = [value.inscricaoEstadualSt, value.suframa, value.regimeTributarioParceiro, value.municipioIbgeCodigo, value.paisCodigoBacen, value.contribuinteIpi, value.tomadorOrgaoPublico].some((campo) => campo !== null);
        if (value.indicadorContribuinteIcms === null && outroPreenchido) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['indicadorContribuinteIcms'], message: PESSOA_FISCAL_VALIDACAO.indicadorObrigatorio });
        }
    });

// PessoaResponse (`PessoaResponse.cs:7-29`, 22 campos). Response NUNCA estrita: campo aditivo do backend não pode
// quebrar a tela, e `.passthrough()` preserva o que o schema não conhece (a UI lê `createdAt` por `asRecord`). Os
// enums chegam NUMÉRICOS (sem `JsonStringEnumConverter`); se vierem texto, o erro aparece, sem fallback silencioso.
// `createdAt` não existe no record do C# e a UI o lê (PF-3): opcional.
export const pessoaResponseSchema = z
    .object({
        id: z.string(),
        empresaId: z.string(),
        filialId: z.string().nullish(),
        tipoPessoa: z.number(),
        nomeRazaoSocial: z.string(),
        nomeFantasia: z.string().nullish(),
        documento: z.string(),
        inscricaoEstadual: z.string().nullish(),
        inscricaoMunicipal: z.string().nullish(),
        observacao: z.string().nullish(),
        status: z.number(),
        createdAt: z.string().nullish(),
        indicadorContribuinteIcms: z.number().nullish(),
        indicadorIeDestinatario: z.number().nullish(),
        inscricaoEstadualSt: z.string().nullish(),
        suframa: z.string().nullish(),
        regimeTributarioParceiro: z.number().nullish(),
        municipioIbgeId: z.string().nullish(),
        paisId: z.string().nullish(),
        bloqueada: z.boolean().nullish(),
        motivoBloqueio: z.string().nullish(),
        contribuinteIpi: z.boolean().nullish(),
        tomadorOrgaoPublico: z.boolean().nullish()
    })
    .passthrough();
