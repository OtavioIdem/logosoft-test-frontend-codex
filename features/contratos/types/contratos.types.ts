import { Guid, IsoDateTime } from '@/types/erp';

export enum TipoFaturamentoContrato {
    Recorrente = 1,
    Consumo = 2
}

export enum PeriodicidadeContrato {
    Mensal = 1,
    Bimestral = 2,
    Trimestral = 3,
    Semestral = 4,
    Anual = 5
}

export enum StatusContrato {
    Rascunho = 1,
    Aprovado = 2,
    Encerrado = 3,
    Cancelado = 4
}

// ---- Response types ----
export type ContratoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    numero: string;
    clienteId: Guid;
    descricao: string;
    tipoFaturamento: TipoFaturamentoContrato | number;
    periodicidade: PeriodicidadeContrato | number;
    dataInicio: IsoDateTime;
    dataFim?: IsoDateTime | null;
    valorFixo?: number | null;
    diaVencimento: number;
    franquia?: number | null;
    valorExcedente?: number | null;
    responsavelId?: Guid | null;
    status: StatusContrato | number;
};

export type FaturamentoContratoResponse = {
    contratoId: Guid;
    contaReceberId: Guid;
    competencia: string;
    valorTotal: number;
};

// ---- List queries ----
export type ContratosListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    clienteId?: Guid | null;
    status?: StatusContrato | number | null;
    termo?: string | null;
};

// ---- Form value types ----
export type ContratoFormValues = {
    empresaId: string;
    filialId?: string | null;
    numero: string;
    clienteId: string;
    descricao: string;
    tipoFaturamento: TipoFaturamentoContrato | number;
    periodicidade: PeriodicidadeContrato | number;
    dataInicio?: Date | null;
    dataFim?: Date | null;
    valorFixo?: number | null;
    diaVencimento: number;
    franquia?: number | null;
    valorExcedente?: number | null;
    responsavelId?: string | null;
};

export type GerarFaturamentoFormValues = { ano: number; mes: number; consumoRegistrado?: number | null };
