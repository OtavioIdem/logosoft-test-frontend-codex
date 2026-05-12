import { Guid, IsoDateTime, StatusPedidoVenda, TipoPedidoVenda } from '@/types/erp';

export type PedidoVendaListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    clienteId?: Guid | null;
    status?: StatusPedidoVenda | number | null;
    termo?: string | null;
};

export type ItemPedidoVendaResponse = {
    id: Guid;
    produtoId: Guid;
    localEstoqueId?: Guid | null;
    quantidade: number;
    valorUnitario: number;
    valorDesconto: number;
    valorTotal?: number;
    observacao?: string | null;
};

export type PedidoVendaResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    numero: string;
    clienteId: Guid;
    dataEmissao: IsoDateTime;
    dataPrevisaoEntrega?: IsoDateTime | null;
    tipo: TipoPedidoVenda | number;
    statusPedido: StatusPedidoVenda | number;
    valorProdutos: number;
    valorDesconto: number;
    valorTotal: number;
    observacao?: string | null;
    motivoCancelamento?: string | null;
    aprovadoEm?: IsoDateTime | null;
    canceladoEm?: IsoDateTime | null;
    faturadoEm?: IsoDateTime | null;
    itens: ItemPedidoVendaResponse[];
};

export type CriarPedidoVendaRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    numero: string;
    clienteId: Guid;
    dataEmissao: IsoDateTime | Date;
    dataPrevisaoEntrega?: IsoDateTime | Date | null;
    tipo: TipoPedidoVenda | number;
    observacao?: string | null;
};

export type AtualizarPedidoVendaRequest = {
    dataPrevisaoEntrega?: IsoDateTime | Date | null;
    tipo: TipoPedidoVenda | number;
    observacao?: string | null;
};

export type SalvarPedidoVendaValues = CriarPedidoVendaRequest & Partial<AtualizarPedidoVendaRequest> & { id?: Guid };

export type SalvarItemPedidoVendaRequest = {
    produtoId?: Guid;
    localEstoqueId?: Guid | null;
    quantidade: number;
    valorUnitario: number;
    valorDesconto: number;
    observacao?: string | null;
};

export type ItemPedidoVendaFormValues = SalvarItemPedidoVendaRequest & { id?: Guid };

export type RemoverItemPedidoVendaRequest = { motivo: string };
export type CancelarPedidoVendaRequest = { motivo: string };
export type AprovarPedidoVendaRequest = { reservarEstoque: boolean; observacao?: string | null };
export type FaturarPedidoVendaRequest = { baixarEstoque: boolean; documento: string; observacao?: string | null };

export type PedidoVendaAction = 'enviar' | 'aprovar' | 'cancelar' | 'faturar';
