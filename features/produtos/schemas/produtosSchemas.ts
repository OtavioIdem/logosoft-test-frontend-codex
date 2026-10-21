import { z } from 'zod';
import { TipoItemFiscal, TipoItemSped, TipoProduto } from '@/types/erp';
import { isValidGuid } from '@/lib/http/requestUtils';
import { isCestLeiauteValido, isNcmLeiauteValido, isUnidadeLeiauteValida } from '@/lib/validators/fiscalLayoutFormats';

const guidMessage = 'Selecione um registro válido.';
const requiredGuid = (label: string) => z.string().trim().refine(isValidGuid, `${label} deve ser selecionado corretamente.`);
const optionalGuid = z.union([z.string().trim().refine((value) => value === '' || isValidGuid(value), guidMessage), z.null(), z.undefined()]).transform((value) => (typeof value === 'string' && value.trim() === '' ? null : value ?? null));
const textRequired = (message: string) => z.string().trim().min(1, message);
const nullableText = z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
    if (value === null || value === undefined) return null;
    const normalized = value.trim();
    return normalized.length ? normalized : null;
});
// Campos curtos com limite do backend (`ProdutoValidators.cs`) — mesma normalização de `nullableText`,
// mais o teto de caracteres, para o erro aparecer no formulário em vez de só no 400 do PATCH.
const nullableTextMax = (max: number, label: string) =>
    z
        .union([z.string(), z.null(), z.undefined()])
        .transform((value) => {
            if (value === null || value === undefined) return null;
            const normalized = value.trim();
            return normalized.length ? normalized : null;
        })
        .refine((value) => value === null || value.length <= max, `${label} deve ter no máximo ${max} caracteres.`);
const nullableFiscalText = (validar: (value: string) => boolean, mensagem: string) => nullableText.refine((value) => value === null || validar(value), mensagem);
const money = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).min(0, `${label} não pode ser negativo.`);
const integer = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).int(`${label} deve ser inteiro.`).min(0, `${label} não pode ser negativo.`);
const optionalPercent = (label: string, max?: number) => z.union([z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }), z.null(), z.undefined()]).transform((value) => value ?? null).refine((value) => value === null || (value >= 0 && (max === undefined || value <= max)), `${label} deve estar dentro da faixa permitida.`);

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
    sigla: textRequired('Informe a sigla.').refine(isUnidadeLeiauteValida, 'A sigla deve ter de 1 a 6 caracteres.'),
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

const grupoProdutoCampos = {
    descricao: textRequired('Informe a descrição.').max(60, 'Descrição deve ter no máximo 60 caracteres.'), exigeNcm: z.boolean().default(true),
    margemLucroPercentual: optionalPercent('Margem de lucro'), margemLucroNivel1: optionalPercent('Margem nível 1'), margemLucroNivel2: optionalPercent('Margem nível 2'), margemLucroNivel3: optionalPercent('Margem nível 3'),
    percentualComissao: optionalPercent('Percentual de comissão', 100), descontoMaximoPercentual: z.coerce.number().min(0, 'Desconto máximo não pode ser negativo.').max(100, 'Desconto máximo deve ser no máximo 100.').default(0),
    controlaEstoque: z.boolean(), controlaEstoqueContabil: z.boolean().default(true)
};
export const criarGrupoProdutoSchema = z.object({ empresaId: requiredGuid('Empresa'), codigo: textRequired('Informe o código.').max(15, 'Código deve ter no máximo 15 caracteres.').refine((value) => !/\s/.test(value), 'Código não pode conter espaços.').transform((value) => value.toUpperCase()), grupoPaiId: optionalGuid, ...grupoProdutoCampos });
export const atualizarGrupoProdutoSchema = z.object(grupoProdutoCampos);
export const criarCadastroAuxiliarProdutoSchema = z.object({ empresaId: requiredGuid('Empresa'), codigo: textRequired('Informe o código.').max(20, 'Código deve ter no máximo 20 caracteres.').refine((value) => !/\s/.test(value), 'Código não pode conter espaços.').transform((value) => value.toUpperCase()), nome: textRequired('Informe o nome.').max(120, 'Nome deve ter no máximo 120 caracteres.') });
export const atualizarCadastroAuxiliarProdutoSchema = z.object({ nome: textRequired('Informe o nome.').max(120, 'Nome deve ter no máximo 120 caracteres.') });
export const referenciasCadastraisProdutoSchema = z.object({ linhaProdutoId: optionalGuid, classificacaoProdutoId: optionalGuid, classificacaoCompraId: optionalGuid, modoAplicacaoProdutoId: optionalGuid, naturezaFisicaProdutoId: optionalGuid, fabricanteId: optionalGuid, categoriaFinanceiraReceitaId: optionalGuid, categoriaFinanceiraDespesaId: optionalGuid });

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
    grupoProdutoId: optionalGuid,
    linhaProdutoId: optionalGuid, classificacaoProdutoId: optionalGuid, classificacaoCompraId: optionalGuid, modoAplicacaoProdutoId: optionalGuid, naturezaFisicaProdutoId: optionalGuid, fabricanteId: optionalGuid, categoriaFinanceiraReceitaId: optionalGuid, categoriaFinanceiraDespesaId: optionalGuid,
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
    ncmCodigo: nullableFiscalText(isNcmLeiauteValido, 'NCM deve ter 8 dígitos ou ser 00.'),
    cestCodigo: nullableFiscalText(isCestLeiauteValido, 'CEST deve ter 7 dígitos.'),
    origemMercadoriaCodigo: nullableText,
    tipoItemFiscal: z.union([z.nativeEnum(TipoItemFiscal), z.null(), z.undefined()]).transform((value) => value ?? null),
    // Editável desde a v1.11.0a8b65 (D59) — `0` (MercadoriaParaRevenda) é valor válido, `nativeEnum`
    // aceita e `?? null` (nunca `|| null`) preserva o zero.
    tipoItemSped: z.union([z.nativeEnum(TipoItemSped), z.null(), z.undefined()]).transform((value) => value ?? null),
    // Sigla da unidade tributável oficial (Mód.04) resolvida por catálogo — nunca um Id (D60, ProdutoValidators linha 49).
    unidadeTributavelSigla: nullableTextMax(6, 'Unidade tributável (sigla oficial)').refine((value) => value === null || isUnidadeLeiauteValida(value), 'Unidade tributável (sigla oficial) deve ter de 1 a 6 caracteres.'),
    unidadeMedidaTributavelId: optionalGuid,
    // Vazio = herda o EX-TIPI do NCM resolvido no backend (ProdutoDadosFiscaisResolver linha 152).
    exTipi: nullableTextMax(3, 'EX-TIPI'),
    codigoBeneficioFiscalPadrao: nullableTextMax(10, 'Código de benefício fiscal'),
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
    descricaoFornecedor: nullableTextMax(200, 'Descrição no fornecedor'),
    principal: z.boolean().default(false)
});
