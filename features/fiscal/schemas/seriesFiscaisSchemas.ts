// Schemas Zod da fatia Séries fiscais (v1.11.0a8b58, F3.1). `.strict()` só em request -- resposta aditiva
// não pode quebrar a tela (regra do módulo). Regras espelham o agregado `SerieFiscal.cs` (R1-R9, medidas em
// `docs/fatias/v1.11.0a8b58-f3-series-fiscais.md`, seção 10), porque a forma não passa por FluentValidation:
// sem espelhar aqui, o operador só descobre a regra no 400 do backend (armadilha 2 do plano).

import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';

const NUMERO_SERIE_MAX = 999;
const NUMERO_MAX_INT32 = 2147483647;
const MOTIVO_INATIVACAO_MAX = 464;

const guidSchema = z.string().refine(isValidGuid, 'Selecione uma opção válida.');
const optionalGuidSchema = z.preprocess((value) => (value === '' || value === undefined ? null : value), z.union([guidSchema, z.null()]).optional());

/** `DateOnly` do backend: `yyyy-MM-dd`, sem componente de hora (armadilha 3). */
const dateOnlySchema = (message: string) =>
    z.preprocess((value) => {
        if (value instanceof Date) return Number.isFinite(value.getTime()) ? toDateOnly(value) : '';
        if (typeof value === 'string') return value.trim().slice(0, 10);
        return value;
    }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message));

const dateOnlyNullableSchema = z.preprocess((value) => {
    if (value === '' || value === undefined || value === null) return null;
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? toDateOnly(value) : null;
    if (typeof value === 'string') return value.trim().slice(0, 10);
    return value;
}, z.union([z.null(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.')]));

/** Converte para `yyyy-MM-dd` no fuso local -- `toISOString()` deslocaria a data em fusos negativos (P-8a). */
export const toDateOnly = (value: Date) => {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const fromDateOnly = (value?: string | null): Date | null => {
    if (!value) return null;
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return null;
    const parsed = new Date(year, month - 1, day);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
};

// `z.coerce.number()` sozinho converte `null`/`''` em `0` (`Number(null) === 0`) -- silencioso demais para um
// campo onde `0` é um valor legítimo do domínio (`numero` da série vai de 0 a 999): o campo deixado em
// branco pareceria "série 0" digitada de propósito. Preprocessa `null`/`''`/`undefined` para `undefined`
// primeiro, forçando o campo a falhar como obrigatório (mensagem própria) em vez de virar zero por acidente;
// os limites de faixa continuam com mensagem própria por regra.
const requiredIntSchema = (min: number, max: number, requiredMessage: string, intMessage: string, minMessage: string, maxMessage: string) =>
    z.preprocess(
        (value) => (value === null || value === undefined || value === '' ? undefined : value),
        z.coerce.number({ invalid_type_error: requiredMessage, required_error: requiredMessage }).int(intMessage).min(min, minMessage).max(max, maxMessage)
    );

// R3 (`SerieFiscal.cs:150-158`): 0-999. R4 (`:162-165`): inicial > 0. R5 (`:167-170`): final >= inicial.
// R6 (`:173-181`): fim nulo ou >= início. R1/R2 (empresa e modelo) via guid obrigatório.
export const criarSerieFiscalSchema = z
    .object({
        empresaId: guidSchema,
        filialId: optionalGuidSchema,
        modeloDocumentoFiscalId: guidSchema,
        numero: requiredIntSchema(0, NUMERO_SERIE_MAX, `Informe um número de série entre 0 e ${NUMERO_SERIE_MAX}.`, 'Informe um número inteiro.', `Informe um número de série entre 0 e ${NUMERO_SERIE_MAX}.`, `Informe um número de série entre 0 e ${NUMERO_SERIE_MAX}.`),
        numeroInicial: requiredIntSchema(1, NUMERO_MAX_INT32, 'Informe o número inicial.', 'Informe um número inteiro.', 'O número inicial deve ser maior que zero.', 'Número inicial fora do intervalo suportado.'),
        numeroFinal: requiredIntSchema(1, NUMERO_MAX_INT32, 'Informe o número final.', 'Informe um número inteiro.', 'O número final deve ser maior que zero.', 'Número final fora do intervalo suportado.'),
        vigenciaInicio: dateOnlySchema('Informe a data de início de vigência.'),
        vigenciaFim: dateOnlyNullableSchema
    })
    .strict()
    .superRefine((values, ctx) => {
        if (values.numeroFinal < values.numeroInicial) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['numeroFinal'], message: 'O número final não pode ser menor que o número inicial.' });
        }
        if (values.vigenciaFim && values.vigenciaFim < values.vigenciaInicio) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vigenciaFim'], message: 'O fim de vigência não pode ser anterior ao início.' });
        }
    });

// R8 (`SerieFiscal.cs:127-130`): nunca reduz -- a fábrica recebe o número final atual da série selecionada.
export const ampliarNumeroFinalSerieFiscalSchema = (numeroFinalAtual: number) =>
    z
        .object({
            novoNumeroFinal: requiredIntSchema(numeroFinalAtual, NUMERO_MAX_INT32, 'Informe o novo número final.', 'Informe um número inteiro.', `O novo número final deve ser maior ou igual ao número final atual (${numeroFinalAtual}).`, 'Número final fora do intervalo suportado.')
        })
        .strict();

// R6 (`SerieFiscal.cs:173-181`): fim não pode ser anterior ao início -- a fábrica recebe o início de vigência
// da série selecionada.
export const encerrarVigenciaSerieFiscalSchema = (vigenciaInicioSerie: string) =>
    z
        .object({
            vigenciaFim: dateOnlySchema('Informe uma data de encerramento válida.')
        })
        .strict()
        .refine((values) => values.vigenciaFim >= vigenciaInicioSerie, { path: ['vigenciaFim'], message: 'A data de encerramento não pode ser anterior ao início da vigência da série.' });

// R9 (`AuditableEntity.cs:31-39`) + B-11: motivo obrigatório; 464 é o teto medido a partir de
// `HasMaxLength(500)` da auditoria (`AuditoriaEventoConfiguration.cs:17`) menos o prefixo fixo do evento.
export const inativarSerieFiscalSchema = z
    .object({
        motivo: z
            .string()
            .trim()
            .min(1, 'Informe o motivo da inativação.')
            .max(MOTIVO_INATIVACAO_MAX, `Informe no máximo ${MOTIVO_INATIVACAO_MAX} caracteres.`)
    })
    .strict();

// Resposta: sem `.strict()` -- campo aditivo do backend não pode quebrar a tela.
export const serieFiscalResponseSchema = z.object({
    id: z.string(),
    empresaId: z.string(),
    filialId: z.string().nullable().optional(),
    modeloDocumentoFiscalId: z.string(),
    numero: z.number(),
    numeroInicial: z.number(),
    numeroFinal: z.number(),
    proximoNumero: z.number(),
    vigenciaInicio: z.string(),
    vigenciaFim: z.string().nullable().optional(),
    ativa: z.boolean()
});

export const buracosSerieFiscalResponseSchema = z.object({
    serieFiscalId: z.string(),
    numero: z.number(),
    numeroInicial: z.number(),
    ultimoNumeroAlocado: z.number(),
    numerosSemDocumentoAutorizado: z.array(z.number())
});
