import { Guid, IsoDateTime } from '@/types/erp';

export enum StatusContaFinanceira {
    Aberta = 1,
    ParcialmenteBaixada = 2,
    Quitada = 3,
    Cancelada = 4,
    Estornada = 5
}

export enum TipoContaFinanceira {
    Receber = 1,
    Pagar = 2
}

export type TipoConta = 'receber' | 'pagar';

export type BaixaFinanceiraResponse = {
    id: Guid;
    valor: number;
    dataBaixa: IsoDateTime;
    usuarioId: Guid;
    estornada: boolean;
    motivoEstorno?: string | null;
};

export type ContaFinanceiraResumoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    tipo: TipoContaFinanceira | number;
    participanteId: Guid;
    descricao: string;
    valorOriginal: number;
    saldo: number;
    dataVencimento: IsoDateTime;
    status: StatusContaFinanceira | number;
};

export type ContaFinanceiraResponse = ContaFinanceiraResumoResponse & {
    documento?: string | null;
    dataEmissao: IsoDateTime;
    origemModulo?: string | null;
    origemId?: Guid | null;
    baixas: BaixaFinanceiraResponse[];
};

export type ContasPaginadas = {
    items: ContaFinanceiraResumoResponse[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
};

export type FluxoCaixaResponse = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    dataInicial: IsoDateTime;
    dataFinal: IsoDateTime;
    entradasPrevistas: number;
    saidasPrevistas: number;
    entradasRealizadas: number;
    saidasRealizadas: number;
    saldoPrevisto: number;
    saldoRealizado: number;
    saldoProjetado: number;
};

export type ContasListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    participanteId?: Guid | null;
    status?: StatusContaFinanceira | number | null;
    dataInicial?: string | null;
    dataFinal?: string | null;
    page?: number | null;
    pageSize?: number | null;
};

export type FluxoCaixaQuery = { empresaId?: Guid | null; filialId?: Guid | null; dataInicial?: string | null; dataFinal?: string | null };

// ---- Form value types ----
export type CriarContaFormValues = { empresaId: string; filialId?: string | null; participanteId: string; descricao: string; documento?: string | null; valorOriginal: number; dataEmissao?: Date | null; dataVencimento?: Date | null };
export type BaixarContaFormValues = { valor: number; dataBaixa?: Date | null; observacao?: string | null };
export type EstornarBaixaFormValues = { baixaId: string; dataEstorno?: Date | null; motivo: string };
