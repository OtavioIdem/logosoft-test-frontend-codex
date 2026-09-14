import { Guid, IsoDateTime } from '@/types/erp';

export enum CategoriaBemPatrimonial {
    Movel = 1,
    Imovel = 2,
    Veiculo = 3,
    Maquina = 4,
    Equipamento = 5,
    Ferramenta = 6,
    Software = 7,
    Outro = 8
}

export enum StatusBemPatrimonial {
    Ativo = 1,
    Baixado = 2
}

export enum MotivoBaixaPatrimonial {
    Venda = 1,
    Obsolescencia = 2,
    Perda = 3,
    Doacao = 4,
    Sinistro = 5,
    Transferencia = 6,
    Outro = 7
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
    categoria: CategoriaBemPatrimonial | number;
    dataAquisicao: IsoDateTime;
    valorAquisicao: number;
    valorResidual: number;
    vidaUtilMeses: number;
    depreciacaoAcumulada: number;
    valorContabilAtual: number;
    setorId?: Guid | null;
    responsavelId?: Guid | null;
    statusBem: StatusBemPatrimonial | number;
    bloqueado: boolean;
};

export type BemDepreciadoResponse = {
    bemId: Guid;
    codigo: string;
    valor: number;
    valorContabilApos: number;
    contabilizado: boolean;
    lancamentoContabilId?: Guid | null;
};

export type DepreciacaoResultadoResponse = {
    competencia: number;
    totalBensDepreciados: number;
    valorTotalDepreciado: number;
    totalContabilizados: number;
    bens: BemDepreciadoResponse[];
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
    categoria?: CategoriaBemPatrimonial | number | null;
    status?: StatusBemPatrimonial | number | null;
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
    categoria: CategoriaBemPatrimonial | number;
    dataAquisicao?: Date | null;
    valorAquisicao: number;
    valorResidual: number;
    vidaUtilMeses: number;
    setorId?: string | null;
    responsavelId?: string | null;
};

export type TransferirBemFormValues = { setorNovoId?: string | null; responsavelNovoId?: string | null; data?: Date | null; observacao?: string | null };
export type BaixarBemFormValues = { data?: Date | null; motivo: MotivoBaixaPatrimonial | number | null; justificativa: string; valorBaixa?: number | null };
export type ProcessarDepreciacaoFormValues = { empresaId: string; filialId?: string | null; ano: number; mes: number };
export type AbrirInventarioPatrimonioFormValues = { empresaId: string; filialId?: string | null; descricao: string; dataReferencia?: Date | null };
export type RegistrarContagemFormValues = { itemId: string; localizado: boolean; setorEncontradoId?: string | null; observacao?: string | null };
