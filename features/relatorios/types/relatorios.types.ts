import { Guid, IsoDateTime } from '@/types/erp';

export type RelatorioPeriodoQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    dataInicial: IsoDateTime | Date;
    dataFinal: IsoDateTime | Date;
};

export type RelatorioContexto = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
};

export type RelatorioPeriodo = {
    dataInicial?: IsoDateTime | null;
    dataFinal?: IsoDateTime | null;
};

export type RelatorioResponse = {
    contexto?: RelatorioContexto;
    periodo?: RelatorioPeriodo;
    [key: string]: unknown;
};

export type RelatorioOperacionalResponse = RelatorioResponse;
export type RelatorioGerencialVendasResponse = RelatorioResponse & {
    totalPedidos?: number;
    totalItens?: number;
    totalClientesComPedido?: number;
    pedidosComFinanceiroGerado?: number;
    pedidosComEstoqueMovimentado?: number;
};
export type RelatorioGerencialComprasResponse = RelatorioResponse;
export type RelatorioGerencialFinanceiroResponse = RelatorioResponse & {
    contasReceber?: number;
    contasPagar?: number;
    valorReceberOriginal?: number;
    valorPagarOriginal?: number;
    saldoReceberEmAberto?: number;
    saldoPagarEmAberto?: number;
    entradasRealizadas?: number;
    saidasRealizadas?: number;
    saldoProjetado?: number;
    saldoRealizado?: number;
};
export type RelatorioGerencialEstoqueResponse = RelatorioResponse;
export type RelatorioGerencialFiscalResponse = RelatorioResponse;
export type RelatorioGerencialProducaoResponse = RelatorioResponse & {
    ordensPlanejadas?: number;
    ordensEmProducao?: number;
    ordensEncerradas?: number;
    quantidadeProduzida?: number;
    custoConsolidado?: number;
};
export type RelatorioDashboardConsolidadoResponse = RelatorioResponse & {
    vendas?: RelatorioGerencialVendasResponse;
    compras?: RelatorioGerencialComprasResponse;
    financeiro?: RelatorioGerencialFinanceiroResponse;
    estoque?: RelatorioGerencialEstoqueResponse;
    fiscal?: RelatorioGerencialFiscalResponse;
    producao?: RelatorioGerencialProducaoResponse;
};

export type RelatorioModulo = 'operacional' | 'vendas' | 'compras' | 'financeiro' | 'estoque' | 'fiscal' | 'producao';
export type RelatorioAreaExportavel = 'vendas' | 'compras' | 'financeiro' | 'estoque' | 'fiscal' | 'producao';
export type RelatorioFormatoExportacao = 'csv' | 'xlsx' | 'pdf';
