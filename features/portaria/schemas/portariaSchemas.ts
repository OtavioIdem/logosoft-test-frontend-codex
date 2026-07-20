import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { GravidadeOcorrencia, TipoAcesso, TipoDocumentoAcesso, TipoOcorrenciaAcesso } from '@/features/portaria/types/portaria.types';

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
const optionalDate = z.union([z.date(), z.null(), z.undefined()]).transform((value) => (value instanceof Date ? value.toISOString() : null));
const requiredDate = (message: string) => z.union([z.date(), z.null(), z.undefined()]).refine((value) => value instanceof Date, message).transform((value) => (value as Date).toISOString());

export const criarPreAutorizacaoSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    nomeVisitante: textRequired('Informe o nome do visitante.'),
    documentoTipo: z.nativeEnum(TipoDocumentoAcesso),
    documentoNumero: textRequired('Informe o número do documento.'),
    tipoAcesso: z.nativeEnum(TipoAcesso),
    destino: textRequired('Informe o destino.'),
    validadeInicio: requiredDate('Informe o início da validade.'),
    validadeFim: requiredDate('Informe o fim da validade.'),
    placaVeiculo: nullableText,
    motivo: nullableText
});

export const registrarEntradaSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    preAutorizacaoId: optionalGuid,
    nomeVisitante: textRequired('Informe o nome do visitante.'),
    documentoTipo: z.nativeEnum(TipoDocumentoAcesso),
    documentoNumero: textRequired('Informe o número do documento.'),
    tipoAcesso: z.nativeEnum(TipoAcesso),
    destino: textRequired('Informe o destino.'),
    motivo: nullableText,
    placaVeiculo: nullableText,
    dataEntrada: optionalDate
});

export const validarDocumentoSchema = z.object({
    aprovado: z.boolean(),
    observacao: nullableText
});

export const registrarSaidaSchema = z.object({
    dataSaida: optionalDate,
    observacao: nullableText
});

export const registrarOcorrenciaSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    registroAcessoId: optionalGuid,
    tipo: z.nativeEnum(TipoOcorrenciaAcesso),
    gravidade: z.nativeEnum(GravidadeOcorrencia),
    descricao: textRequired('Informe a descrição da ocorrência.')
});

export const resolverOcorrenciaSchema = z.object({ resolucao: textRequired('Informe a resolução.') });
export const motivoSchema = z.object({ motivo: textRequired('Informe o motivo.') });
