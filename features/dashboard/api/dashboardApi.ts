import { httpClient, rawHttpClient } from '@/lib/http/httpClient';
import { formatMoney } from '@/lib/formatters/money';
import { mapApiError } from '@/lib/http/apiError';
import { DashboardAuditItem, DashboardData, DashboardMetric } from '@/features/dashboard/types/dashboard.types';
import { EstoqueSaldo, PedidoCompra, PedidoVenda, StatusContaFinanceira, StatusPedidoCompra, StatusPedidoVenda } from '@/types/erp';

type ContaFinanceiraResumo = { valorSaldo?: number | null; valorOriginal?: number | null; status?: number | string | null };
type AuditoriaEventoResumo = { id: string; modulo: string; entidade: string; acao: number; descricao: string; criadoEm: string };
type EndpointResult<T> = { data: T; warning?: string };

const safeGet = async <T>(label: string, endpoint: string, fallback: T): Promise<EndpointResult<T>> => {
    try {
        const response = await httpClient.get<T>(endpoint);
        return { data: response.data };
    } catch (error) {
        const apiError = mapApiError(error);
        return { data: fallback, warning: `${label}: ${apiError.message}` };
    }
};

const safeHealth = async () => {
    try {
        const response = await rawHttpClient.get<{ status: string }>('/api/health');
        return response.data.status;
    } catch {
        return 'indisponível';
    }
};

const sum = (values: Array<number | null | undefined>): number => values.reduce<number>((total, value) => total + Number(value ?? 0), 0);
const countBy = <T>(items: T[], predicate: (item: T) => boolean) => items.filter(predicate).length;
const isOpenFinancialStatus = (status?: number | string | null) => status === StatusContaFinanceira.Aberta || status === StatusContaFinanceira.ParcialmenteQuitada || status === 'ABERTO' || status === 'PARCIAL';

const buildMetrics = (data: {
    pedidosVenda: PedidoVenda[];
    contasReceber: ContaFinanceiraResumo[];
    contasPagar: ContaFinanceiraResumo[];
    saldos: EstoqueSaldo[];
    pedidosCompra: PedidoCompra[];
    auditoria: AuditoriaEventoResumo[];
    unavailable: Set<string>;
}): DashboardMetric[] => {
    const vendasPendentes = countBy(data.pedidosVenda, (pedido) => [StatusPedidoVenda.Rascunho, StatusPedidoVenda.AguardandoAprovacao, StatusPedidoVenda.Aprovado].includes(Number(pedido.statusPedido)));
    const totalReceber = sum(data.contasReceber.filter((conta) => isOpenFinancialStatus(conta.status)).map((conta) => conta.valorSaldo));
    const totalPagar = sum(data.contasPagar.filter((conta) => isOpenFinancialStatus(conta.status)).map((conta) => conta.valorSaldo));
    const estoqueAtencao = countBy(data.saldos, (saldo) => Number(saldo.quantidadeDisponivel ?? 0) <= 0);
    const comprasPendentes = countBy(data.pedidosCompra, (pedido) => [StatusPedidoCompra.Rascunho, StatusPedidoCompra.AguardandoAprovacao, StatusPedidoCompra.Aprovado, StatusPedidoCompra.ParcialmenteRecebido].includes(Number(pedido.statusPedido)));

    return [
        { key: 'vendas', title: 'Pedidos de venda ativos', value: String(vendasPendentes), detail: 'Rascunhos, aprovações e pedidos aprovados ainda em operação.', icon: 'pi-shopping-cart', permission: 'VENDAS_CONSULTAR', href: '/vendas/pedidos', severity: 'info', unavailable: data.unavailable.has('vendas') },
        { key: 'receber', title: 'Contas a receber em aberto', value: formatMoney(totalReceber), detail: 'Saldo aberto ou parcialmente quitado.', icon: 'pi-arrow-down-left', permission: 'FINANCEIRO_CONSULTAR', href: '/financeiro/contas-receber', severity: 'success', unavailable: data.unavailable.has('receber') },
        { key: 'pagar', title: 'Contas a pagar em aberto', value: formatMoney(totalPagar), detail: 'Saldo aberto ou parcialmente quitado.', icon: 'pi-arrow-up-right', permission: 'FINANCEIRO_CONSULTAR', href: '/financeiro/contas-pagar', severity: 'warning', unavailable: data.unavailable.has('pagar') },
        { key: 'estoque', title: 'Produtos sem saldo disponível', value: String(estoqueAtencao), detail: 'Saldos com disponibilidade zerada ou negativa.', icon: 'pi-box', permission: 'ESTOQUE_CONSULTAR', href: '/estoque/saldos', severity: estoqueAtencao > 0 ? 'danger' : 'success', unavailable: data.unavailable.has('estoque') },
        { key: 'compras', title: 'Compras pendentes', value: String(comprasPendentes), detail: 'Pedidos em rascunho, aprovação, aprovados ou parcialmente recebidos.', icon: 'pi-shopping-bag', permission: 'COMPRAS_CONSULTAR', href: '/compras/pedidos', severity: 'info', unavailable: data.unavailable.has('compras') },
        { key: 'auditoria', title: 'Eventos recentes', value: String(data.auditoria.length), detail: 'Eventos retornados pela API de auditoria.', icon: 'pi-history', permission: 'AUDITORIA_CONSULTAR', href: '/auditoria/eventos', severity: 'info', unavailable: data.unavailable.has('auditoria') }
    ];
};

export const dashboardApi = {
    async carregar(): Promise<DashboardData> {
        const [health, pedidosVenda, contasReceber, contasPagar, saldos, pedidosCompra, auditoria] = await Promise.all([
            safeHealth(),
            safeGet<PedidoVenda[]>('Vendas', '/api/vendas/pedidos', []),
            safeGet<ContaFinanceiraResumo[]>('Contas a receber', '/api/financeiro/contas-receber', []),
            safeGet<ContaFinanceiraResumo[]>('Contas a pagar', '/api/financeiro/contas-pagar', []),
            safeGet<EstoqueSaldo[]>('Saldos de estoque', '/api/estoque/saldos', []),
            safeGet<PedidoCompra[]>('Compras', '/api/compras/pedidos', []),
            safeGet<AuditoriaEventoResumo[]>('Auditoria', '/api/auditoria/eventos', [])
        ]);
        const warnings = [pedidosVenda.warning, contasReceber.warning, contasPagar.warning, saldos.warning, pedidosCompra.warning, auditoria.warning].filter((warning): warning is string => Boolean(warning));
        if (health !== 'ok') warnings.push('Health check da API indisponível ou fora do padrão esperado.');
        const unavailable = new Set<string>();
        if (pedidosVenda.warning) unavailable.add('vendas');
        if (contasReceber.warning) unavailable.add('receber');
        if (contasPagar.warning) unavailable.add('pagar');
        if (saldos.warning) unavailable.add('estoque');
        if (pedidosCompra.warning) unavailable.add('compras');
        if (auditoria.warning) unavailable.add('auditoria');
        const metrics = buildMetrics({ pedidosVenda: pedidosVenda.data, contasReceber: contasReceber.data, contasPagar: contasPagar.data, saldos: saldos.data, pedidosCompra: pedidosCompra.data, auditoria: auditoria.data, unavailable });
        const criticalFlows = [
            { name: 'Pedido de venda', status: 'Rascunho', href: '/vendas/pedidos', permission: 'VENDAS_CONSULTAR' as const, detail: 'Criação, aprovação e faturamento.' },
            { name: 'Pedido de compra', status: 'Rascunho', href: '/compras/pedidos', permission: 'COMPRAS_CONSULTAR' as const, detail: 'Aprovação, recebimento e geração financeira.' },
            { name: 'Saldo de estoque', status: 'Ativo', href: '/estoque/saldos', permission: 'ESTOQUE_CONSULTAR' as const, detail: 'Consulta operacional por produto e local.' },
            { name: 'Contas financeiras', status: 'Aberta', href: '/financeiro/contas-receber', permission: 'FINANCEIRO_CONSULTAR' as const, detail: 'Baixas, estornos e cancelamentos.' }
        ];
        const auditItems: DashboardAuditItem[] = auditoria.data.slice(0, 5).map((evento) => ({ id: evento.id, modulo: evento.modulo, entidade: evento.entidade, acao: evento.acao, descricao: evento.descricao, criadoEm: evento.criadoEm }));
        return { metrics, criticalFlows, auditItems, warnings, generatedAt: new Date().toISOString() };
    }
};
