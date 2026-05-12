import { EntityStatus, Guid, TipoItemFiscal, TipoProduto } from '@/types/erp';

export type ProdutoListQuery = {
    empresaId?: string | null;
    filialId?: string | null;
    termo?: string | null;
};

export type CatalogoListQuery = ProdutoListQuery;

export type CategoriaProdutoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    codigo: string;
    nome: string;
    descricao?: string | null;
    status: EntityStatus | number;
};

export type UnidadeMedidaResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    sigla: string;
    descricao: string;
    casasDecimais: number;
    permiteFracionado: boolean;
    status: EntityStatus | number;
};

export type MarcaResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    nome: string;
    descricao?: string | null;
    status: EntityStatus | number;
};

export type CodigoBarrasProdutoResponse = {
    id?: Guid;
    codigo: string;
    descricao?: string | null;
    principal: boolean;
};

export type ProdutoFornecedorResponse = {
    id?: Guid;
    fornecedorId: Guid;
    codigoFornecedor?: string | null;
    descricaoFornecedor?: string | null;
    principal: boolean;
};

export type ProdutoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    codigo: string;
    descricao: string;
    descricaoComercial?: string | null;
    tipoProduto: TipoProduto | number;
    unidadeMedidaId: Guid;
    categoriaProdutoId?: Guid | null;
    marcaId?: Guid | null;
    precoVendaBase: number;
    custoReferencial: number;
    controlaEstoque: boolean;
    permiteVenda: boolean;
    permiteCompra: boolean;
    ncm?: string | null;
    cest?: string | null;
    origemMercadoriaCodigo?: string | null;
    tipoItemFiscal?: TipoItemFiscal | number | null;
    unidadeTributavelId?: Guid | null;
    codigoFiscalExterno?: string | null;
    observacao?: string | null;
    status: EntityStatus | number;
    codigosBarras: CodigoBarrasProdutoResponse[];
    fornecedores: ProdutoFornecedorResponse[];
};

export type CriarCategoriaProdutoRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    codigo: string;
    nome: string;
    descricao?: string | null;
};

export type AtualizarCategoriaProdutoRequest = {
    nome: string;
    descricao?: string | null;
};

export type CriarUnidadeMedidaRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    sigla: string;
    descricao: string;
    casasDecimais: number;
    permiteFracionado: boolean;
};

export type AtualizarUnidadeMedidaRequest = {
    descricao: string;
    casasDecimais: number;
    permiteFracionado: boolean;
};

export type CriarMarcaRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    nome: string;
    descricao?: string | null;
};

export type AtualizarMarcaRequest = CriarMarcaRequest extends infer _ ? {
    nome: string;
    descricao?: string | null;
} : never;

export type CriarProdutoRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    codigo: string;
    descricao: string;
    descricaoComercial?: string | null;
    tipoProduto: TipoProduto | number;
    unidadeMedidaId: Guid;
    categoriaProdutoId?: Guid | null;
    marcaId?: Guid | null;
    precoVendaBase: number;
    custoReferencial: number;
    controlaEstoque: boolean;
    permiteVenda: boolean;
    permiteCompra: boolean;
    observacao?: string | null;
};

export type AtualizarProdutoRequest = {
    descricao: string;
    descricaoComercial?: string | null;
    tipoProduto: TipoProduto | number;
    unidadeMedidaId: Guid;
    categoriaProdutoId?: Guid | null;
    marcaId?: Guid | null;
    controlaEstoque: boolean;
    permiteVenda: boolean;
    permiteCompra: boolean;
    observacao?: string | null;
};

export type AtualizarPrecoCustoProdutoRequest = {
    precoVendaBase: number;
    custoReferencial: number;
};

export type AtualizarDadosFiscaisProdutoRequest = {
    ncm?: string | null;
    cest?: string | null;
    origemMercadoriaCodigo?: string | null;
    tipoItemFiscal?: TipoItemFiscal | number | null;
    unidadeTributavelId?: Guid | null;
    codigoFiscalExterno?: string | null;
};

export type AdicionarCodigoBarrasProdutoRequest = {
    codigo: string;
    descricao?: string | null;
    principal: boolean;
};

export type VincularFornecedorProdutoRequest = {
    fornecedorId: Guid;
    codigoFornecedor?: string | null;
    descricaoFornecedor?: string | null;
    principal: boolean;
};

export type MotivoRequest = {
    motivo: string;
};

export type CategoriaProdutoFormValues = Partial<CriarCategoriaProdutoRequest & AtualizarCategoriaProdutoRequest> & { id?: Guid };
export type UnidadeMedidaFormValues = Partial<CriarUnidadeMedidaRequest & AtualizarUnidadeMedidaRequest> & { id?: Guid };
export type MarcaFormValues = Partial<CriarMarcaRequest & AtualizarMarcaRequest> & { id?: Guid };
export type ProdutoFormValues = Partial<CriarProdutoRequest & AtualizarProdutoRequest & AtualizarPrecoCustoProdutoRequest & AtualizarDadosFiscaisProdutoRequest> & { id?: Guid };
export type CodigoBarrasFormValues = Partial<AdicionarCodigoBarrasProdutoRequest>;
export type ProdutoFornecedorFormValues = Partial<VincularFornecedorProdutoRequest>;
