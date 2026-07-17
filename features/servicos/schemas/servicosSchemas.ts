import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { PrioridadeOrdemServico, TipoItemOrdemServico } from '@/features/servicos/types/servicos.types';

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
const quantidade = z.coerce.number({ invalid_type_error: 'Quantidade deve ser numérica.' }).positive('Quantidade deve ser maior que zero.');
const optionalDate = z.union([z.date(), z.null(), z.undefined()]).transform((value) => (value instanceof Date ? value.toISOString() : null));

export const criarOrdemServicoSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    numero: textRequired('Informe o número da OS.'),
    clienteId: requiredGuid('Cliente'),
    descricao: textRequired('Informe a descrição.'),
    prioridade: z.nativeEnum(PrioridadeOrdemServico),
    tecnicoResponsavelId: optionalGuid,
    localEstoqueId: optionalGuid,
    dataAbertura: optionalDate,
    dataPrevisao: optionalDate
});

export const triarOrdemServicoSchema = z.object({
    diagnostico: textRequired('Informe o diagnóstico.'),
    tecnicoResponsavelId: optionalGuid
});

export const planejarOrdemServicoSchema = z.object({
    planoExecucao: textRequired('Informe o plano de execução.')
});

export const itemOrdemServicoSchema = z.object({
    tipo: z.nativeEnum(TipoItemOrdemServico),
    descricao: textRequired('Informe a descrição do item.'),
    produtoId: optionalGuid,
    quantidade,
    valorUnitario: money('Valor unitário')
});

export const encerrarOrdemServicoSchema = z.object({
    laudoTecnico: textRequired('Informe o laudo técnico.')
});

export const faturarOrdemServicoSchema = z.object({
    numeroDocumento: nullableText,
    dataVencimento: optionalDate,
    observacao: nullableText
});

export const cancelarOrdemServicoSchema = z.object({ motivo: textRequired('Informe o motivo.') });
