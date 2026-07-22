import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { TipoAjusteEstoque } from '@/features/estoque-avancado/types/estoqueAvancado.types';

const requiredGuid = (label: string) => z.string().trim().refine(isValidGuid, `${label} deve ser selecionado corretamente.`);
const textRequired = (message: string) => z.string().trim().min(1, message);
const nullableText = z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
    if (value === null || value === undefined) return null;
    const normalized = value.trim();
    return normalized.length ? normalized : null;
});
const money = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).min(0, `${label} não pode ser negativo.`);
const positive = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).positive(`${label} deve ser maior que zero.`);
const dateOnly = (message: string) => z.union([z.date(), z.null(), z.undefined()]).refine((v) => v instanceof Date, message).transform((v) => (v as Date).toISOString().slice(0, 10));

export const criarInventarioSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: requiredGuid('Filial'),
    localEstoqueId: requiredGuid('Local de estoque'),
    descricao: textRequired('Informe a descrição.'),
    dataReferencia: dateOnly('Informe a data de referência.')
});

export const itemInventarioSchema = z.object({
    produtoId: requiredGuid('Produto'),
    quantidadeSistema: money('Quantidade do sistema'),
    quantidadeContada: money('Quantidade contada'),
    observacao: nullableText
});

export const concluirInventarioSchema = z.object({ motivoAjuste: textRequired('Informe o motivo do ajuste.') });
export const cancelarInventarioSchema = z.object({ motivo: textRequired('Informe o motivo.') });

export const ajusteEstoqueSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: requiredGuid('Filial'),
    localEstoqueId: requiredGuid('Local de estoque'),
    produtoId: requiredGuid('Produto'),
    tipo: z.nativeEnum(TipoAjusteEstoque),
    quantidade: positive('Quantidade'),
    motivo: textRequired('Informe o motivo.')
});

export const bloqueioEstoqueSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: requiredGuid('Filial'),
    localEstoqueId: requiredGuid('Local de estoque'),
    produtoId: requiredGuid('Produto'),
    quantidade: positive('Quantidade'),
    motivo: textRequired('Informe o motivo.')
});

export const encerrarBloqueioSchema = z.object({ motivo: textRequired('Informe o motivo.') });
