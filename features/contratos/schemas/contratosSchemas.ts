import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { PeriodicidadeContrato, TipoFaturamentoContrato } from '@/features/contratos/types/contratos.types';

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
const optionalMoney = z.union([z.coerce.number().min(0, 'Valor não pode ser negativo.'), z.null(), z.undefined()]).transform((value) => (typeof value === 'number' && Number.isFinite(value) ? value : null));
const requiredDate = (message: string) => z.union([z.date(), z.null(), z.undefined()]).refine((value) => value instanceof Date, message).transform((value) => (value as Date).toISOString());
const optionalDate = z.union([z.date(), z.null(), z.undefined()]).transform((value) => (value instanceof Date ? value.toISOString() : null));
const diaVencimento = z.coerce.number({ invalid_type_error: 'Dia de vencimento deve ser numérico.' }).int('Dia de vencimento inválido.').min(1, 'Dia de vencimento entre 1 e 28.').max(28, 'Dia de vencimento entre 1 e 28.');

export const criarContratoSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    numero: textRequired('Informe o número do contrato.'),
    clienteId: requiredGuid('Cliente'),
    descricao: textRequired('Informe a descrição.'),
    tipoFaturamento: z.nativeEnum(TipoFaturamentoContrato),
    periodicidade: z.nativeEnum(PeriodicidadeContrato),
    dataInicio: requiredDate('Informe a data de início.'),
    dataFim: optionalDate,
    valorFixo: optionalMoney,
    diaVencimento,
    franquia: optionalMoney,
    valorExcedente: optionalMoney,
    responsavelId: optionalGuid
});

export const reajustarContratoSchema = z.object({
    percentual: z.coerce.number({ invalid_type_error: 'Percentual deve ser numérico.' }).gt(0, 'Percentual deve ser maior que zero.')
});

export const renovarContratoSchema = z.object({
    novaDataFim: requiredDate('Informe a nova data de fim.')
});

export const gerarFaturamentoSchema = z.object({
    ano: z.coerce.number().int().min(2000, 'Ano inválido.').max(2100, 'Ano inválido.'),
    mes: z.coerce.number().int().min(1, 'Mês inválido.').max(12, 'Mês inválido.'),
    consumoRegistrado: optionalMoney
});

export const motivoSchema = z.object({ motivo: textRequired('Informe o motivo.') });
