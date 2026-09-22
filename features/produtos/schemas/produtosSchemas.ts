import { z } from 'zod';
import { TipoItemFiscal, TipoProduto } from '@/types/erp';
import { isValidGuid } from '@/lib/http/requestUtils';

const guidMessage = 'Selecione um registro válido.';
const requiredGuid = (label: string) => z.string().trim().refine(isValidGuid, `${label} deve ser selecionado corretamente.`);
const optionalGuid = z.union([z.string().trim().refine((value) => value === '' || isValidGuid(value), guidMessage), z.null(), z.undefined()]).transform((value) => (typeof value === 'string' && value.trim() === '' ? null : value ?? null));
const textRequired = (message: string) => z.string().trim().min(1, message);
const nullableText = z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
    if (value === null || value === undefined) return null;
    const normalized = value.trim();
    return normalized.length ? normalized : null;
});
const money = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).min(0, `${label} não pode ser negativo.`);
const integer = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).int(`${label} deve ser inteiro.`).min(0, `${label} não pode ser negativo.`);
// Preserva `0` explicitamente — enums como TipoItemSped começam em zero (MercadoriaParaRevenda = 0),
// então `value ?? null` (não `value || null`) é obrigatório para não apagar a classificação mais comum.
const optionalNumber = z.union([z.number(), z.null(), z.undefined()]).transform((value) => value ?? null);

export const motivoSchema = z.object({ motivo: textRequired('Informe o motivo.') });

export const criarCategoriaProdutoSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    codigo: textRequired('Informe o código.'),
    nome: textRequired('Informe o nome.'),
    descricao: nullableText
});

export const atualizarCategoriaProdutoSchema = z.object({
    nome: textRequired('Informe o nome.'),
    descricao: nullableText
});

export const criarUnidadeMedidaSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    sigla: textRequired('Informe a sigla.'),
    descricao: textRequired('Informe a descrição.'),
    casasDecimais: integer('Casas decimais'),
    permiteFracionado: z.boolean().default(false)
});

export const atualizarUnidadeMedidaSchema = z.object({
    descricao: textRequired('Informe a descrição.'),
    casasDecimais: integer('Casas decimais'),
    permiteFracionado: z.boolean().default(false)
});

export const criarMarcaSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    nome: textRequired('Informe o nome.'),
    descricao: nullableText
});

export const atualizarMarcaSchema = z.object({
    nome: textRequired('Informe o nome.'),
    descricao: nullableText
});

export const criarProdutoSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    codigo: textRequired('Informe o código.'),
    descricao: textRequired('Informe a descrição.'),
    descricaoComercial: nullableText,
    tipoProduto: z.nativeEnum(TipoProduto),
    unidadeMedidaId: requiredGuid('Unidade de medida'),
    categoriaProdutoId: optionalGuid,
    marcaId: optionalGuid,
    precoVendaBase: money('Preço de venda'),
    custoReferencial: money('Custo referencial'),
    controlaEstoque: z.boolean().default(true),
    controlaQualidade: z.boolean().default(false),
    permiteVenda: z.boolean().default(true),
    permiteCompra: z.boolean().default(true),
    observacao: nullableText
});

export const atualizarProdutoSchema = z.object({
    descricao: textRequired('Informe a descrição.'),
    descricaoComercial: nullableText,
    tipoProduto: z.nativeEnum(TipoProduto),
    unidadeMedidaId: requiredGuid('Unidade de medida'),
    categoriaProdutoId: optionalGuid,
    marcaId: optionalGuid,
    controlaEstoque: z.boolean().default(true),
    controlaQualidade: z.boolean().default(false),
    permiteVenda: z.boolean().default(true),
    permiteCompra: z.boolean().default(true),
    observacao: nullableText
});

export const atualizarPrecoCustoProdutoSchema = z.object({
    precoVendaBase: money('Preço de venda'),
    custoReferencial: money('Custo referencial')
});

export const atualizarDadosFiscaisProdutoSchema = z.object({
    ncmCodigo: nullableText,
    cestCodigo: nullableText,
    origemMercadoriaCodigo: nullableText,
    tipoItemFiscal: z.union([z.nativeEnum(TipoItemFiscal), z.null(), z.undefined()]).transform((value) => value ?? null),
    // Só trafega (round-trip do response) — sem controle de UI. Editável é escopo da b65.
    tipoItemSped: optionalNumber,
    unidadeMedidaTributavelId: optionalGuid,
    codigoFiscalExterno: nullableText
});

export const adicionarCodigoBarrasProdutoSchema = z.object({
    codigo: textRequired('Informe o código de barras.'),
    descricao: nullableText,
    principal: z.boolean().default(false)
});

export const vincularFornecedorProdutoSchema = z.object({
    fornecedorId: requiredGuid('Fornecedor'),
    codigoFornecedor: textRequired('Informe o código do fornecedor.'),
    principal: z.boolean().default(false)
});
