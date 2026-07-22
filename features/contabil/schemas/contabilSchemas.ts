import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { NaturezaConta, TipoContaContabil, TipoEventoContabilizacao, TipoPartida } from '@/features/contabil/types/contabil.types';

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
const positive = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).positive(`${label} deve ser maior que zero.`);
const requiredDate = (message: string) => z.union([z.date(), z.null(), z.undefined()]).refine((value) => value instanceof Date, message).transform((value) => (value as Date).toISOString());

export const criarContaContabilSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    codigo: textRequired('Informe o código da conta.'),
    nome: textRequired('Informe o nome da conta.'),
    tipo: z.nativeEnum(TipoContaContabil),
    natureza: z.nativeEnum(NaturezaConta),
    analitica: z.boolean(),
    contaPaiId: optionalGuid
});

export const abrirPeriodoSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    ano: z.coerce.number().int().min(2000, 'Ano inválido.').max(2100, 'Ano inválido.'),
    mes: z.coerce.number().int().min(1, 'Mês inválido.').max(12, 'Mês inválido.')
});

export const fecharPeriodoSchema = z.object({ observacao: nullableText });

const partidaSchema = z.object({
    contaContabilId: requiredGuid('Conta contábil'),
    tipo: z.nativeEnum(TipoPartida),
    valor: positive('Valor da partida'),
    centroCustoId: optionalGuid,
    historico: nullableText
});

export const criarLancamentoSchema = z
    .object({
        empresaId: requiredGuid('Empresa'),
        filialId: optionalGuid,
        data: requiredDate('Informe a data do lançamento.'),
        historico: textRequired('Informe o histórico.'),
        partidas: z.array(partidaSchema).min(2, 'Um lançamento exige ao menos duas partidas.')
    })
    .refine((value) => {
        const debito = value.partidas.filter((p) => Number(p.tipo) === TipoPartida.Debito).reduce((sum, p) => sum + p.valor, 0);
        const credito = value.partidas.filter((p) => Number(p.tipo) === TipoPartida.Credito).reduce((sum, p) => sum + p.valor, 0);
        return Math.abs(debito - credito) < 0.005;
    }, { message: 'A soma dos débitos deve ser igual à soma dos créditos.', path: ['partidas'] });

export const estornarLancamentoSchema = z.object({ motivo: textRequired('Informe o motivo do estorno.') });

export const criarRegraSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    descricao: textRequired('Informe a descrição.'),
    tipoEvento: z.nativeEnum(TipoEventoContabilizacao),
    origemFinanceira: nullableText,
    contaDebitoId: requiredGuid('Conta de débito'),
    contaCreditoId: requiredGuid('Conta de crédito')
});
