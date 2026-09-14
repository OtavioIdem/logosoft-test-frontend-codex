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

// LegIntegracaoFaturamento (FaturamentoLegIntegracao.cs:12-20): passo da cadeia de integração do faturamento.
export enum LegIntegracaoFaturamento {
    GerarNotaFiscal = 1,
    GerarXmlEnvio = 2,
    AssinarXml = 3,
    TransmitirAutorizarSefaz = 4,
    BaixarEstoque = 5,
    GerarContaReceber = 6
}

// EstadoLegIntegracaoFaturamento (FaturamentoLegIntegracao.cs:31-): 4 estados, não 3 (armadilha 2 da b55).
export enum EstadoLegIntegracaoFaturamento {
    Integrado = 1,
    Falhou = 2,
    Revertido = 3,
    EmReversao = 4
}

// AcaoRetomadaReversaoLeg (FaturamentoContracts.cs:124-128): as duas saídas de EmReversao.
export enum AcaoRetomadaReversaoLeg {
    ReaplicarInversa = 1,
    DeclararEfeitoDesfeito = 2
}

// FaturamentoLegResponse (FaturamentoContracts.cs:56).
export type FaturamentoLegResponse = {
    id: Guid;
    leg: LegIntegracaoFaturamento | number;
    estado: EstadoLegIntegracaoFaturamento | number;
    ocorreuEm: IsoDateTime;
    responsavelId?: Guid | null;
    motivo?: string | null;
};

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
    // Os 4 campos abaixo só vêm preenchidos no detalhe (GET /api/faturamento/{id}); na listagem
    // (GET /api/faturamento) chegam vazios ou falsos por escolha do backend (FaturamentoConsultaUseCases.cs:56-63).
    legs?: FaturamentoLegResponse[] | null;
    possuiLegComFalha?: boolean;
    possuiLegRevertido?: boolean;
    etapaDivergeDosLegs?: boolean;
    possuiLegEmReversao?: boolean;
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
// Payload validado de RetomarReversaoLegRequest (FaturamentoContracts.cs:137-140): { leg, acao, motivo }.
export type RetomarReversaoFormValues = {
    leg: LegIntegracaoFaturamento | number;
    acao: AcaoRetomadaReversaoLeg | number;
    motivo: string;
};
