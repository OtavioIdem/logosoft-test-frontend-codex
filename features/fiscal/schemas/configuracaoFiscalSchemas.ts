// Schemas Zod da fatia Configuração fiscal e certificados (v1.11.0a8b81, D112). `.strict()` só em request --
// resposta aditiva do backend não pode quebrar a tela. A regra crítica (certificado ativo/vencido, empresa do
// contexto) é do backend; aqui só o necessário para UX (limites de tamanho e obrigatoriedade).

import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';

export const APELIDO_CERTIFICADO_MAX = 120;
export const OBSERVACAO_CONFIGURACAO_MAX = 500;
export const MOTIVO_CONFIGURACAO_MAX = 500;
export const SERIE_PADRAO_MAX = 20;

const ambienteSchema = z.union([z.literal(1), z.literal(2)]);
const tipoCertificadoSchema = z.union([z.literal(1), z.literal(2)]);
const situacaoCertificadoSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

const optionalGuidSchema = z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.union([z.string().refine(isValidGuid, 'Selecione uma opção válida.'), z.null()]).optional()
);

const optionalTextSchema = (max: number) =>
    z.preprocess(
        (value) => (typeof value === 'string' ? (value.trim() === '' ? null : value.trim()) : value),
        z.union([z.string().max(max, `Informe no máximo ${max} caracteres.`), z.null()]).optional()
    );

export const salvarConfiguracaoFiscalEmpresaSchema = z
    .object({
        ambiente: ambienteSchema,
        emitirNFe: z.boolean(),
        emitirNFCe: z.boolean(),
        emitirNFSe: z.boolean(),
        certificadoDigitalId: optionalGuidSchema,
        observacao: optionalTextSchema(OBSERVACAO_CONFIGURACAO_MAX)
    })
    .strict();

export const salvarConfiguracaoFiscalFilialSchema = z
    .object({
        ambiente: ambienteSchema,
        herdaConfiguracaoEmpresa: z.boolean(),
        certificadoDigitalId: optionalGuidSchema,
        serieNFePadrao: optionalTextSchema(SERIE_PADRAO_MAX),
        serieNFCePadrao: optionalTextSchema(SERIE_PADRAO_MAX),
        observacao: optionalTextSchema(OBSERVACAO_CONFIGURACAO_MAX)
    })
    .strict();

export const motivoConfiguracaoFiscalSchema = z
    .object({
        motivo: z
            .string()
            .trim()
            .min(1, 'Informe o motivo.')
            .max(MOTIVO_CONFIGURACAO_MAX, `Informe no máximo ${MOTIVO_CONFIGURACAO_MAX} caracteres.`)
    })
    .strict();

/** `validoAte` chega como `Date` do seletor (ou ISO) e sai SEMPRE como ISO UTC (`toISOString()`). */
const validoAteSchema = z.preprocess((value) => {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : '';
    if (typeof value === 'string' && value.trim()) {
        const parsed = new Date(value);
        return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : '';
    }
    return '';
}, z.string().min(1, 'Informe a validade do certificado.'));

export const cadastrarCertificadoDigitalSchema = z
    .object({
        apelido: z.string().trim().min(1, 'Informe o apelido do certificado.').max(APELIDO_CERTIFICADO_MAX, `Informe no máximo ${APELIDO_CERTIFICADO_MAX} caracteres.`),
        tipo: tipoCertificadoSchema,
        thumbprint: z.string().trim().min(1, 'Informe o thumbprint do certificado.'),
        validoAte: validoAteSchema,
        filialId: optionalGuidSchema,
        observacao: optionalTextSchema(OBSERVACAO_CONFIGURACAO_MAX)
    })
    .strict();

// Respostas: sem `.strict()`.
export const configuracaoFiscalEmpresaResponseSchema = z.object({
    id: z.string(),
    ambiente: ambienteSchema,
    emitirNFe: z.boolean(),
    emitirNFCe: z.boolean(),
    emitirNFSe: z.boolean(),
    certificadoDigitalId: z.string().nullable().optional(),
    observacao: z.string().nullable().optional(),
    ativo: z.boolean()
});

export const configuracaoFiscalFilialResponseSchema = z.object({
    id: z.string(),
    filialId: z.string(),
    ambiente: ambienteSchema,
    herdaConfiguracaoEmpresa: z.boolean(),
    certificadoDigitalId: z.string().nullable().optional(),
    serieNFePadrao: z.string().nullable().optional(),
    serieNFCePadrao: z.string().nullable().optional(),
    observacao: z.string().nullable().optional(),
    ativo: z.boolean()
});

export const certificadoDigitalResponseSchema = z.object({
    id: z.string(),
    filialId: z.string().nullable().optional(),
    apelido: z.string(),
    tipo: tipoCertificadoSchema,
    thumbprintMascarado: z.string(),
    validoAte: z.string(),
    situacao: situacaoCertificadoSchema,
    observacao: z.string().nullable().optional()
});

export const verificarCertificadoDigitalResponseSchema = z.object({
    disponivel: z.boolean(),
    motivo: z.string().nullable().optional()
});
