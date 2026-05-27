import { z } from 'zod';
import { OrigemNotaFiscal, TipoContingenciaFiscal, TipoDocumentoFiscal, TipoOperacaoFiscal, TipoServicoTransmissaoFiscal, TipoXmlFiscal } from '@/types/erp';
import { isValidGuid } from '@/lib/http/requestUtils';

const guidSchema = z.string().refine(isValidGuid, 'Informe um identificador válido.');
const optionalGuidSchema = z.preprocess((value) => (value === '' ? null : value), z.union([guidSchema, z.null()]).optional());
const nullableText = z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().nullable().optional());
const requiredText = (message: string, max = 500) => z.string().trim().min(1, message).max(max, `Informe no máximo ${max} caracteres.`);
const moneySchema = z.coerce.number().min(0, 'O valor não pode ser negativo.');
const quantitySchema = z.coerce.number().positive('A quantidade deve ser maior que zero.');
const ufSchema = z.string().trim().length(2, 'Informe a UF com 2 letras.').transform((value) => value.toUpperCase());
const nfeNfceSchema = z.coerce.number().refine((value) => value === TipoDocumentoFiscal.NFe || value === TipoDocumentoFiscal.NFCe, 'Nesta etapa são suportadas NF-e e NFC-e.');
const correlationIdSchema = z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(120, 'Correlation ID deve ter no máximo 120 caracteres.').nullable().optional());
const schemaSetNameSchema = z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(120, 'Schema set deve ter no máximo 120 caracteres.').nullable().optional());
const xmlSchema = z.string().max(2_000_000, 'XML deve ter no máximo 2.000.000 caracteres.');
const requiredXmlSchema = z.string().trim().min(1, 'Informe o XML.').max(2_000_000, 'XML deve ter no máximo 2.000.000 caracteres.');
const isoDateTimeSchema = (message: string) =>
    z.preprocess(
        (value) => {
            if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : '';
            if (typeof value === 'string') return value.trim();
            return value;
        },
        z.string().min(1, message)
    );

export const criarNotaFiscalSchema = z.object({
    empresaId: guidSchema,
    filialId: optionalGuidSchema,
    tipoDocumento: nfeNfceSchema,
    tipoOperacao: z.coerce.number().default(TipoOperacaoFiscal.Venda),
    origem: z.coerce.number().default(OrigemNotaFiscal.Manual),
    origemId: optionalGuidSchema,
    serie: requiredText('Informe a série.', 20),
    numero: requiredText('Informe o número.', 40),
    dataEmissao: isoDateTimeSchema('Informe a data de emissão.'),
    naturezaOperacaoId: optionalGuidSchema,
    pessoaId: optionalGuidSchema,
    observacao: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(500).nullable().optional())
});

export const gerarNotaFiscalPedidoVendaSchema = z.object({
    pedidoVendaId: guidSchema,
    tipoDocumento: nfeNfceSchema,
    serie: requiredText('Informe a série.', 20),
    numero: requiredText('Informe o número.', 40),
    naturezaOperacaoId: optionalGuidSchema,
    cfopPadrao: nullableText,
    unidadeComercialPadrao: requiredText('Informe a unidade comercial padrão.', 20),
    validarDadosFiscaisProduto: z.boolean(),
    observacao: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(500).nullable().optional())
}).superRefine((value, ctx) => {
    if (value.validarDadosFiscaisProduto && !value.cfopPadrao) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cfopPadrao'], message: 'Informe o CFOP quando a validação fiscal do produto estiver ativa.' });
    }
});

export const adicionarItemNotaFiscalSchema = z.object({
    produtoId: optionalGuidSchema,
    codigoItem: requiredText('Informe o código do item.', 80),
    descricao: requiredText('Informe a descrição.', 300),
    ncm: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(20).nullable().optional()),
    cfop: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(20).nullable().optional()),
    unidadeComercial: requiredText('Informe a unidade comercial.', 20),
    quantidade: quantitySchema,
    valorUnitario: moneySchema,
    valorDesconto: moneySchema,
    observacao: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(500).nullable().optional())
}).refine((value) => value.valorDesconto <= value.quantidade * value.valorUnitario, { path: ['valorDesconto'], message: 'O desconto não pode ultrapassar o valor bruto do item.' });

export const adicionarImpostoNotaFiscalSchema = z.object({
    itemNotaFiscalId: optionalGuidSchema,
    nome: requiredText('Informe o nome do imposto.', 40),
    cstCsosn: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(20).nullable().optional()),
    baseCalculo: moneySchema,
    aliquota: moneySchema,
    valor: moneySchema,
    observacao: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(500).nullable().optional())
});

export const gerarXmlEnvioSchema = z.object({
    armazenarXml: z.boolean(),
    validarSchema: z.boolean(),
    schemaSetName: schemaSetNameSchema
});

export const assinarXmlEnvioSchema = z.object({
    certificateThumbprint: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(120).nullable().optional()),
    xmlEnvio: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), xmlSchema.nullable().optional()),
    armazenarXmlAssinado: z.boolean(),
    validarSchemaAntesAssinatura: z.boolean(),
    schemaSetName: schemaSetNameSchema
});

export const transmitirNotaFiscalSefazSchema = z.object({
    ufAutorizadora: ufSchema,
    servico: z.coerce.number().refine((value) => Object.values(TipoServicoTransmissaoFiscal).includes(value as TipoServicoTransmissaoFiscal), 'Serviço SEFAZ inválido.'),
    xmlEnvioAssinado: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), xmlSchema.nullable().optional()),
    validarSchemaAntesTransmissao: z.boolean(),
    schemaSetName: schemaSetNameSchema,
    correlationId: correlationIdSchema
});

export const reprocessarNotaFiscalSefazSchema = transmitirNotaFiscalSefazSchema.extend({
    logIntegracaoFiscalId: optionalGuidSchema,
    correlationIdOriginal: nullableText,
    correlationId: requiredText('Informe o novo correlation ID.', 120),
    motivo: requiredText('Informe o motivo do reprocessamento.', 500)
}).superRefine((value, ctx) => {
    if (!value.logIntegracaoFiscalId && !value.correlationIdOriginal) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correlationIdOriginal'], message: 'Informe o log de integração ou o correlation ID original.' });
    }
    if (value.correlationIdOriginal && value.correlationIdOriginal === value.correlationId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correlationId'], message: 'O correlation ID do reprocessamento deve ser diferente do original.' });
    }
});

export const consultarProtocoloSefazSchema = z.object({
    ufAutorizadora: ufSchema,
    servico: z.coerce.number().refine((value) => value === TipoServicoTransmissaoFiscal.ConsultaProtocolo || value === TipoServicoTransmissaoFiscal.ConsultaRetornoAutorizacao, 'Use consulta de protocolo ou consulta de retorno.'),
    xmlConsultaAssinado: requiredXmlSchema,
    validarSchemaAntesConsulta: z.boolean(),
    schemaSetName: schemaSetNameSchema,
    aplicarReconciliacaoLocal: z.boolean(),
    correlationId: correlationIdSchema
});

export const statusServicoSefazSchema = z.object({
    empresaId: guidSchema,
    filialId: optionalGuidSchema,
    tipoDocumento: nfeNfceSchema,
    ufAutorizadora: ufSchema,
    xmlStatusServico: requiredXmlSchema,
    validarSchemaAntesConsulta: z.boolean(),
    schemaSetName: schemaSetNameSchema,
    correlationId: correlationIdSchema
});

export const contingenciaFiscalSchema = z.object({
    empresaId: optionalGuidSchema,
    filialId: optionalGuidSchema,
    tipoDocumento: nfeNfceSchema.optional(),
    ufAutorizadora: ufSchema,
    tipoContingencia: z.coerce.number().default(TipoContingenciaFiscal.OperacionalInterna),
    motivo: requiredText('Informe o motivo da contingência.', 500),
    exigirStatusServicoIndisponivelRecente: z.boolean(),
    janelaStatusServicoMinutos: z.coerce.number().int().positive('Informe uma janela positiva.'),
    correlationId: correlationIdSchema
});

export const avaliarContingenciaFiscalSchema = contingenciaFiscalSchema.extend({
    empresaId: guidSchema,
    tipoDocumento: nfeNfceSchema
});

export const registrarRejeicaoNotaFiscalSchema = z.object({
    codigoRejeicao: requiredText('Informe o código da rejeição.', 40),
    mensagemRejeicao: requiredText('Informe a mensagem da rejeição.', 500)
});

export const cancelarNotaFiscalSchema = z.object({
    motivo: requiredText('Informe o motivo.', 500),
    protocoloCancelamento: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(80).nullable().optional()),
    xmlCancelamento: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), xmlSchema.nullable().optional())
});

export const cancelarNotaFiscalSefazSchema = z.object({
    ufAutorizadora: ufSchema,
    motivo: requiredText('Informe o motivo.', 500),
    xmlEventoAssinado: requiredXmlSchema,
    validarSchemaAntesTransmissao: z.boolean(),
    schemaSetName: schemaSetNameSchema,
    correlationId: correlationIdSchema
});

export const emitirCartaCorrecaoSefazSchema = z.object({
    ufAutorizadora: ufSchema,
    textoCorrecao: requiredText('Informe o texto da correção.', 1000),
    xmlEventoAssinado: requiredXmlSchema,
    validarSchemaAntesTransmissao: z.boolean(),
    schemaSetName: schemaSetNameSchema,
    correlationId: correlationIdSchema
});

export const inutilizarNumeracaoSefazSchema = z.object({
    empresaId: guidSchema,
    filialId: optionalGuidSchema,
    tipoDocumento: nfeNfceSchema,
    serie: requiredText('Informe a série.', 20),
    numeroInicial: z.coerce.number().int().positive('Número inicial inválido.'),
    numeroFinal: z.coerce.number().int().positive('Número final inválido.'),
    motivo: requiredText('Informe o motivo.', 500),
    ufAutorizadora: ufSchema,
    xmlInutilizacaoAssinado: requiredXmlSchema,
    validarSchemaAntesTransmissao: z.boolean(),
    schemaSetName: schemaSetNameSchema,
    correlationId: correlationIdSchema
}).refine((value) => value.numeroFinal >= value.numeroInicial, { path: ['numeroFinal'], message: 'O número final deve ser maior ou igual ao número inicial.' });

export const gerarDanfeNotaFiscalSchema = z.object({ correlationId: correlationIdSchema });

export const baixarEstoqueNotaFiscalSchema = z.object({
    motivo: requiredText('Informe o motivo da baixa de estoque.', 500),
    documento: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(80).nullable().optional()),
    correlationId: correlationIdSchema
});

export const gerarContaReceberNotaFiscalSchema = z.object({
    condicaoPagamentoId: optionalGuidSchema,
    primeiraDataVencimento: isoDateTimeSchema('Informe o vencimento.'),
    documento: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(60).nullable().optional()),
    observacao: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(500).nullable().optional()),
    correlationId: correlationIdSchema
});

export const exportarNotasFiscaisCsvSchema = z.object({
    motivo: requiredText('Informe o motivo da exportação.', 500),
    limite: z.coerce.number().int().min(1).max(5000).default(1000)
});

export const armazenarXmlNotaFiscalSchema = z.object({
    tipo: z.coerce.number().default(TipoXmlFiscal.Envio),
    conteudoXml: requiredXmlSchema,
    protocolo: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(80).nullable().optional()),
    chaveAcesso: z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(80).nullable().optional())
});
