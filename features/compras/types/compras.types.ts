import { Guid, IsoDateTime, StatusPedidoCompra } from '@/types/erp';

export type PedidoCompraListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    fornecedorId?: Guid | null;
    status?: StatusPedidoCompra | number | null;
    termo?: string | null;
};

// Espelha `ItemPedidoCompraResponse` (Erp.Application/Compras/Pedidos/PedidoCompraResponse.cs:21-34).
// `status` é o `EntityStatus` do item (Ativo/Inativo/...), herdado de `AuditableEntity`, e não um
// status de recebimento: o progresso de recebimento vem de `quantidadeRecebida`/`quantidadePendente`.
export type ItemPedidoCompraResponse = {
    id: Guid;
    sequencia: number;
    produtoId: Guid;
    localEstoqueId?: Guid | null;
    quantidade: number;
    quantidadeRecebida: number;
    quantidadePendente: number;
    valorUnitario: number;
    valorBruto: number;
    valorDesconto: number;
    valorTotal?: number;
    observacao?: string | null;
    status: string;
};

export type PedidoCompraResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    numero: string;
    fornecedorId: Guid;
    dataEmissao: IsoDateTime;
    dataPrevisaoEntrega?: IsoDateTime | null;
    condicaoPagamentoId?: Guid | null;
    statusPedido: StatusPedidoCompra | number;
    valorProdutos: number;
    valorDesconto: number;
    valorTotal: number;
    observacao?: string | null;
    itens: ItemPedidoCompraResponse[];
};

export type CriarPedidoCompraRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    numero: string;
    fornecedorId: Guid;
    dataEmissao: IsoDateTime | Date;
    dataPrevisaoEntrega?: IsoDateTime | Date | null;
    condicaoPagamentoId?: Guid | null;
    observacao?: string | null;
};

export type AtualizarPedidoCompraRequest = {
    dataPrevisaoEntrega?: IsoDateTime | Date | null;
    condicaoPagamentoId?: Guid | null;
    observacao?: string | null;
};

export type SalvarPedidoCompraValues = CriarPedidoCompraRequest & Partial<AtualizarPedidoCompraRequest> & { id?: Guid };

export type SalvarItemPedidoCompraRequest = {
    produtoId?: Guid;
    localEstoqueId: Guid;
    quantidade: number;
    valorUnitario: number;
    valorDesconto: number;
    observacao?: string | null;
};

export type ItemPedidoCompraFormValues = SalvarItemPedidoCompraRequest & { id?: Guid };

export type RemoverItemPedidoCompraRequest = { motivo: string };
export type CancelarPedidoCompraRequest = { motivo: string };
export type AprovarPedidoCompraRequest = { observacao?: string | null };

export type ItemRecebimentoCompraRequest = {
    itemPedidoCompraId: Guid;
    quantidade: number;
    localEstoqueId: Guid;
    valorUnitario: number;
};

export type ReceberPedidoCompraRequest = {
    documento: string;
    dataRecebimento: IsoDateTime | Date;
    permiteReceberAcimaDoPedido: boolean;
    gerarContaPagar: boolean;
    primeiroVencimento?: IsoDateTime | Date | null;
    observacao?: string | null;
    itens: ItemRecebimentoCompraRequest[];
};

export type ReceberPedidoCompraFormValues = Omit<ReceberPedidoCompraRequest, 'itens'> & {
    itens: Array<ItemRecebimentoCompraRequest & { produtoLabel?: string; selecionado?: boolean; quantidadePedido?: number }>;
};

export type PedidoCompraAction = 'enviar' | 'aprovar' | 'cancelar' | 'receber';
