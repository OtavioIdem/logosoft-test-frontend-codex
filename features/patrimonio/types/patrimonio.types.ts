import { Guid, IsoDateTime } from '@/types/erp';

export enum CategoriaBem {
    Movel = 1,
    Imovel = 2,
    Veiculo = 3,
    Equipamento = 4,
    Informatica = 5,
    Outro = 6
}

export enum StatusBem {
    Ativo = 1,
    Bloqueado = 2,
    Baixado = 3
}

export enum StatusInventarioPatrimonio {
    Aberto = 1,
    Encerrado = 2
}

// ---- Response types ----
export type BemPatrimonialResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    codigo: string;
    descricao: string;
    categoria: CategoriaBem | number;
    dataAquisicao: IsoDateTime;
    valorAquisicao: number;
    valorResidual: number;
    vidaUtilMeses: number;
    valorDepreciado?: number | null;
    valorContabil?: number | null;
    setorId?: Guid | null;
    responsavelId?: Guid | null;
    status: StatusBem | number;
};

export type DepreciacaoResultadoResponse = {
    ano: number;
    mes: number;
    bensDepreciados: number;
    valorTotal: number;
};

export type ItemInventarioPatrimonioResponse = {
    id: Guid;
    bemId: Guid;
    localizado?: boolean | null;
    setorEncontradoId?: Guid | null;
    observacao?: string | null;
    contado: boolean;
};

export type InventarioPatrimonialResumoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    descricao: string;
    dataReferencia: IsoDateTime;
    status: StatusInventarioPatrimonio | number;
    totalItens?: number | null;
    divergencias?: number | null;
};

export type InventarioPatrimonialResponse = InventarioPatrimonialResumoResponse & {
    itens: ItemInventarioPatrimonioResponse[];
};

// ---- List queries ----
export type BensListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    categoria?: CategoriaBem | number | null;
    status?: StatusBem | number | null;
    termo?: string | null;
};

export type InventariosListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    status?: StatusInventarioPatrimonio | number | null;
};

// ---- Form value types ----
export type BemFormValues = {
    empresaId: string;
    filialId?: string | null;
    codigo: string;
    descricao: string;
    categoria: CategoriaBem | number;
    dataAquisicao?: Date | null;
    valorAquisicao: number;
    valorResidual: number;
    vidaUtilMeses: number;
    setorId?: string | null;
    responsavelId?: string | null;
};

export type TransferirBemFormValues = { setorNovoId?: string | null; responsavelNovoId?: string | null; data?: Date | null; observacao?: string | null };
export type BaixarBemFormValues = { data?: Date | null; motivo: string; justificativa: string; valorBaixa?: number | null };
export type ProcessarDepreciacaoFormValues = { empresaId: string; filialId?: string | null; ano: number; mes: number };
export type AbrirInventarioPatrimonioFormValues = { empresaId: string; filialId?: string | null; descricao: string; dataReferencia?: Date | null };
export type RegistrarContagemFormValues = { itemId: string; localizado: boolean; setorEncontradoId?: string | null; observacao?: string | null };
