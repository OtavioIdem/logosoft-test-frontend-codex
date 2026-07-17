import { Guid, IsoDateTime } from '@/types/erp';

export enum StatusCaixa {
    Aberto = 1,
    Fechado = 2
}

export enum TipoMovimentoCaixa {
    Abertura = 1,
    Suprimento = 2,
    Sangria = 3,
    RecebimentoVenda = 4
}

export enum MeioPagamento {
    Dinheiro = 1,
    Cartao = 2,
    Pix = 3,
    Outro = 4
}

export enum StatusVendaPdv {
    EmDigitacao = 1,
    Finalizada = 2,
    Cancelada = 3
}

export type MovimentoCaixaResponse = {
    id: Guid;
    sequencia: number;
    tipo: TipoMovimentoCaixa | number;
    meioPagamento: MeioPagamento | number;
    valor: number;
    descricao: string;
    vendaPdvId?: Guid | null;
    data: IsoDateTime;
};

export type CaixaResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    codigo: string;
    operadorId: Guid;
    terminal: string;
    dataAbertura: IsoDateTime;
    valorAbertura: number;
    statusCaixa: StatusCaixa | number;
    dataFechamento?: IsoDateTime | null;
    totalSuprimentos: number;
    totalSangrias: number;
    totalRecebimentoDinheiro: number;
    totalRecebimentoCartao: number;
    totalRecebimentoPix: number;
    totalRecebimentoOutro: number;
    totalVendas: number;
    saldoDinheiroEsperado: number;
    valorEsperadoDinheiro?: number | null;
    valorInformadoFechamento?: number | null;
    diferencaFechamento?: number | null;
    movimentos: MovimentoCaixaResponse[];
};

export type ItemVendaPdvResponse = {
    id: Guid;
    sequencia: number;
    produtoId: Guid;
    quantidade: number;
    valorUnitario: number;
    valorDesconto: number;
    valorTotal: number;
};

export type PagamentoVendaPdvResponse = {
    id: Guid;
    sequencia: number;
    formaPagamentoId: Guid;
    meio: MeioPagamento | number;
    valor: number;
};

export type VendaPdvResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    numero: string;
    caixaId: Guid;
    operadorId: Guid;
    localEstoqueId: Guid;
    clienteId?: Guid | null;
    dataVenda: IsoDateTime;
    statusVenda: StatusVendaPdv | number;
    valorBruto: number;
    valorDesconto: number;
    valorLiquido: number;
    valorPago: number;
    troco: number;
    itens: ItemVendaPdvResponse[];
    pagamentos: PagamentoVendaPdvResponse[];
};

export type CaixasListQuery = { empresaId?: Guid | null; filialId?: Guid | null; status?: StatusCaixa | number | null; operadorId?: Guid | null };
export type VendasPdvListQuery = { empresaId?: Guid | null; filialId?: Guid | null; caixaId?: Guid | null; status?: StatusVendaPdv | number | null };

// ---- Form value types ----
export type AbrirCaixaFormValues = { empresaId: string; filialId?: string | null; codigo: string; terminal: string; valorAbertura: number };
export type MovimentoCaixaFormValues = { valor: number; descricao: string };
export type FecharCaixaFormValues = { valorInformado: number };

export type ItemVendaFormValues = { produtoId: string; quantidade: number; valorUnitario: number; valorDesconto: number };
export type PagamentoVendaFormValues = { formaPagamentoId: string; meio: MeioPagamento | number; valor: number };
export type RegistrarVendaFormValues = {
    caixaId: string;
    localEstoqueId: string;
    clienteId?: string | null;
    itens: ItemVendaFormValues[];
    pagamentos: PagamentoVendaFormValues[];
};
