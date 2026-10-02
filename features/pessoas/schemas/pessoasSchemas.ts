import { z } from 'zod';
import { TipoPessoa } from '@/types/erp';
import { isPotentialCpf, isPotentialCnpj, normalizeCnpj, normalizeCpf } from '@/lib/validators/documentos';
import { UFS_BRASIL } from '@/lib/constants/ufs';
import { PESSOA_ENDERECO_LIMITES, PESSOA_ENDERECO_VALIDACAO } from '@/features/pessoas/components/pessoaEnderecosLabels';
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
// (inventário §3.2). Request `.strict()`: não existe `municipioIbgeCodigo` aqui, que é do PATCH da b74.
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
