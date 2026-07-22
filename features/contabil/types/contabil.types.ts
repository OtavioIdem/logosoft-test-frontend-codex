import { Guid, IsoDateTime } from '@/types/erp';

export enum TipoContaContabil {
    Ativo = 1,
    Passivo = 2,
    PatrimonioLiquido = 3,
    Receita = 4,
    Despesa = 5
}

export enum NaturezaConta {
    Devedora = 1,
    Credora = 2
}

export enum TipoPartida {
    Debito = 1,
    Credito = 2
}

export enum StatusPeriodoContabil {
    Aberto = 1,
    Fechado = 2
}

export enum StatusLancamentoContabil {
    Normal = 1,
    Estornado = 2,
    Estorno = 3
}

export enum TipoEventoContabilizacao {
    BaixaContaReceber = 1,
    BaixaContaPagar = 2,
    Outro = 3
}

// ---- Response types ----
export type ContaContabilResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    codigo: string;
    nome: string;
    tipo: TipoContaContabil | number;
    natureza: NaturezaConta | number;
    analitica: boolean;
    contaPaiId?: Guid | null;
    ativa: boolean;
};

export type PeriodoContabilResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    ano: number;
    mes: number;
    status: StatusPeriodoContabil | number;
    fechadoEm?: IsoDateTime | null;
    observacao?: string | null;
};

export type PartidaContabilResponse = {
    id: Guid;
    contaContabilId: Guid;
    tipo: TipoPartida | number;
    valor: number;
    centroCustoId?: Guid | null;
    historico?: string | null;
};

export type LancamentoContabilResumoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    numero?: string | null;
    data: IsoDateTime;
    historico: string;
    valorTotal: number;
    status: StatusLancamentoContabil | number;
};

export type LancamentoContabilResponse = LancamentoContabilResumoResponse & {
    partidas: PartidaContabilResponse[];
};

export type RegraContabilizacaoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    descricao: string;
    tipoEvento: TipoEventoContabilizacao | number;
    origemFinanceira?: string | null;
    contaDebitoId: Guid;
    contaCreditoId: Guid;
    ativa: boolean;
};

// ---- List queries ----
export type PlanoContasListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    tipo?: TipoContaContabil | number | null;
    termo?: string | null;
};

export type PeriodosListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    ano?: number | null;
    status?: StatusPeriodoContabil | number | null;
};

export type LancamentosListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    status?: StatusLancamentoContabil | number | null;
    termo?: string | null;
};

export type RegrasListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
};

// ---- Form value types ----
export type ContaContabilFormValues = {
    empresaId: string;
    filialId?: string | null;
    codigo: string;
    nome: string;
    tipo: TipoContaContabil | number;
    natureza: NaturezaConta | number;
    analitica: boolean;
    contaPaiId?: string | null;
};

export type AbrirPeriodoFormValues = { empresaId: string; filialId?: string | null; ano: number; mes: number };

export type PartidaFormValues = { contaContabilId: string; tipo: TipoPartida | number; valor: number; centroCustoId?: string | null; historico?: string | null };

export type LancamentoFormValues = {
    empresaId: string;
    filialId?: string | null;
    data?: Date | null;
    historico: string;
    partidas: PartidaFormValues[];
};

export type RegraContabilizacaoFormValues = {
    empresaId: string;
    filialId?: string | null;
    descricao: string;
    tipoEvento: TipoEventoContabilizacao | number;
    origemFinanceira?: string | null;
    contaDebitoId: string;
    contaCreditoId: string;
};
