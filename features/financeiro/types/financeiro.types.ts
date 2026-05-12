import { EntityStatus, Guid, IsoDateTime, OrigemFinanceira, StatusContaFinanceira, StatusParcelaFinanceira } from '@/types/erp';

export type FinanceiroListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    clienteId?: Guid | null;
    fornecedorId?: Guid | null;
    status?: number | null;
};

export type FormaPagamentoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    codigo: string;
    nome: string;
    permiteRecebimento: boolean;
    permitePagamento: boolean;
    status?: EntityStatus | number;
};

export type CondicaoPagamentoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    codigo: string;
    nome: string;
    quantidadeParcelas: number;
    intervaloDias: number;
    permiteEntrada: boolean;
    status?: EntityStatus | number;
};

export type ParcelaReceberResponse = {
    id: Guid;
    numero: number;
    vencimento: IsoDateTime;
    valor: number;
    saldo?: number | null;
    status?: StatusParcelaFinanceira | number;
};

export type RecebimentoResponse = {
    id: Guid;
    parcelaId: Guid;
    formaPagamentoId: Guid;
    dataRecebimento: IsoDateTime;
    valorRecebido: number;
    valorJuros?: number;
    valorMulta?: number;
    valorDesconto?: number;
    observacao?: string | null;
};

export type ContaReceberResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    clienteId: Guid;
    documento: string;
    origem: OrigemFinanceira | number;
    origemId?: Guid | null;
    dataEmissao: IsoDateTime;
    observacao?: string | null;
    valorTotal?: number | null;
    saldo?: number | null;
    status?: EntityStatus | number;
    statusConta?: StatusContaFinanceira | number;
    parcelas?: ParcelaReceberResponse[];
    recebimentos?: RecebimentoResponse[];
};

export type ParcelaPagarResponse = {
    id: Guid;
    numero: number;
    vencimento: IsoDateTime;
    valor: number;
    saldo?: number | null;
    status?: StatusParcelaFinanceira | number;
};

export type PagamentoResponse = {
    id: Guid;
    parcelaId: Guid;
    formaPagamentoId: Guid;
    dataPagamento: IsoDateTime;
    valorPago: number;
    valorJuros?: number;
    valorMulta?: number;
    valorDesconto?: number;
    observacao?: string | null;
};

export type ContaPagarResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    fornecedorId: Guid;
    documento: string;
    origem: OrigemFinanceira | number;
    origemId?: Guid | null;
    dataEmissao: IsoDateTime;
    observacao?: string | null;
    valorTotal?: number | null;
    saldo?: number | null;
    status?: EntityStatus | number;
    statusConta?: StatusContaFinanceira | number;
    parcelas?: ParcelaPagarResponse[];
    pagamentos?: PagamentoResponse[];
};

export type CriarFormaPagamentoRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    codigo: string;
    nome: string;
    permiteRecebimento: boolean;
    permitePagamento: boolean;
};

export type AtualizarFormaPagamentoRequest = {
    nome: string;
    permiteRecebimento: boolean;
    permitePagamento: boolean;
};

export type FormaPagamentoFormValues = CriarFormaPagamentoRequest & Partial<AtualizarFormaPagamentoRequest> & { id?: Guid };

export type CriarCondicaoPagamentoRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    codigo: string;
    nome: string;
    quantidadeParcelas: number;
    intervaloDias: number;
    permiteEntrada: boolean;
};

export type AtualizarCondicaoPagamentoRequest = {
    nome: string;
    quantidadeParcelas: number;
    intervaloDias: number;
    permiteEntrada: boolean;
};

export type CondicaoPagamentoFormValues = CriarCondicaoPagamentoRequest & Partial<AtualizarCondicaoPagamentoRequest> & { id?: Guid };

export type ParcelaFinanceiraRequest = {
    numero: number;
    vencimento: IsoDateTime | Date;
    valor: number;
};

export type CriarContaReceberRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    clienteId: Guid;
    documento: string;
    origem: OrigemFinanceira | number;
    origemId?: Guid | null;
    dataEmissao: IsoDateTime | Date;
    observacao?: string | null;
    parcelas: ParcelaFinanceiraRequest[];
};

export type GerarContaReceberPedidoRequest = {
    condicaoPagamentoId?: Guid | null;
    primeiraDataVencimento: IsoDateTime | Date;
    documento: string;
    observacao?: string | null;
};

export type ReceberContaRequest = {
    parcelaId: Guid;
    formaPagamentoId: Guid;
    dataRecebimento: IsoDateTime | Date;
    valorRecebido: number;
    valorJuros: number;
    valorMulta: number;
    valorDesconto: number;
    gerarMovimentoCaixa: boolean;
    gerarMovimentoBancario: boolean;
    contaBancariaReferencia?: string | null;
    observacao?: string | null;
};

export type EstornarRecebimentoRequest = { recebimentoId: Guid; motivo: string };
export type CancelarContaFinanceiraRequest = { motivo: string };

export type CriarContaPagarRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    fornecedorId: Guid;
    documento: string;
    origem: OrigemFinanceira | number;
    origemId?: Guid | null;
    dataEmissao: IsoDateTime | Date;
    observacao?: string | null;
    parcelas: ParcelaFinanceiraRequest[];
};

export type PagarContaRequest = {
    parcelaId: Guid;
    formaPagamentoId: Guid;
    dataPagamento: IsoDateTime | Date;
    valorPago: number;
    valorJuros: number;
    valorMulta: number;
    valorDesconto: number;
    gerarMovimentoCaixa: boolean;
    gerarMovimentoBancario: boolean;
    contaBancariaReferencia?: string | null;
    observacao?: string | null;
};

export type EstornarPagamentoRequest = { pagamentoId: Guid; motivo: string };

export type ContaReceberFormValues = CriarContaReceberRequest;
export type ContaPagarFormValues = CriarContaPagarRequest;
export type FinanceiroActionKind = 'receber' | 'pagar' | 'estornarRecebimento' | 'estornarPagamento' | 'cancelar' | 'gerarPedidoVenda';
