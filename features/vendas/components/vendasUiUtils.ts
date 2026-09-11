import { ZodError } from 'zod';
import { SelectOption, StatusPedidoVenda, TipoPedidoVenda } from '@/types/erp';
import { ClienteResponse } from '@/features/clientes/types/clientes.types';
import { ProdutoResponse } from '@/features/produtos/types/produtos.types';
import { LocalEstoqueResponse } from '@/features/estoque/types/estoque.types';
import { PedidoVendaResponse } from '@/features/vendas/types/vendas.types';

export { formatMoney, formatMoneyOptional } from '@/lib/formatters/money';

export type FieldErrors = Record<string, string | undefined>;

export const fieldErrorMap = (error: ZodError<unknown>): FieldErrors => {
    const flattened = error.flatten();
    const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;
    return Object.entries(fieldErrors).reduce<FieldErrors>((acc, [field, messages]) => {
        acc[field] = Array.isArray(messages) ? messages[0] : undefined;
        return acc;
    }, {});
};

export const textValue = (value: unknown) => (value === null || value === undefined ? '' : String(value));
export const dateFromIso = (value?: string | Date | null) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
};

export const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('pt-BR').format(date) : '-';
};

export const statusPedidoVendaLabel = (status?: number | string | null) => {
    const labels: Record<number, string> = {
        [StatusPedidoVenda.Rascunho]: 'Rascunho',
        [StatusPedidoVenda.AguardandoAprovacao]: 'Aguardando aprovação',
        [StatusPedidoVenda.Aprovado]: 'Aprovado',
        [StatusPedidoVenda.Cancelado]: 'Cancelado',
        [StatusPedidoVenda.Faturado]: 'Faturado'
    };
    return labels[Number(status)] ?? String(status ?? '-');
};


export const statusPedidoVendaTagValue = (status?: number | string | null) => {
    const labels: Record<number, string> = {
        [StatusPedidoVenda.Rascunho]: 'RASCUNHO',
        [StatusPedidoVenda.AguardandoAprovacao]: 'ENVIADO_APROVACAO',
        [StatusPedidoVenda.Aprovado]: 'APROVADO',
        [StatusPedidoVenda.Cancelado]: 'CANCELADO',
        [StatusPedidoVenda.Faturado]: 'FATURADO'
    };
    return labels[Number(status)] ?? String(status ?? '-');
};

export const tipoPedidoVendaLabel = (tipo?: number | string | null) => {
    const labels: Record<number, string> = {
        [TipoPedidoVenda.Orcamento]: 'Orçamento',
        [TipoPedidoVenda.Pedido]: 'Pedido'
    };
    return labels[Number(tipo)] ?? String(tipo ?? '-');
};

export const pedidoPodeEditar = (pedido?: PedidoVendaResponse | null) => Number(pedido?.statusPedido) === StatusPedidoVenda.Rascunho;
export const pedidoPodeEnviar = (pedido?: PedidoVendaResponse | null) => pedidoPodeEditar(pedido) && (pedido?.itens?.length ?? 0) > 0;
export const pedidoPodeAprovar = (pedido?: PedidoVendaResponse | null) => Number(pedido?.statusPedido) === StatusPedidoVenda.AguardandoAprovacao && (pedido?.itens?.length ?? 0) > 0;
export const pedidoPodeCancelar = (pedido?: PedidoVendaResponse | null) => [StatusPedidoVenda.Rascunho, StatusPedidoVenda.AguardandoAprovacao, StatusPedidoVenda.Aprovado].includes(Number(pedido?.statusPedido));
export const pedidoPodeFaturar = (pedido?: PedidoVendaResponse | null) => Number(pedido?.statusPedido) === StatusPedidoVenda.Aprovado;

export const pedidoVendaItensCount = (pedido?: PedidoVendaResponse | null): number => pedido?.itens?.length ?? 0;

export const pedidoVendaDescontoPercentual = (pedido?: PedidoVendaResponse | null): number => {
    const valorProdutos = Number(pedido?.valorProdutos ?? 0);
    if (valorProdutos <= 0) return 0;
    return (Number(pedido?.valorDesconto ?? 0) / valorProdutos) * 100;
};

export const pedidoVendaAcoesDisponiveis = (pedido?: PedidoVendaResponse | null): string[] => {
    if (!pedido) return [];
    const actions: string[] = [];
    if (pedidoPodeEditar(pedido)) actions.push('Editar cabeçalho e itens');
    if (pedidoPodeEnviar(pedido)) actions.push('Enviar para aprovação');
    if (pedidoPodeAprovar(pedido)) actions.push('Aprovar pedido');
    if (pedidoPodeFaturar(pedido)) actions.push('Faturar pedido');
    if (pedidoPodeCancelar(pedido)) actions.push('Cancelar com motivo');
    return actions;
};

export const pedidoVendaBloqueiosVisuais = (pedido?: PedidoVendaResponse | null): string[] => {
    if (!pedido) return [];
    const bloqueios: string[] = [];
    if (pedidoPodeEditar(pedido) && pedidoVendaItensCount(pedido) === 0) bloqueios.push('Inclua pelo menos um item para enviar o pedido para aprovação.');
    if (Number(pedido.statusPedido) === StatusPedidoVenda.Cancelado) bloqueios.push('Pedido cancelado não pode ser aprovado ou faturado.');
    if (Number(pedido.statusPedido) === StatusPedidoVenda.Faturado) bloqueios.push('Pedido faturado não deve ser alterado diretamente.');
    return bloqueios;
};

export const clienteOptions = (clientes: ClienteResponse[], pessoaLabelMap?: Map<string, string>): SelectOption<string>[] =>
    clientes.map((cliente) => ({ label: [cliente.codigo, pessoaLabelMap?.get(cliente.pessoaId) ?? 'Pessoa não carregada'].filter(Boolean).join(' • '), value: cliente.id }));

export const produtoOptions = (produtos: ProdutoResponse[]): SelectOption<string>[] =>
    produtos.map((produto) => ({ label: [produto.codigo, produto.descricao].filter(Boolean).join(' • '), value: produto.id }));

export const localOptions = (locais: LocalEstoqueResponse[]): SelectOption<string>[] =>
    locais.map((local) => ({ label: [local.codigo, local.nome].filter(Boolean).join(' • '), value: local.id }));

export const statusPedidoVendaOptions: SelectOption<number>[] = [
    { label: 'Rascunho', value: StatusPedidoVenda.Rascunho },
    { label: 'Aguardando aprovação', value: StatusPedidoVenda.AguardandoAprovacao },
    { label: 'Aprovado', value: StatusPedidoVenda.Aprovado },
    { label: 'Cancelado', value: StatusPedidoVenda.Cancelado },
    { label: 'Faturado', value: StatusPedidoVenda.Faturado }
];

export const tipoPedidoVendaOptions: SelectOption<number>[] = [
    { label: 'Orçamento', value: TipoPedidoVenda.Orcamento },
    { label: 'Pedido', value: TipoPedidoVenda.Pedido }
];
