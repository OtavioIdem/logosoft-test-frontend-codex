import { expect, request as playwrightRequest, test } from '@playwright/test';

const apiUrl = process.env.LOGOSOFT_OPERATIONAL_CONTRACT_API_URL?.replace(/\/+$/, '');
const accessToken = process.env.LOGOSOFT_OPERATIONAL_CONTRACT_ACCESS_TOKEN;
const empresaId = process.env.LOGOSOFT_OPERATIONAL_CONTRACT_EMPRESA_ID;
const filialId = process.env.LOGOSOFT_OPERATIONAL_CONTRACT_FILIAL_ID;
const pedidoVendaIdFromEnv = process.env.LOGOSOFT_OPERATIONAL_CONTRACT_PEDIDO_VENDA_ID;
const contaReceberIdFromEnv = process.env.LOGOSOFT_OPERATIONAL_CONTRACT_CONTA_RECEBER_ID;
const contaPagarIdFromEnv = process.env.LOGOSOFT_OPERATIONAL_CONTRACT_CONTA_PAGAR_ID;
const origemId = process.env.LOGOSOFT_OPERATIONAL_CONTRACT_ORIGEM_ID;

const shouldRun = Boolean(apiUrl && accessToken && empresaId);
const sensitiveKeyPattern = /(?:token|senha|password|secret|segredo|certificate|certificado|chave|privateKey|accessToken|refreshToken)/i;
const sensitiveValuePatterns = [
    /Bearer\s+[A-Za-z0-9._-]+/i,
    /-----BEGIN\s+(?:CERTIFICATE|PRIVATE KEY)-----/i,
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    /sk-[A-Za-z0-9]/i
];

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const hasOwn = (source: unknown, key: string) => Object.prototype.hasOwnProperty.call(source, key);

const buildQuery = (params: Record<string, string | number | boolean | null | undefined>) => {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined || value === '') continue;
        query.set(key, String(value));
    }

    return query.toString();
};

const requireRecord = (value: unknown, label: string): JsonRecord => {
    expect(isRecord(value), `${label} deve ser objeto`).toBe(true);
    return value as JsonRecord;
};

const requireArray = (value: unknown, label: string): unknown[] => {
    expect(Array.isArray(value), `${label} deve ser array`).toBe(true);
    return value as unknown[];
};

const requireString = (source: JsonRecord, key: string, label: string) => {
    expect(typeof source[key], `${label}.${key} deve ser string`).toBe('string');
};

const requireNumber = (source: JsonRecord, key: string, label: string) => {
    expect(typeof source[key], `${label}.${key} deve ser number`).toBe('number');
};

const requireOptionalString = (source: JsonRecord, key: string, label: string) => {
    if (source[key] === null || source[key] === undefined) return;
    requireString(source, key, label);
};

const requireOptionalNumber = (source: JsonRecord, key: string, label: string) => {
    if (source[key] === null || source[key] === undefined) return;
    requireNumber(source, key, label);
};

const assertNoSensitiveObject = (value: unknown, label: string) => {
    if (typeof value === 'string') {
        for (const pattern of sensitiveValuePatterns) {
            expect(pattern.test(value), `${label} não deve expor token, segredo, certificado ou JWT`).toBe(false);
        }
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item, index) => assertNoSensitiveObject(item, `${label}[${index}]`));
        return;
    }

    if (!isRecord(value)) return;

    for (const [key, nested] of Object.entries(value)) {
        expect(sensitiveKeyPattern.test(key), `${label}.${key} não deve expor campo sensível`).toBe(false);
        assertNoSensitiveObject(nested, `${label}.${key}`);
    }
};

const assertArrayEndpoint = async (api: Awaited<ReturnType<typeof playwrightRequest.newContext>>, path: string, label: string) => {
    const response = await api.get(path);
    expect(response.ok(), `${label} deve retornar 2xx: ${response.status()}`).toBe(true);
    const body = await response.json();
    const items = requireArray(body, label);
    assertNoSensitiveObject(items, label);
    return items;
};

const firstRecord = (items: unknown[]) => items.find(isRecord) as JsonRecord | undefined;

const assertPedidoVenda = (value: unknown, label: string) => {
    const pedido = requireRecord(value, label);
    requireString(pedido, 'id', label);
    requireString(pedido, 'empresaId', label);
    requireString(pedido, 'numero', label);
    requireString(pedido, 'clienteId', label);
    requireString(pedido, 'dataEmissao', label);
    requireNumber(pedido, 'tipo', label);
    requireNumber(pedido, 'statusPedido', label);
    requireNumber(pedido, 'valorProdutos', label);
    requireNumber(pedido, 'valorDesconto', label);
    requireNumber(pedido, 'valorTotal', label);
    requireArray(pedido.itens, `${label}.itens`);
    assertNoSensitiveObject(pedido, label);
};

const assertEstoqueSaldo = (value: unknown, label: string) => {
    const saldo = requireRecord(value, label);
    requireString(saldo, 'id', label);
    requireOptionalString(saldo, 'empresaId', label);
    requireString(saldo, 'produtoId', label);
    requireString(saldo, 'localEstoqueId', label);
    requireNumber(saldo, 'quantidadeAtual', label);
    requireNumber(saldo, 'quantidadeReservada', label);
    assertNoSensitiveObject(saldo, label);
};

const assertMovimentoEstoque = (value: unknown, label: string) => {
    const movimento = requireRecord(value, label);
    requireString(movimento, 'id', label);
    requireOptionalString(movimento, 'empresaId', label);
    requireString(movimento, 'produtoId', label);
    requireString(movimento, 'localEstoqueId', label);
    requireOptionalNumber(movimento, 'tipoMovimento', label);
    requireNumber(movimento, 'quantidade', label);
    requireOptionalString(movimento, 'origemModulo', label);
    requireOptionalString(movimento, 'origemId', label);
    assertNoSensitiveObject(movimento, label);
};

const assertReservaEstoque = (value: unknown, label: string) => {
    const reserva = requireRecord(value, label);
    requireString(reserva, 'id', label);
    requireOptionalString(reserva, 'empresaId', label);
    requireString(reserva, 'produtoId', label);
    requireString(reserva, 'localEstoqueId', label);
    requireNumber(reserva, 'quantidade', label);
    requireOptionalNumber(reserva, 'statusReserva', label);
    requireOptionalString(reserva, 'origemId', label);
    assertNoSensitiveObject(reserva, label);
};

const assertContaReceber = (value: unknown, label: string) => {
    const conta = requireRecord(value, label);
    requireString(conta, 'id', label);
    requireString(conta, 'empresaId', label);
    requireString(conta, 'clienteId', label);
    requireString(conta, 'documento', label);
    requireNumber(conta, 'origem', label);
    requireString(conta, 'dataEmissao', label);
    requireOptionalNumber(conta, 'valorTotal', label);
    requireOptionalNumber(conta, 'saldo', label);
    if (conta.parcelas !== undefined && conta.parcelas !== null) requireArray(conta.parcelas, `${label}.parcelas`);
    if (conta.recebimentos !== undefined && conta.recebimentos !== null) requireArray(conta.recebimentos, `${label}.recebimentos`);
    assertNoSensitiveObject(conta, label);
};

const assertContaPagar = (value: unknown, label: string) => {
    const conta = requireRecord(value, label);
    requireString(conta, 'id', label);
    requireString(conta, 'empresaId', label);
    requireString(conta, 'fornecedorId', label);
    requireString(conta, 'documento', label);
    requireNumber(conta, 'origem', label);
    requireString(conta, 'dataEmissao', label);
    requireOptionalNumber(conta, 'valorTotal', label);
    requireOptionalNumber(conta, 'saldo', label);
    if (conta.parcelas !== undefined && conta.parcelas !== null) requireArray(conta.parcelas, `${label}.parcelas`);
    if (conta.pagamentos !== undefined && conta.pagamentos !== null) requireArray(conta.pagamentos, `${label}.pagamentos`);
    assertNoSensitiveObject(conta, label);
};

const assertAuditoriaEvento = (value: unknown, label: string) => {
    const evento = requireRecord(value, label);
    requireString(evento, 'id', label);
    requireString(evento, 'modulo', label);
    requireString(evento, 'entidade', label);
    requireString(evento, 'entidadeId', label);
    requireNumber(evento, 'acao', label);
    requireString(evento, 'descricao', label);
    requireString(evento, 'usuarioId', label);
    requireString(evento, 'empresaId', label);
    requireString(evento, 'criadoEm', label);
    assertNoSensitiveObject(evento, label);
};

test.describe('contratos operacionais read-only contra backend controlado', () => {
    test.skip(!shouldRun, 'Defina LOGOSOFT_OPERATIONAL_CONTRACT_API_URL, LOGOSOFT_OPERATIONAL_CONTRACT_ACCESS_TOKEN e LOGOSOFT_OPERATIONAL_CONTRACT_EMPRESA_ID para validar contratos operacionais contra backend controlado.');

    test('valida endpoints read-only de vendas, estoque, financeiro e auditoria', async () => {
        const api = await playwrightRequest.newContext({
            baseURL: apiUrl,
            extraHTTPHeaders: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json'
            }
        });

        const baseQuery = buildQuery({ empresaId, filialId });
        const origemQuery = buildQuery({ empresaId, filialId, origemId });

        const pedidos = await assertArrayEndpoint(api, `/api/vendas/pedidos?${baseQuery}`, 'PedidoVendaResponse[]');
        const primeiroPedido = firstRecord(pedidos);
        if (primeiroPedido) assertPedidoVenda(primeiroPedido, 'PedidoVendaResponse[0]');

        const saldos = await assertArrayEndpoint(api, `/api/estoque/saldos?${baseQuery}`, 'EstoqueSaldoResponse[]');
        const primeiroSaldo = firstRecord(saldos);
        if (primeiroSaldo) assertEstoqueSaldo(primeiroSaldo, 'EstoqueSaldoResponse[0]');

        const movimentos = await assertArrayEndpoint(api, `/api/estoque/movimentos?${origemQuery}`, 'MovimentoEstoqueResponse[]');
        const primeiroMovimento = firstRecord(movimentos);
        if (primeiroMovimento) assertMovimentoEstoque(primeiroMovimento, 'MovimentoEstoqueResponse[0]');

        const reservas = await assertArrayEndpoint(api, `/api/estoque/reservas?${origemQuery}`, 'ReservaEstoqueResponse[]');
        const primeiraReserva = firstRecord(reservas);
        if (primeiraReserva) assertReservaEstoque(primeiraReserva, 'ReservaEstoqueResponse[0]');

        const contasReceber = await assertArrayEndpoint(api, `/api/financeiro/contas-receber?${origemQuery}`, 'ContaReceberResponse[]');
        const primeiraContaReceber = firstRecord(contasReceber);
        if (primeiraContaReceber) assertContaReceber(primeiraContaReceber, 'ContaReceberResponse[0]');

        const contasPagar = await assertArrayEndpoint(api, `/api/financeiro/contas-pagar?${baseQuery}`, 'ContaPagarResponse[]');
        const primeiraContaPagar = firstRecord(contasPagar);
        if (primeiraContaPagar) assertContaPagar(primeiraContaPagar, 'ContaPagarResponse[0]');

        const auditoria = await assertArrayEndpoint(api, '/api/auditoria/eventos', 'AuditoriaEventoResponse[]');
        const primeiroEvento = firstRecord(auditoria);
        if (primeiroEvento) assertAuditoriaEvento(primeiroEvento, 'AuditoriaEventoResponse[0]');

        const pedidoVendaId = pedidoVendaIdFromEnv ?? (typeof primeiroPedido?.id === 'string' ? primeiroPedido.id : null);
        if (pedidoVendaId) {
            const detalhePedido = await api.get(`/api/vendas/pedidos/${pedidoVendaId}`);
            expect(detalhePedido.ok(), `Detalhe de pedido de venda deve retornar 2xx: ${detalhePedido.status()}`).toBe(true);
            assertPedidoVenda(await detalhePedido.json(), 'PedidoVendaResponse detalhe');
        }

        const contaReceberId = contaReceberIdFromEnv ?? (typeof primeiraContaReceber?.id === 'string' ? primeiraContaReceber.id : null);
        if (contaReceberId) {
            const detalheContaReceber = await api.get(`/api/financeiro/contas-receber/${contaReceberId}`);
            expect(detalheContaReceber.ok(), `Detalhe de conta a receber deve retornar 2xx: ${detalheContaReceber.status()}`).toBe(true);
            assertContaReceber(await detalheContaReceber.json(), 'ContaReceberResponse detalhe');
        }

        const contaPagarId = contaPagarIdFromEnv ?? (typeof primeiraContaPagar?.id === 'string' ? primeiraContaPagar.id : null);
        if (contaPagarId) {
            const detalheContaPagar = await api.get(`/api/financeiro/contas-pagar/${contaPagarId}`);
            expect(detalheContaPagar.ok(), `Detalhe de conta a pagar deve retornar 2xx: ${detalheContaPagar.status()}`).toBe(true);
            assertContaPagar(await detalheContaPagar.json(), 'ContaPagarResponse detalhe');
        }

        await api.dispose();
    });
});
