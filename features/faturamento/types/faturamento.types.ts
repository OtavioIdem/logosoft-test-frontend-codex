import { Guid, IsoDateTime } from '@/types/erp';

export enum StatusFaturamento {
    Rascunho = 1,
    PendenteFiscal = 2,
    FiscalAutorizado = 3,
    EstoqueProcessado = 4,
    Faturado = 5,
    Cancelado = 6,
    Erro = 7
}

export enum TipoOcorrenciaFaturamento {
    Informativa = 1,
    Alerta = 2,
    Erro = 3
}

export enum TipoDocumentoFiscal {
    NFe = 1,
    NFCe = 2,
    NFSe = 3,
    CTe = 4,
    MDFe = 5,
    Outro = 99
}

export type FaturamentoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    pedidoVendaId: Guid;
    notaFiscalId?: Guid | null;
    contaReceberId?: Guid | null;
    etapa: StatusFaturamento | number;
    valorTotal: number;
    confirmadoEm?: IsoDateTime | null;
    confirmadoPor?: Guid | null;
    canceladoEm?: IsoDateTime | null;
    canceladoPor?: Guid | null;
    motivoCancelamento?: string | null;
};

export type FaturamentoHistoricoResponse = {
    id: Guid;
    statusAnterior: StatusFaturamento | number;
    statusNovo: StatusFaturamento | number;
    observacao: string;
    usuarioId?: Guid | null;
    data: IsoDateTime;
};

export type FaturamentoOcorrenciaResponse = {
    id: Guid;
    tipo: TipoOcorrenciaFaturamento | number;
    mensagem: string;
    data: IsoDateTime;
};

export type FaturamentoPaginado = {
    items: FaturamentoResponse[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage?: boolean;
    hasNextPage?: boolean;
};

export type PrepararFaturamentoResponse = {
    faturamento: FaturamentoResponse;
    jaExistia: boolean;
    alertas: string[];
};

export type ConfirmarFaturamentoResponse = {
    faturamento: FaturamentoResponse;
    alertas: string[];
};

export type FaturamentosListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    pedidoVendaId?: Guid | null;
    etapa?: StatusFaturamento | number | null;
    page?: number | null;
    pageSize?: number | null;
};

// ---- Form value types ----
export type PrepararFaturamentoFormValues = { pedidoVendaId: string; observacao?: string | null };
export type ConfirmarFaturamentoFormValues = {
    ufAutorizadora: string;
    tipoDocumento: TipoDocumentoFiscal | number;
    serie: string;
    numero: string;
    cfopPadrao?: string | null;
    unidadeComercialPadrao: string;
    validarDadosFiscaisProduto: boolean;
    condicaoPagamentoId?: string | null;
    primeiraDataVencimentoContaReceber?: Date | null;
};
