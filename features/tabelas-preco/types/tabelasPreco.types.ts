import { Guid, IsoDateTime } from '@/types/erp';

export type TabelaPrecoStatus = 'Ativa' | 'Inativa' | 'Rascunho' | number | string;

export type TabelaPrecoListQuery = {
    empresaId?: string | null;
    filialId?: string | null;
    status?: string | null;
    termo?: string | null;
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
    status?: TabelaPrecoStatus;
    ativo?: boolean;
    itens?: TabelaPrecoItemResponse[];
    criadoEm?: IsoDateTime | null;
    alteradoEm?: IsoDateTime | null;
};

export type TabelaPrecoItemResponse = {
    id: Guid;
    produtoId: Guid;
    precoVenda: number;
    precoMinimo: number;
    margemPercentual: number;
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

export type PrecoVigenteResponse = {
    produtoId: Guid;
    tabelaPrecoId: Guid;
    precoVenda: number;
    precoMinimo: number;
    margemPercentual: number;
    vigente: boolean;
};
