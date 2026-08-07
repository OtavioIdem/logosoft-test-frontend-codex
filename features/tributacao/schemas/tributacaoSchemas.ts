import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import {
    Crt,
    FinalidadeNaturezaOperacao,
    IndicadorContribuinteIcms,
    ModalidadeBaseCalculoIcms,
    ModalidadeBaseCalculoIcmsSt,
    MunicipioIncidenciaIss,
    NaturezaTomadorServico,
    RegimePisCofins,
    RegimeTributario,
    TipoCalculoIpi,
    TipoCalculoPisCofins,
    TipoCfop,
    TipoItemSped
} from '@/features/tributacao/types/tributacao.types';

const guidSchema = z.string().refine(isValidGuid, 'Informe um identificador válido.');
const optionalGuidSchema = z.preprocess((value) => (value === '' ? null : value), z.union([guidSchema, z.null()]).optional());
const nullableText = z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().nullable().optional());
const requiredText = (message: string, max = 200) => z.string().trim().min(1, message).max(max, `Informe no máximo ${max} caracteres.`);
const nonNegative = (label: string) => z.coerce.number().min(0, `${label} não pode ser negativo.`);
const percentual = (label: string) => z.coerce.number().min(0, `${label} não pode ser negativo.`).max(100, `${label} deve estar entre 0 e 100.`);

/**
 * FCP é **anulável por semântica**: `null` = "não informado, usa o percentual geral da UF"; `0` = "zero
 * deliberado, FCP não devido para este produto". Por isso o campo aceita vazio e o vazio vira `null` —
 * enviar `0` para dizer "não informado" mudaria o cálculo.
 */
const percentualAnulavel = (label: string) => z.preprocess((value) => (value === '' || value === undefined ? null : value), z.union([z.null(), percentual(label)]));

const ufSchema = z
    .string()
    .trim()
    .length(2, 'Informe a UF com 2 letras.')
    .transform((value) => value.toUpperCase());

const ufCuringaSchema = z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.union([ufSchema, z.null()]).optional());

/** `DateOnly` do backend: `yyyy-MM-dd`, sem componente de hora. */
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

/** Converte para `yyyy-MM-dd` no fuso local — `toISOString()` deslocaria a data em fusos negativos. */
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

const enumValue = <T extends Record<string, unknown>>(enumObject: T, message: string) => {
    const valores = new Set(Object.values(enumObject).filter((value): value is number => typeof value === 'number'));
    return z.coerce.number().refine((value) => valores.has(value), message);
};

/**
 * `z.null()` vem **primeiro** de propósito: `z.coerce.number()` converte `null` em `0`, e `0` é valor
 * legítimo de alguns enums (`RegimeTributario.SimplesNacional`). Invertendo a ordem, o curinga viraria
 * silenciosamente "Simples Nacional".
 */
const enumValueNullable = <T extends Record<string, unknown>>(enumObject: T, message: string) => z.preprocess((value) => (value === '' || value === undefined ? null : value), z.union([z.null(), enumValue(enumObject, message)]));

/* ------------------------------------------------------------------------------------------------ */
/* Simulação                                                                                          */
/* ------------------------------------------------------------------------------------------------ */

export const itemTributavelSchema = z.object({
    identificadorItem: nullableText,
    origemMercadoria: z
        .string()
        .trim()
        .regex(/^[0-8]$/, 'Informe a origem da mercadoria (Tabela A, 0 a 8).'),
    tipoItem: enumValue(TipoItemSped, 'Selecione o tipo do item.'),
    ncmId: optionalGuidSchema,
    cfopId: optionalGuidSchema,
    ncmCodigo: nullableText,
    cestCodigo: nullableText,
    cfopCodigo: nullableText,
    quantidade: z.coerce.number().positive('A quantidade não pode ser zero.'),
    valorUnitario: nonNegative('O valor unitário'),
    valorProduto: nonNegative('O valor do produto')
});

/**
 * Validação local do simulador. Bloqueia o que o contrato define como erro de preenchimento — nenhum item,
 * quantidade zero, desconto total maior que a soma dos produtos, UF fora de 2 letras, data ausente, município
 * ausente quando há ISS — para a tela não gastar um round-trip só para receber
 * `FISCAL_TRIBUTACAO_ITEM_INVALIDO`.
 */
export const simularTributacaoSchema = z
    .object({
        empresaId: guidSchema,
        filialId: optionalGuidSchema,
        tipoOperacao: enumValue(TipoCfop, 'Selecione o tipo de operação.'),
        regimeEmpresa: enumValue(RegimeTributario, 'Selecione o regime tributário.'),
        crtEmitente: enumValueNullable(Crt, 'Selecione um CRT válido.'),
        ufOrigem: ufSchema,
        ufDestino: z
            .string()
            .trim()
            .length(2, 'Informe a UF de destino com 2 letras (ou EX para exterior).')
            .transform((value) => value.toUpperCase()),
        codigoMunicipioOrigem: nullableText,
        codigoMunicipioDestino: nullableText,
        indicadorContribuinteDestinatario: enumValue(IndicadorContribuinteIcms, 'Selecione o indicador de contribuinte do destinatário.'),
        consumidorFinal: z.boolean(),
        dataOperacao: dateOnlySchema('Informe a data da operação.'),
        destinatarioContribuinteIpi: z.boolean(),
        emitenteContribuinteIpi: z.boolean(),
        finalidade: enumValue(FinalidadeNaturezaOperacao, 'Selecione a finalidade da operação.').default(FinalidadeNaturezaOperacao.Normal),
        naturezaTomadorServico: enumValue(NaturezaTomadorServico, 'Selecione a natureza do tomador do serviço.').default(NaturezaTomadorServico.NaoAplicavel),
        valorFreteTotal: nonNegative('O frete'),
        valorSeguroTotal: nonNegative('O seguro'),
        valorOutrasDespesasTotal: nonNegative('As outras despesas'),
        valorDescontoTotal: nonNegative('O desconto'),
        itens: z.array(itemTributavelSchema).min(1, 'Informe ao menos um item.')
    })
    .superRefine((value, ctx) => {
        const somaProdutos = value.itens.reduce((total, item) => total + item.valorProduto, 0);
        if (value.valorDescontoTotal > somaProdutos) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['valorDescontoTotal'], message: 'O desconto do documento não pode ultrapassar a soma dos valores de produto.' });
        }

        /*
         * `tipoItem` decide sozinho o ramo mercadoria × serviço, e item de serviço sempre apura ISS — que o
         * motor resolve pelo município de incidência. O contrato marca os dois códigos como exigidos quando há
         * ISS; sem eles o cálculo não sai, e barrar aqui evita o round-trip com erro sem campo apontado.
         */
        if (!value.itens.some((item) => item.tipoItem === TipoItemSped.Servicos)) return;

        if (!value.codigoMunicipioOrigem) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['codigoMunicipioOrigem'], message: 'Informe o código IBGE do município de origem: o documento tem item de serviço e o ISS depende dele.' });
        }

        if (!value.codigoMunicipioDestino) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['codigoMunicipioDestino'], message: 'Informe o código IBGE do município de destino: o documento tem item de serviço e o ISS depende dele.' });
        }
    });

/* ------------------------------------------------------------------------------------------------ */
/* Regras fiscais                                                                                     */
/* ------------------------------------------------------------------------------------------------ */

export const regraIcmsSchema = z
    .object({
        cstIcmsCodigo: nullableText,
        csosnCodigo: nullableText,
        modalidadeBaseCalculo: enumValue(ModalidadeBaseCalculoIcms, 'Selecione a modalidade da base de cálculo.'),
        aliquota: percentual('A alíquota do ICMS'),
        percentualReducaoBase: percentual('A redução da base'),
        aliquotaInternaDestino: percentual('A alíquota interna de destino'),
        modalidadeBaseCalculoSt: enumValue(ModalidadeBaseCalculoIcmsSt, 'Selecione a modalidade da base de ST.'),
        mva: percentual('A MVA'),
        mvaAjustada: percentual('A MVA ajustada'),
        percentualReducaoBaseSt: percentual('A redução da base de ST'),
        percentualFcp: percentualAnulavel('O percentual de FCP'),
        percentualFcpSt: percentualAnulavel('O percentual de FCP-ST'),
        percentualDiferimento: percentual('O percentual de diferimento'),
        percentualCreditoSimplesNacional: percentual('O crédito do Simples Nacional'),
        codigoBeneficioFiscal: nullableText,
        baseDuplaDifal: z.boolean()
    })
    .superRefine((value, ctx) => {
        if (!value.cstIcmsCodigo && !value.csosnCodigo) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cstIcmsCodigo'], message: 'Informe o CST do ICMS ou o CSOSN.' });
        }
    });

export const regraIpiSchema = z.object({
    cstIpiCodigo: requiredText('Informe o CST do IPI.', 3),
    tipoCalculo: enumValue(TipoCalculoIpi, 'Selecione o tipo de cálculo do IPI.'),
    aliquota: percentual('A alíquota do IPI'),
    valorPorUnidade: nonNegative('O valor por unidade do IPI'),
    codigoEnquadramento: z
        .string()
        .trim()
        .regex(/^\d{3}$/, 'O código de enquadramento (cEnq) do IPI deve ter 3 dígitos.'),
    indicadorCreditaEntrada: z.boolean()
});

export const regraPisCofinsSchema = z.object({
    cstPisCodigo: requiredText('Informe o CST do PIS.', 2),
    cstCofinsCodigo: requiredText('Informe o CST da COFINS.', 2),
    regime: enumValue(RegimePisCofins, 'Selecione o regime de PIS/COFINS.'),
    aliquotaPis: percentual('A alíquota do PIS'),
    aliquotaCofins: percentual('A alíquota da COFINS'),
    tipoCalculo: enumValue(TipoCalculoPisCofins, 'Selecione o tipo de cálculo do PIS/COFINS.'),
    valorPorUnidadePis: nonNegative('O valor por unidade do PIS'),
    valorPorUnidadeCofins: nonNegative('O valor por unidade da COFINS'),
    indicadorCreditaEntrada: z.boolean(),
    excluirIcmsDaBase: z.boolean()
});

export const regraIssSchema = z.object({
    codigoServicoLc116: requiredText('Informe o código de serviço da LC 116.', 20),
    aliquota: percentual('A alíquota do ISS'),
    municipioIncidencia: enumValue(MunicipioIncidenciaIss, 'Selecione o município de incidência do ISS.'),
    indicadorRetido: z.boolean(),
    percentualReducaoBase: percentual('A redução da base do ISS')
});

export const regraRetencaoSchema = z.object({
    irrfAliquota: percentual('A alíquota do IRRF'),
    irrfBaseMinima: nonNegative('A base mínima do IRRF'),
    irrfValorMinimoRecolhimento: nonNegative('O valor mínimo de recolhimento do IRRF'),
    inssAliquota: percentual('A alíquota do INSS'),
    csllAliquota: percentual('A alíquota da CSLL'),
    pisRetidoAliquota: percentual('A alíquota do PIS retido'),
    cofinsRetidoAliquota: percentual('A alíquota da COFINS retida'),
    pccMinimoDispensa: nonNegative('O mínimo de dispensa do PCC')
});

const blocosRegraSchema = z.object({
    icms: regraIcmsSchema.nullable().optional().default(null),
    ipi: regraIpiSchema.nullable().optional().default(null),
    pisCofins: regraPisCofinsSchema.nullable().optional().default(null),
    iss: regraIssSchema.nullable().optional().default(null),
    retencao: regraRetencaoSchema.nullable().optional().default(null)
});

/** Campos anuláveis da chave são **curinga** — `null` significa "vale para qualquer valor", não "vazio". */
const chaveRegraSchema = z.object({
    descricao: requiredText('Informe a descrição da regra.', 200),
    tipoOperacao: enumValue(TipoCfop, 'Selecione o tipo de operação.'),
    ufOrigem: ufCuringaSchema,
    ufDestino: ufCuringaSchema,
    regimeEmpresa: enumValueNullable(RegimeTributario, 'Selecione um regime válido.'),
    indicadorContribuinte: enumValueNullable(IndicadorContribuinteIcms, 'Selecione um indicador válido.'),
    consumidorFinal: z.preprocess((value) => (value === '' || value === undefined ? null : value), z.union([z.boolean(), z.null()])),
    ncmId: optionalGuidSchema,
    grupoProdutoId: optionalGuidSchema,
    cfopId: optionalGuidSchema,
    prioridade: z.coerce.number().int('A prioridade deve ser um número inteiro.').min(0, 'A prioridade não pode ser negativa.'),
    vigenciaInicio: dateOnlySchema('Informe o início da vigência.'),
    vigenciaFim: dateOnlyNullableSchema
});

const validarVigencia = (value: { vigenciaInicio: string; vigenciaFim?: string | null }, ctx: z.RefinementCtx) => {
    if (value.vigenciaFim && value.vigenciaFim < value.vigenciaInicio) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vigenciaFim'], message: 'O fim da vigência não pode ser anterior ao início.' });
    }
};

export const criarRegraFiscalSchema = z.object({ empresaId: guidSchema, filialId: optionalGuidSchema }).merge(chaveRegraSchema).merge(blocosRegraSchema).superRefine(validarVigencia);

export const atualizarRegraFiscalSchema = chaveRegraSchema.merge(blocosRegraSchema).superRefine(validarVigencia);

/* ------------------------------------------------------------------------------------------------ */
/* Exceções e benefícios                                                                              */
/* ------------------------------------------------------------------------------------------------ */

export const excecaoIcmsSchema = z
    .object({
        cstIcmsCodigo: nullableText,
        csosnCodigo: nullableText,
        aliquota: percentual('A alíquota do ICMS'),
        percentualReducaoBase: percentual('A redução da base'),
        percentualDiferimento: percentual('O percentual de diferimento'),
        percentualFcp: percentualAnulavel('O percentual de FCP'),
        percentualCreditoSimplesNacional: percentual('O crédito do Simples Nacional')
    })
    .superRefine((value, ctx) => {
        if (!value.cstIcmsCodigo && !value.csosnCodigo) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cstIcmsCodigo'], message: 'Informe o CST do ICMS ou o CSOSN.' });
        }
    });

export const excecaoPisCofinsSchema = z.object({
    cstPisCodigo: requiredText('Informe o CST do PIS.', 2),
    cstCofinsCodigo: requiredText('Informe o CST da COFINS.', 2),
    aliquotaPis: percentual('A alíquota do PIS'),
    aliquotaCofins: percentual('A alíquota da COFINS'),
    tipoCalculo: enumValue(TipoCalculoPisCofins, 'Selecione o tipo de cálculo do PIS/COFINS.'),
    valorPorUnidadePis: nonNegative('O valor por unidade do PIS'),
    valorPorUnidadeCofins: nonNegative('O valor por unidade da COFINS'),
    indicadorCreditaEntrada: z.boolean(),
    excluirIcmsDaBase: z.boolean()
});

const corpoExcecaoSchema = z.object({
    descricao: requiredText('Informe a descrição da exceção.', 200),
    uf: ufSchema,
    codigoBeneficio: nullableText,
    vigenciaInicio: dateOnlySchema('Informe o início da vigência.'),
    vigenciaFim: dateOnlyNullableSchema,
    icms: excecaoIcmsSchema.nullable().optional().default(null),
    pisCofins: excecaoPisCofinsSchema.nullable().optional().default(null)
});

/** Exceção sem nenhum bloco é cadastro fantasma — o backend rejeita, então a tela barra antes. */
const validarExcecao = (value: { vigenciaInicio: string; vigenciaFim?: string | null; icms?: unknown; pisCofins?: unknown }, ctx: z.RefinementCtx) => {
    validarVigencia(value, ctx);
    if (!value.icms && !value.pisCofins) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['icms'], message: 'Informe ao menos um bloco (ICMS ou PIS/COFINS) na exceção.' });
    }
};

export const criarExcecaoFiscalSchema = z.object({ empresaId: guidSchema, filialId: optionalGuidSchema }).merge(corpoExcecaoSchema).superRefine(validarExcecao);

export const atualizarExcecaoFiscalSchema = corpoExcecaoSchema.superRefine(validarExcecao);

export const criarExcecaoFiscalNcmSchema = z.object({ empresaId: guidSchema, filialId: optionalGuidSchema, ncmId: guidSchema }).merge(corpoExcecaoSchema).superRefine(validarExcecao);

export const atualizarExcecaoFiscalNcmSchema = z.object({ ncmId: guidSchema }).merge(corpoExcecaoSchema).superRefine(validarExcecao);

export const inativarRegistroFiscalSchema = z.object({ motivo: requiredText('Informe o motivo da inativação.', 500) });
