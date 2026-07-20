import { Guid, IsoDateTime } from '@/types/erp';

export enum LoteOrigem {
    Producao = 1,
    Compra = 2,
    Transferencia = 3,
    Outro = 4
}

export enum StatusLote {
    Ativo = 1,
    Bloqueado = 2,
    Esgotado = 3
}

export enum TipoMovimentacaoLote {
    Entrada = 1,
    Saida = 2,
    Ajuste = 3,
    Descarte = 4
}

export enum GravidadeRecall {
    Baixa = 1,
    Media = 2,
    Alta = 3,
    Critica = 4
}

export enum StatusRecall {
    Aberto = 1,
    Encerrado = 2,
    Cancelado = 3
}

// ---- Response types ----
export type LoteResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    produtoId: Guid;
    numeroLote: string;
    origem: LoteOrigem | number;
    dataFabricacao?: IsoDateTime | null;
    dataValidade: IsoDateTime;
    quantidadeInicial: number;
    quantidadeAtual: number;
    fornecedorId?: Guid | null;
    localEstoqueId?: Guid | null;
    documentoOrigem?: string | null;
    status: StatusLote | number;
    vencido: boolean;
    diasParaVencer?: number | null;
};

export type MovimentacaoLoteResponse = {
    id: Guid;
    loteId: Guid;
    tipo: TipoMovimentacaoLote | number;
    quantidade: number;
    documento?: string | null;
    observacao?: string | null;
    data: IsoDateTime;
};

export type RecallResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    numero?: string | null;
    gravidade: GravidadeRecall | number;
    motivo: string;
    descricao?: string | null;
    status: StatusRecall | number;
    abertoEm: IsoDateTime;
    encerradoEm?: IsoDateTime | null;
    totalLotes?: number | null;
};

export type RecallLoteResponse = {
    loteId: Guid;
    numeroLote: string;
    produtoId: Guid;
    dataValidade: IsoDateTime;
    quantidadeAtual: number;
    status: StatusLote | number;
};

// ---- List queries ----
export type LotesListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    produtoId?: Guid | null;
    status?: StatusLote | number | null;
    termo?: string | null;
};

export type RecallsListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    status?: StatusRecall | number | null;
    gravidade?: GravidadeRecall | number | null;
};

// ---- Form value types ----
export type LoteFormValues = {
    empresaId: string;
    filialId?: string | null;
    produtoId: string;
    numeroLote: string;
    origem: LoteOrigem | number;
    dataFabricacao?: Date | null;
    dataValidade?: Date | null;
    quantidadeInicial: number;
    fornecedorId?: string | null;
    localEstoqueId?: string | null;
    documentoOrigem?: string | null;
};

export type MovimentacaoLoteFormValues = {
    loteId: string;
    tipo: TipoMovimentacaoLote | number;
    quantidade: number;
    documento?: string | null;
    observacao?: string | null;
};

export type RecallFormValues = {
    empresaId: string;
    filialId?: string | null;
    gravidade: GravidadeRecall | number;
    motivo: string;
    descricao?: string | null;
};
