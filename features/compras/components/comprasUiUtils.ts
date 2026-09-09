import { ZodError } from 'zod';
import { SelectOption, StatusPedidoCompra } from '@/types/erp';
import { FornecedorResponse } from '@/features/fornecedores/types/fornecedores.types';
import { ProdutoResponse } from '@/features/produtos/types/produtos.types';
import { LocalEstoqueResponse } from '@/features/estoque/types/estoque.types';
import { CondicaoPagamentoResponse } from '@/features/financeiro/types/financeiro.types';
import { PedidoCompraResponse } from '@/features/compras/types/compras.types';

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

export const statusPedidoCompraLabel = (status?: number | string | null) => {
    const labels: Record<number, string> = {
        [StatusPedidoCompra.Rascunho]: 'Rascunho',
        [StatusPedidoCompra.AguardandoAprovacao]: 'Aguardando aprovação',
        [StatusPedidoCompra.Aprovado]: 'Aprovado',
        [StatusPedidoCompra.ParcialmenteRecebido]: 'Parcialmente recebido',
        [StatusPedidoCompra.Recebido]: 'Recebido',
        [StatusPedidoCompra.Cancelado]: 'Cancelado'
    };
    return labels[Number(status)] ?? String(status ?? '-');
};

export const statusPedidoCompraTagValue = (status?: number | string | null) => {
    const labels: Record<number, string> = {
        [StatusPedidoCompra.Rascunho]: 'RASCUNHO',
        [StatusPedidoCompra.AguardandoAprovacao]: 'ENVIADO_APROVACAO',
        [StatusPedidoCompra.Aprovado]: 'APROVADO',
        [StatusPedidoCompra.ParcialmenteRecebido]: 'RECEBIDO_PARCIAL',
        [StatusPedidoCompra.Recebido]: 'RECEBIDO_TOTAL',
        [StatusPedidoCompra.Cancelado]: 'CANCELADO'
    };
    return labels[Number(status)] ?? String(status ?? '-');
};

export const pedidoCompraPodeEditar = (pedido?: PedidoCompraResponse | null) => Number(pedido?.statusPedido) === StatusPedidoCompra.Rascunho;
export const pedidoCompraPodeEnviar = (pedido?: PedidoCompraResponse | null) => pedidoCompraPodeEditar(pedido) && (pedido?.itens?.length ?? 0) > 0;
export const pedidoCompraPodeAprovar = (pedido?: PedidoCompraResponse | null) => Number(pedido?.statusPedido) === StatusPedidoCompra.AguardandoAprovacao && (pedido?.itens?.length ?? 0) > 0;
export const pedidoCompraPodeCancelar = (pedido?: PedidoCompraResponse | null) => [StatusPedidoCompra.Rascunho, StatusPedidoCompra.AguardandoAprovacao, StatusPedidoCompra.Aprovado].includes(Number(pedido?.statusPedido));
export const pedidoCompraPodeReceber = (pedido?: PedidoCompraResponse | null) => [StatusPedidoCompra.Aprovado, StatusPedidoCompra.ParcialmenteRecebido].includes(Number(pedido?.statusPedido)) && (pedido?.itens?.length ?? 0) > 0;

export const fornecedorOptions = (fornecedores: FornecedorResponse[], pessoaLabelMap?: Map<string, string>): SelectOption<string>[] =>
    fornecedores.map((fornecedor) => ({ label: [fornecedor.codigo, pessoaLabelMap?.get(fornecedor.pessoaId) ?? 'Pessoa não carregada'].filter(Boolean).join(' • '), value: fornecedor.id }));

export const produtoOptions = (produtos: ProdutoResponse[]): SelectOption<string>[] =>
    produtos.map((produto) => ({ label: [produto.codigo, produto.descricao].filter(Boolean).join(' • '), value: produto.id }));

export const localOptions = (locais: LocalEstoqueResponse[]): SelectOption<string>[] =>
    locais.map((local) => ({ label: [local.codigo, local.nome].filter(Boolean).join(' • '), value: local.id }));

export const condicaoPagamentoOptions = (condicoes: CondicaoPagamentoResponse[]): SelectOption<string>[] =>
    condicoes.map((condicao) => ({ label: [condicao.codigo, condicao.nome].filter(Boolean).join(' • '), value: condicao.id }));

export const statusPedidoCompraOptions: SelectOption<number>[] = [
    { label: 'Rascunho', value: StatusPedidoCompra.Rascunho },
    { label: 'Aguardando aprovação', value: StatusPedidoCompra.AguardandoAprovacao },
    { label: 'Aprovado', value: StatusPedidoCompra.Aprovado },
    { label: 'Parcialmente recebido', value: StatusPedidoCompra.ParcialmenteRecebido },
    { label: 'Recebido', value: StatusPedidoCompra.Recebido },
    { label: 'Cancelado', value: StatusPedidoCompra.Cancelado }
];

export type PedidoCompraStatusStep = {
    key: string;
    label: string;
    active: boolean;
    done: boolean;
    severity?: 'success' | 'info' | 'warning' | 'danger';
};

export type PedidoCompraOperationalBlock = {
    key: string;
    label: string;
    blocked: boolean;
    severity?: 'success' | 'info' | 'warning' | 'danger';
};

export const getPedidoCompraItensCount = (pedido?: PedidoCompraResponse | null) => pedido?.itens?.length ?? 0;

export const getPedidoCompraDescontoPercentual = (pedido?: PedidoCompraResponse | null) => {
    const produtos = Number(pedido?.valorProdutos ?? 0);
    const desconto = Number(pedido?.valorDesconto ?? 0);
    return produtos > 0 ? (desconto / produtos) * 100 : 0;
};

export const getPedidoCompraStatusSteps = (pedido?: PedidoCompraResponse | null): PedidoCompraStatusStep[] => {
    const status = Number(pedido?.statusPedido ?? StatusPedidoCompra.Rascunho);
    const cancelado = status === StatusPedidoCompra.Cancelado;
    const recebido = status === StatusPedidoCompra.Recebido;
    const parcial = status === StatusPedidoCompra.ParcialmenteRecebido;

    return [
        {
            key: 'rascunho',
            label: 'Rascunho',
            active: status === StatusPedidoCompra.Rascunho,
            done: status > StatusPedidoCompra.Rascunho && !cancelado,
            severity: status === StatusPedidoCompra.Rascunho ? 'info' : 'success'
        },
        {
            key: 'aprovacao',
            label: 'Aprovação',
            active: status === StatusPedidoCompra.AguardandoAprovacao,
            done: status >= StatusPedidoCompra.Aprovado && !cancelado,
            severity: status === StatusPedidoCompra.AguardandoAprovacao ? 'warning' : 'success'
        },
        {
            key: 'aprovado',
            label: 'Aprovado',
            active: status === StatusPedidoCompra.Aprovado,
            done: parcial || recebido,
            severity: status === StatusPedidoCompra.Aprovado ? 'success' : parcial || recebido ? 'success' : 'info'
        },
        {
            key: 'recebimento',
            label: recebido ? 'Recebido' : parcial ? 'Parcial' : 'Recebimento',
            active: parcial || recebido,
            done: recebido,
            severity: recebido ? 'success' : parcial ? 'warning' : 'info'
        },
        {
            key: 'cancelado',
            label: 'Cancelado',
            active: cancelado,
            done: false,
            severity: cancelado ? 'danger' : 'info'
        }
    ];
};

export const getPedidoCompraOperationalBlocks = (pedido?: PedidoCompraResponse | null): PedidoCompraOperationalBlock[] => {
    const itensCount = getPedidoCompraItensCount(pedido);
    const status = Number(pedido?.statusPedido ?? 0);
    const cancelado = status === StatusPedidoCompra.Cancelado;
    const recebido = status === StatusPedidoCompra.Recebido;
    const rascunho = status === StatusPedidoCompra.Rascunho;

    return [
        {
            key: 'itens',
            label: itensCount > 0 ? `${itensCount} item(ns) informado(s)` : 'Inclua ao menos um item antes de enviar para aprovação',
            blocked: itensCount === 0,
            severity: itensCount === 0 ? 'warning' : 'success'
        },
        {
            key: 'edicao',
            label: rascunho ? 'Cabeçalho e itens liberados para edição' : 'Edição bloqueada pelo status atual',
            blocked: !rascunho,
            severity: rascunho ? 'success' : 'info'
        },
        {
            key: 'recebimento',
            label: pedidoCompraPodeReceber(pedido) ? 'Recebimento liberado' : 'Recebimento aguardando aprovação ou bloqueado pelo status',
            blocked: !pedidoCompraPodeReceber(pedido),
            severity: pedidoCompraPodeReceber(pedido) ? 'success' : 'info'
        },
        {
            key: 'finalizado',
            label: recebido ? 'Pedido recebido: alterações diretas bloqueadas' : cancelado ? 'Pedido cancelado: fluxo encerrado' : 'Fluxo em andamento',
            blocked: recebido || cancelado,
            severity: recebido ? 'success' : cancelado ? 'danger' : 'info'
        }
    ];
};

export const getPedidoCompraNextAction = (pedido?: PedidoCompraResponse | null) => {
    if (!pedido) return 'Carregando pedido de compra.';
    if (pedidoCompraPodeEnviar(pedido)) return 'Próxima ação recomendada: enviar para aprovação.';
    if (pedidoCompraPodeAprovar(pedido)) return 'Próxima ação recomendada: aprovar o pedido.';
    if (pedidoCompraPodeReceber(pedido)) return 'Próxima ação recomendada: registrar recebimento.';
    if (Number(pedido.statusPedido) === StatusPedidoCompra.Recebido) return 'Pedido recebido. Consulte estoque e financeiro para conferir os impactos.';
    if (Number(pedido.statusPedido) === StatusPedidoCompra.Cancelado) return 'Pedido cancelado. Não há próximas ações operacionais.';
    if ((pedido.itens?.length ?? 0) === 0) return 'Inclua itens para continuar o fluxo de compras.';
    return 'Nenhuma ação pendente para o status atual.';
};

export const calculateRecebimentoTotals = (items: Array<{ selecionado?: boolean; quantidade?: number | null; valorUnitario?: number | null }>) => {
    const selected = items.filter((item) => item.selecionado);
    const total = selected.reduce((acc, item) => acc + Number(item.quantidade ?? 0) * Number(item.valorUnitario ?? 0), 0);
    return { selectedCount: selected.length, total };
};
