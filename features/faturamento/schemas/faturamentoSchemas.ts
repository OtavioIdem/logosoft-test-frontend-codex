import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { UFS_BRASIL } from '@/lib/constants/ufs';
import { AcaoRetomadaReversaoLeg, LegIntegracaoFaturamento, TipoDocumentoFiscal } from '@/features/faturamento/types/faturamento.types';

const requiredGuid = (label: string) => z.string().trim().refine(isValidGuid, `${label} deve ser selecionado corretamente.`);
const optionalGuid = z
    .union([z.string().trim().refine((value) => value === '' || isValidGuid(value), 'Selecione um registro válido.'), z.null(), z.undefined()])
    .transform((value) => (typeof value === 'string' && value.trim() === '' ? null : value ?? null));
const textRequired = (message: string) => z.string().trim().min(1, message);
const nullableText = z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
    if (value === null || value === undefined) return null;
    const normalized = value.trim();
    return normalized.length ? normalized : null;
});
const requiredDate = z.union([z.date(), z.null(), z.undefined()]).refine((value) => value instanceof Date, 'Informe a primeira data de vencimento.').transform((value) => (value as Date).toISOString());

// PrepararFaturamentoRequestValidator (FaturamentoValidators.cs:10-11): observação até 500 caracteres.
export const prepararFaturamentoSchema = z.object({
    pedidoVendaId: requiredGuid('Pedido de venda'),
    observacao: nullableText.refine((value) => value === null || value.length <= 500, 'A observação aceita até 500 caracteres.')
});

// D94: a UF continua texto, validada contra as 27 siglas. A UF útil é a que tem endpoint SEFAZ configurado,
// e nenhuma rota a lista (B-28); o backend só confere o tamanho (`FaturamentoValidators.cs:19`).
// b73 (emenda da D102): a lista mora em `lib/constants/ufs.ts`; o reexport mantém o import de quem já usa daqui.
export { UFS_BRASIL };
const ufsBrasil = new Set<string>(UFS_BRASIL);

const ufAutorizadoraSchema = z
    .string({ required_error: 'Informe a UF autorizadora.', invalid_type_error: 'Informe a UF autorizadora.' })
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => value.length > 0, 'Informe a UF autorizadora.')
    .refine((value) => value.length === 0 || ufsBrasil.has(value), 'Informe uma UF válida (sigla de 2 letras, por exemplo SP).');

// D94: o validator do Confirmar só aceita NFe ou NFCe (`FaturamentoValidators.cs:20-21`).
const tipoDocumentoConfirmarSchema = z.union([z.literal(TipoDocumentoFiscal.NFe), z.literal(TipoDocumentoFiscal.NFCe)], {
    errorMap: () => ({ message: 'O tipo de documento deve ser NF-e ou NFC-e.' })
});

// ConfirmarFaturamentoRequestValidator (FaturamentoValidators.cs:15-29). `cfopPadrao` não existe mais aqui
// (D94) e o `.strict()` do request o recusa se alguém tentar mandá-lo.
const confirmarFaturamentoCamposSchema = z.object({
    ufAutorizadora: ufAutorizadoraSchema,
    tipoDocumento: tipoDocumentoConfirmarSchema,
    serie: textRequired('Informe a série.').max(20, 'A série aceita até 20 caracteres.'),
    numero: textRequired('Informe o número.').max(40, 'O número aceita até 40 caracteres.'),
    naturezaOperacaoId: optionalGuid,
    unidadeComercialPadrao: textRequired('Informe a unidade comercial padrão.').max(20, 'A unidade comercial aceita até 20 caracteres.'),
    validarDadosFiscaisProduto: z.boolean().default(true),
    condicaoPagamentoId: optionalGuid,
    primeiraDataVencimentoContaReceber: requiredDate
});

// D91 (emenda do QA-01): a natureza é exigida SEMPRE, com ou sem a validação fiscal. Com a validação ligada, o
// backend recusa no leg 1 com `CfopNaturezaOperacaoNaoInformada` (GerarNotaFiscalPedidoVendaUseCase.cs:165-167);
// desligada, a nota nasce sem CFOP (:169-172) e fica presa ao pedido, porque a trava de nota por origem não
// filtra status (B-27).
const exigirNatureza = (values: { naturezaOperacaoId: string | null }, context: z.RefinementCtx) => {
    if (!values.naturezaOperacaoId) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['naturezaOperacaoId'], message: 'Selecione a natureza de operação.' });
    }
};

/** Validação do formulário do diálogo (sem o `correlationId`, que o diálogo gera). */
export const confirmarFaturamentoFormSchema = confirmarFaturamentoCamposSchema.superRefine(exigirNatureza);

/** Request do Confirmar: o formulário mais o `correlationId` (D92; `FaturamentoValidators.cs:27`, até 100). */
export const confirmarFaturamentoSchema = confirmarFaturamentoCamposSchema
    .extend({ correlationId: z.string().trim().min(1, 'Identificador de correlação ausente.').max(100, 'Identificador de correlação acima de 100 caracteres.') })
    .strict()
    .superRefine(exigirNatureza);

export const cancelarFaturamentoSchema = z.object({ motivo: textRequired('Informe o motivo.').max(300, 'O motivo aceita até 300 caracteres.') });

// RetomarReversaoLegRequestValidator (FaturamentoValidators.cs:44-52): motivo obrigatório, até 500 caracteres.
export const retomarReversaoLegSchema = z
    .object({
        leg: z.nativeEnum(LegIntegracaoFaturamento, { required_error: 'Leg inválido.', invalid_type_error: 'Leg inválido.' }),
        acao: z.nativeEnum(AcaoRetomadaReversaoLeg, { required_error: 'Selecione a ação.', invalid_type_error: 'Selecione uma ação válida.' }),
        motivo: z.string().trim().min(1, 'Informe o motivo.').max(500, 'O motivo aceita até 500 caracteres.')
    })
    .strict();
