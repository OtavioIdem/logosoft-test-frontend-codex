import { z } from 'zod';
import { TipoPessoa } from '@/types/erp';
import { isPotentialCpf, isPotentialCnpj, normalizeCnpj, normalizeCpf } from '@/lib/validators/documentos';

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
