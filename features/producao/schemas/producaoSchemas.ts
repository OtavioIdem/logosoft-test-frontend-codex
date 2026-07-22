import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { TipoApontamentoProducao } from '@/features/producao/types/producao.types';

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
const percentual = z.union([z.coerce.number().min(0, 'Perda não pode ser negativa.').max(100, 'Perda não pode passar de 100%.'), z.null(), z.undefined()]).transform((value) => (typeof value === 'number' && Number.isFinite(value) ? value : null));
const requiredDate = (message: string) => z.union([z.date(), z.null(), z.undefined()]).refine((value) => value instanceof Date, message).transform((value) => (value as Date).toISOString());

export const criarFichaTecnicaSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    codigo: textRequired('Informe o código.'),
    produtoId: requiredGuid('Produto'),
    descricao: textRequired('Informe a descrição.'),
    quantidadeBase: positive('Quantidade base'),
    versao: nullableText
});

export const adicionarComponenteSchema = z.object({
    produtoId: requiredGuid('Componente'),
    quantidade: positive('Quantidade'),
    perdaPercentual: percentual,
    observacao: nullableText
});

export const criarOrdemProducaoSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    numero: textRequired('Informe o número da OP.'),
    produtoId: requiredGuid('Produto'),
    quantidadePlanejada: positive('Quantidade planejada'),
    dataPlanejada: requiredDate('Informe a data planejada.'),
    localEstoqueId: optionalGuid,
    observacao: nullableText
});

export const registrarApontamentoSchema = z.object({
    tipo: z.nativeEnum(TipoApontamentoProducao),
    produtoId: optionalGuid,
    quantidade: positive('Quantidade'),
    observacao: nullableText
});

export const encerrarOrdemProducaoSchema = z.object({ observacao: nullableText });
export const motivoSchema = z.object({ motivo: textRequired('Informe o motivo.') });
