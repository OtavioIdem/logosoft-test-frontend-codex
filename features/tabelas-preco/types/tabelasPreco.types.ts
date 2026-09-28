import { Guid, IsoDateTime } from '@/types/erp';

// `StatusTabelaPreco` (backend, `StatusTabelaPreco.cs`): enum sem `JsonStringEnumConverter`
// configurado no backend (grep confirmado), então o campo `status` chega sempre como número.
export enum StatusTabelaPreco {
    Rascunho = 1,
    Ativa = 2,
    Inativa = 3,
    Expirada = 4
}

export type TabelaPrecoListQuery = {
    empresaId?: string | null;
    filialId?: string | null;
    status?: string | null;
    page?: number;
    pageSize?: number;
};

export type TabelaPrecoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    nome: string;
    dataInicioVigencia: string;
    dataFimVigencia?: string | null;
    padrao: boolean;
    status?: StatusTabelaPreco | number | null;
    itens?: TabelaPrecoItemResponse[];
    criadoEm?: IsoDateTime | null;
    alteradoEm?: IsoDateTime | null;
};

export type TabelaPrecoItemResponse = {
    id: Guid;
    produtoId: Guid;
    precoVenda: number;
    precoMinimo: number | null;
    margemPercentual: number | null;
    ativo?: boolean;
};

export type CriarTabelaPrecoRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    nome: string;
    dataInicioVigencia: string;
    dataFimVigencia?: string | null;
    padrao: boolean;
};

export type AtualizarTabelaPrecoRequest = {
    nome: string;
    dataInicioVigencia: string;
    dataFimVigencia?: string | null;
    padrao: boolean;
};

export type TabelaPrecoFormValues = {
    empresaId: string;
    filialId?: string | null;
    nome: string;
    dataInicioVigencia: Date | null;
    dataFimVigencia?: Date | null;
    padrao: boolean;
};

export type TabelaPrecoMotivoRequest = {
    motivo: string;
};

export type CriarTabelaPrecoItemRequest = {
    produtoId: Guid;
    precoVenda: number;
    precoMinimo: number;
    margemPercentual: number;
};

export type AtualizarTabelaPrecoItemRequest = {
    precoVenda: number;
    precoMinimo: number;
    margemPercentual: number;
};

export type TabelaPrecoItemFormValues = {
    produtoId: string;
    precoVenda: number | null;
    precoMinimo: number | null;
    margemPercentual: number | null;
};

export type PrecoVigenteQuery = {
    produtoId: string;
    empresaId?: string | null;
    filialId?: string | null;
    dataReferencia?: Date | null;
};

// `PrecoProdutoVigenteResponse` (backend, `TabelasPrecoResponses.cs:46`) não declara
// `MargemPercentual` (V3 do inventário) nem `Vigente` — o endpoint só devolve 200 quando existe
// preço vigente; sem item, `ObterPrecoVigenteUseCase.cs:24-27` devolve falha e o controller
// responde 404 (`TabelasPrecoController.cs:136-139`), tratado como erro de query, não como dado.
export type PrecoVigenteResponse = {
    produtoId: Guid;
    tabelaPrecoId: Guid;
    precoVenda: number;
    precoMinimo: number | null;
    dataReferencia: string;
};
