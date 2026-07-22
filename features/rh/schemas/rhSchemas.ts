import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { OrigemEventoRh, OrigemPonto, RegimeTrabalho, TipoAfastamento, TipoBeneficio, TipoEventoRh, TipoMarcacaoPonto } from '@/features/rh/types/rh.types';

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
const money = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).min(0, `${label} não pode ser negativo.`);
const positive = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).positive(`${label} deve ser maior que zero.`);
const optionalNumber = z.union([z.coerce.number(), z.null(), z.undefined()]).transform((value) => (typeof value === 'number' && Number.isFinite(value) ? value : null));
const optionalMoney = z.union([z.coerce.number(), z.null(), z.undefined()]).transform((value) => (typeof value === 'number' && Number.isFinite(value) ? value : null));
const optionalDate = z.union([z.date(), z.null(), z.undefined()]).transform((value) => (value instanceof Date ? value.toISOString() : null));
const requiredDate = (message: string) => z.union([z.date(), z.null(), z.undefined()]).refine((value) => value instanceof Date, message).transform((value) => (value as Date).toISOString());
const competencia = z.string().trim().regex(/^\d{6}$/, 'Competência deve estar no formato AAAAMM.');

export const admitirColaboradorSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    matricula: textRequired('Informe a matrícula.'),
    nome: textRequired('Informe o nome.'),
    cpf: textRequired('Informe o CPF.'),
    cargoId: requiredGuid('Cargo'),
    setorId: optionalGuid,
    jornadaId: optionalGuid,
    regime: z.nativeEnum(RegimeTrabalho),
    salarioBase: money('Salário base'),
    dataAdmissao: requiredDate('Informe a data de admissão.'),
    dataNascimento: optionalDate,
    email: nullableText,
    telefone: nullableText
});

export const atualizarColaboradorSchema = z.object({
    nome: textRequired('Informe o nome.'),
    cargoId: requiredGuid('Cargo'),
    setorId: optionalGuid,
    jornadaId: optionalGuid,
    salarioBase: money('Salário base'),
    email: nullableText,
    telefone: nullableText
});

export const desligarColaboradorSchema = z.object({
    dataDemissao: requiredDate('Informe a data de demissão.'),
    motivo: textRequired('Informe o motivo.')
});

export const criarJornadaSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    nome: textRequired('Informe o nome da jornada.'),
    descricao: nullableText,
    cargaHorariaSemanal: positive('Carga horária semanal'),
    toleranciaMinutos: optionalNumber
});

export const registrarPontoSchema = z.object({
    colaboradorId: requiredGuid('Colaborador'),
    data: optionalDate,
    tipo: z.nativeEnum(TipoMarcacaoPonto),
    origem: z.nativeEnum(OrigemPonto),
    observacao: nullableText
});

export const solicitarFeriasSchema = z.object({
    colaboradorId: requiredGuid('Colaborador'),
    dataInicio: requiredDate('Informe o início das férias.'),
    dataFim: requiredDate('Informe o fim das férias.'),
    observacao: nullableText
});

export const registrarAfastamentoSchema = z.object({
    colaboradorId: requiredGuid('Colaborador'),
    tipo: z.nativeEnum(TipoAfastamento),
    dataInicio: requiredDate('Informe o início do afastamento.'),
    dataFimPrevista: optionalDate,
    motivo: nullableText
});

export const encerrarAfastamentoSchema = z.object({ dataFimReal: optionalDate });

export const criarBeneficioSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    nome: textRequired('Informe o nome do benefício.'),
    tipo: z.nativeEnum(TipoBeneficio),
    valor: optionalMoney,
    descricao: nullableText
});

export const concederBeneficioSchema = z.object({
    colaboradorId: requiredGuid('Colaborador'),
    beneficioId: requiredGuid('Benefício'),
    dataInicio: requiredDate('Informe o início da concessão.'),
    valor: optionalMoney
});

export const encerrarConcessaoSchema = z.object({ dataFim: optionalDate });

export const registrarEventoRhSchema = z.object({
    colaboradorId: requiredGuid('Colaborador'),
    competencia,
    tipo: z.nativeEnum(TipoEventoRh),
    codigo: textRequired('Informe o código do evento.'),
    descricao: textRequired('Informe a descrição.'),
    valor: money('Valor'),
    referencia: nullableText,
    origem: z.nativeEnum(OrigemEventoRh)
});

export const motivoSchema = z.object({ motivo: textRequired('Informe o motivo.') });
