import { Guid, IsoDateTime } from '@/types/erp';

export enum StatusInventarioEstoque {
    Aberto = 1,
    EmContagem = 2,
    Concluido = 3,
    Cancelado = 4
}

export enum TipoAjusteEstoque {
    Entrada = 1,
    Saida = 2
}

export enum StatusBloqueioEstoque {
    Ativo = 1,
    Liberado = 2,
    Cancelado = 3
}

export type ItemInventarioEstoqueResponse = {
    id: Guid;
    produtoId: Guid;
    quantidadeSistema: number;
    quantidadeContada: number;
    divergencia: number;
    observacao?: string | null;
};

export type InventarioEstoqueResumoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    localEstoqueId: Guid;
    descricao: string;
    dataReferencia: IsoDateTime;
    status: StatusInventarioEstoque | number;
};

export type InventarioEstoqueResponse = InventarioEstoqueResumoResponse & {
    itens: ItemInventarioEstoqueResponse[];
};

export type InventarioPaginado = {
    items: InventarioEstoqueResumoResponse[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
};

export type AjusteEstoqueResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    localEstoqueId: Guid;
    produtoId: Guid;
    tipo: TipoAjusteEstoque | number;
    quantidade: number;
    motivo: string;
    origem: string;
};

export type BloqueioEstoqueResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    localEstoqueId: Guid;
    produtoId: Guid;
    quantidade: number;
    motivo: string;
    status: StatusBloqueioEstoque | number;
};

export type InventariosListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    localEstoqueId?: Guid | null;
    status?: StatusInventarioEstoque | number | null;
    page?: number | null;
    pageSize?: number | null;
};

// ---- Form value types ----
export type CriarInventarioFormValues = { empresaId: string; filialId: string; localEstoqueId: string; descricao: string; dataReferencia?: Date | null };
export type ItemInventarioFormValues = { produtoId: string; quantidadeSistema: number; quantidadeContada: number; observacao?: string | null };
export type AjusteEstoqueFormValues = { empresaId: string; filialId: string; localEstoqueId: string; produtoId: string; tipo: TipoAjusteEstoque | number; quantidade: number; motivo: string };
export type BloqueioEstoqueFormValues = { empresaId: string; filialId: string; localEstoqueId: string; produtoId: string; quantidade: number; motivo: string };
