import { Guid, IsoDateTime } from '@/types/erp';

export enum StatusSolicitacaoCompra {
    Aberta = 1,
    Aprovada = 2,
    Atendida = 3,
    Cancelada = 4
}

export enum StatusCotacaoCompra {
    Aberta = 1,
    Aprovada = 2,
    Recusada = 3,
    Cancelada = 4
}

export enum StatusConferenciaFiscalEntrada {
    Conferida = 1,
    DivergenciaEncontrada = 2
}

export enum TipoDivergenciaRecebimento {
    QuantidadeAcimaDoPedido = 1,
    ValorUnitarioDivergente = 2,
    ValorFiscalDivergente = 3
}

// ---- Solicitação ----
export type SolicitacaoCompraItemResponse = { id: Guid; sequencia: number; produtoId: Guid; quantidade: number; observacao?: string | null };
export type SolicitacaoCompraResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    numero: string;
    dataSolicitacao: IsoDateTime;
    solicitante: string;
    justificativa?: string | null;
    statusSolicitacao: StatusSolicitacaoCompra | number;
    itens: SolicitacaoCompraItemResponse[];
};
export type SolicitacoesListQuery = { empresaId?: Guid | null; filialId?: Guid | null; status?: StatusSolicitacaoCompra | number | null; termo?: string | null };

// ---- Cotação ----
export type CotacaoCompraItemResponse = { id: Guid; sequencia: number; produtoId: Guid; quantidade: number; valorUnitario: number; valorTotal: number; observacao?: string | null };
export type CotacaoCompraResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    numero: string;
    fornecedorId: Guid;
    solicitacaoCompraId?: Guid | null;
    dataCotacao: IsoDateTime;
    validade?: IsoDateTime | null;
    observacao?: string | null;
    statusCotacao: StatusCotacaoCompra | number;
    itens: CotacaoCompraItemResponse[];
};
export type CotacoesListQuery = { empresaId?: Guid | null; filialId?: Guid | null; fornecedorId?: Guid | null; status?: StatusCotacaoCompra | number | null; termo?: string | null };

// ---- Recebimento / Divergência / Conferência ----
export type ItemRecebimentoCompraResponse = { id: Guid; pedidoCompraItemId: Guid; produtoId: Guid; quantidade: number; valorUnitario: number; valorTotal: number };
export type RecebimentoDivergenciaResponse = {
    id: Guid;
    recebimentoCompraId: Guid;
    itemPedidoCompraId?: Guid | null;
    produtoId?: Guid | null;
    tipo: TipoDivergenciaRecebimento | number;
    valorEsperado: number;
    valorInformado: number;
    diferenca: number;
    registradaEm: IsoDateTime;
    observacao?: string | null;
};
export type ConferenciaFiscalEntradaResponse = {
    id: Guid;
    recebimentoCompraId: Guid;
    chaveAcesso?: string | null;
    serie: string;
    numero: string;
    cnpjEmitente: string;
    dataEmissaoNota: IsoDateTime;
    valorTotalNota: number;
    statusConferencia: StatusConferenciaFiscalEntrada | number;
    registradaEm: IsoDateTime;
    observacao?: string | null;
};
export type RecebimentoCompraDetalheResponse = {
    id: Guid;
    pedidoCompraId: Guid;
    documento: string;
    dataRecebimento: IsoDateTime;
    valorTotalRecebido: number;
    observacao?: string | null;
    itens: ItemRecebimentoCompraResponse[];
    divergencias: RecebimentoDivergenciaResponse[];
    conferenciaFiscal?: ConferenciaFiscalEntradaResponse | null;
};
export type DivergenciasListQuery = { empresaId?: Guid | null; pedidoCompraId?: Guid | null; recebimentoCompraId?: Guid | null };

// ---- Form value types ----
export type CriarSolicitacaoFormValues = { empresaId: string; filialId?: string | null; numero: string; dataSolicitacao?: Date | null; solicitante: string; justificativa?: string | null };
export type ItemSolicitacaoFormValues = { produtoId: string; quantidade: number; observacao?: string | null };
export type CriarCotacaoFormValues = { empresaId: string; filialId?: string | null; numero: string; fornecedorId: string; dataCotacao?: Date | null; validade?: Date | null; solicitacaoCompraId?: string | null; observacao?: string | null };
export type ItemCotacaoFormValues = { produtoId: string; quantidade: number; valorUnitario: number; observacao?: string | null };
export type AprovarCotacaoFormValues = { numeroPedido: string; dataEmissaoPedido?: Date | null; dataPrevisaoEntrega?: Date | null; condicaoPagamentoId?: string | null; observacao?: string | null };
export type ConferenciaFiscalFormValues = { chaveAcesso?: string | null; serie: string; numero: string; cnpjEmitente: string; dataEmissaoNota?: Date | null; valorTotalNota: number; observacao?: string | null };
