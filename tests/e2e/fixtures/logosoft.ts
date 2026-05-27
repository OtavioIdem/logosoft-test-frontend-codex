import { expect, Page } from '@playwright/test';

export const ADMIN_PERMISSIONS = [
    'AUDITORIA_CONSULTAR',
    'ADMINISTRACAO_CONSULTAR',
    'ADMINISTRACAO_GERENCIAR',
    'SEGURANCA_USUARIOS_CONSULTAR',
    'SEGURANCA_USUARIOS_GERENCIAR',
    'SEGURANCA_PERMISSOES_GERENCIAR',
    'SEGURANCA_SESSOES_GERENCIAR',
    'PESSOAS_CONSULTAR',
    'PESSOAS_GERENCIAR',
    'CLIENTES_CONSULTAR',
    'CLIENTES_GERENCIAR',
    'FORNECEDORES_CONSULTAR',
    'FORNECEDORES_GERENCIAR',
    'PRODUTOS_CONSULTAR',
    'PRODUTOS_GERENCIAR',
    'PRODUTOS_INATIVAR',
    'PRODUTOS_DADOS_FISCAIS_GERENCIAR',
    'CATEGORIAS_PRODUTO_GERENCIAR',
    'UNIDADES_MEDIDA_GERENCIAR',
    'MARCAS_GERENCIAR',
    'ESTOQUE_CONSULTAR',
    'ESTOQUE_MOVIMENTAR',
    'ESTOQUE_RESERVAR',
    'ESTOQUE_INVENTARIO_GERENCIAR',
    'LOCAIS_ESTOQUE_GERENCIAR',
    'VENDAS_CONSULTAR',
    'VENDAS_GERENCIAR',
    'VENDAS_APROVAR',
    'VENDAS_CANCELAR',
    'VENDAS_FATURAR',
    'FINANCEIRO_CONSULTAR',
    'FINANCEIRO_GERENCIAR',
    'FINANCEIRO_RECEBER',
    'FINANCEIRO_PAGAR',
    'FINANCEIRO_ESTORNAR',
    'FINANCEIRO_CANCELAR',
    'FORMAS_PAGAMENTO_GERENCIAR',
    'CONDICOES_PAGAMENTO_GERENCIAR',
    'COMPRAS_CONSULTAR',
    'COMPRAS_GERENCIAR',
    'COMPRAS_APROVAR',
    'COMPRAS_CANCELAR',
    'COMPRAS_RECEBER'
];

export const CONSULTA_PERMISSIONS = [
    'ADMINISTRACAO_CONSULTAR',
    'PESSOAS_CONSULTAR',
    'CLIENTES_CONSULTAR',
    'FORNECEDORES_CONSULTAR',
    'PRODUTOS_CONSULTAR',
    'ESTOQUE_CONSULTAR',
    'VENDAS_CONSULTAR',
    'FINANCEIRO_CONSULTAR',
    'COMPRAS_CONSULTAR',
    'AUDITORIA_CONSULTAR'
];

type SessionOptions = {
    permissions?: string[];
    email?: string;
    name?: string;
};

export const writeSession = async (page: Page, options: SessionOptions = {}) => {
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await page.addInitScript((session) => {
        window.localStorage.setItem('logosoft.session', JSON.stringify(session));
    }, {
        accessToken: 'e2e-access-token',
        accessTokenExpiraEm: expires,
        refreshToken: 'e2e-refresh-token',
        refreshTokenExpiraEm: expires,
        expiresAt: expires,
        user: {
            id: 'e2e-user-id',
            nome: options.name ?? 'Administrador E2E',
            email: options.email ?? 'admin@logosoft.local',
            empresaId: '11111111-1111-1111-1111-111111111111',
            filialId: '22222222-2222-2222-2222-222222222222',
            permissoes: options.permissions ?? ADMIN_PERMISSIONS
        }
    });
};

export const loginByForm = async (page: Page) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('admin@logosoft.local');
    await page.getByLabel('Senha').fill('admin');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/dashboard/);
};

export const expectPageHeading = async (page: Page, url: string, heading: string | RegExp) => {
    await page.goto(url);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
};

export const openNewDialog = async (page: Page, url: string, heading: string | RegExp) => {
    await expectPageHeading(page, url, heading);
    await page.getByRole('button', { name: /^Nov[oa]/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
};

const json = (body: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body)
});

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const produtoId = '33333333-3333-3333-3333-333333333333';
const clienteId = '44444444-4444-4444-4444-444444444444';
const fornecedorId = '55555555-5555-5555-5555-555555555555';
const pessoaId = '66666666-6666-6666-6666-666666666666';
const localId = '77777777-7777-7777-7777-777777777777';
const unidadeId = '88888888-8888-8888-8888-888888888888';
const categoriaId = '99999999-9999-9999-9999-999999999999';
const marcaId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const produtos = [
    {
        id: produtoId,
        empresaId,
        filialId,
        codigo: 'PROD-001',
        descricao: 'Produto demonstração',
        tipoProduto: 1,
        unidadeMedidaId: unidadeId,
        categoriaProdutoId: categoriaId,
        marcaId,
        precoVendaBase: 125.5,
        custoReferencial: 80,
        controlaEstoque: true,
        permiteVenda: true,
        permiteCompra: true,
        status: 1,
        codigosBarras: [],
        fornecedores: []
    }
];

const pessoas = [
    { id: pessoaId, empresaId, filialId, codigo: 'P001', tipoPessoa: 2, nomeRazaoSocial: 'Cliente demonstração LTDA', nomeFantasia: 'Cliente demonstração', documento: '12ABC34501DE35', status: 1 }
];

const clientes = [{ id: clienteId, empresaId, filialId, pessoaId, codigo: 'CLI-001', limiteCredito: 10000, creditoBloqueado: false, status: 1 }];
const fornecedores = [{ id: fornecedorId, empresaId, filialId, pessoaId, codigo: 'FOR-001', status: 1 }];
const locais = [{ id: localId, empresaId, filialId, codigo: 'LOC-001', nome: 'Almoxarifado principal', status: 1 }];
const categorias = [{ id: categoriaId, empresaId, filialId, codigo: 'CAT-001', nome: 'Categoria geral', status: 1 }];
const unidades = [{ id: unidadeId, empresaId, filialId, sigla: 'UN', descricao: 'Unidade', casasDecimais: 2, permiteFracionado: true, status: 1 }];
const marcas = [{ id: marcaId, empresaId, filialId, nome: 'Marca geral', status: 1 }];
const empresas = [{ id: empresaId, codigo: '001', razaoSocial: 'logosoft matriz', nomeFantasia: 'logosoft matriz', documento: '12ABC34501DE35', status: 1 }];
const filiais = [{ id: filialId, empresaId, codigo: '001', nome: 'Filial São Paulo', documento: '11222333000181', status: 1 }];

const pedidoVenda = {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    empresaId,
    filialId,
    numero: 'PV-001',
    clienteId,
    dataEmissao: '2026-05-08T12:00:00.000Z',
    tipo: 2,
    statusPedido: 1,
    valorProdutos: 251,
    valorDesconto: 0,
    valorTotal: 251,
    itens: [{ id: 'pv-item-1', produtoId, localEstoqueId: localId, quantidade: 2, valorUnitario: 125.5, valorDesconto: 0, valorTotal: 251 }]
};

const pedidoCompra = {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    empresaId,
    filialId,
    numero: 'PC-001',
    fornecedorId,
    dataEmissao: '2026-05-08T12:00:00.000Z',
    statusPedido: 1,
    valorProdutos: 800,
    valorDesconto: 0,
    valorTotal: 800,
    itens: [{ id: 'pc-item-1', produtoId, localEstoqueId: localId, quantidade: 3, valorUnitario: 266.67, valorDesconto: 0, valorTotal: 800 }]
};

const contasReceber = [{ id: 'cr-1', codigo: 'CR-PV-001', cliente: 'Cliente demonstração LTDA', clienteId, valorTotal: 251, saldo: 251, status: 'ABERTO', statusConta: 1, origem: 'Pedido venda PV-001' }];
const contasPagar = [{ id: 'cp-1', codigo: 'CP-PC-001', fornecedor: 'Fornecedor base SA', fornecedorId, valorTotal: 800, saldo: 800, status: 'ABERTO', statusConta: 1, origem: 'Pedido compra PC-001' }];
const auditoria = [{ id: 'aud-1', modulo: 'Vendas', entidade: 'PedidoVenda', entidadeId: pedidoVenda.id, acao: 1, descricao: 'Pedido de venda criado', usuario: 'Administrador E2E', usuarioId: 'e2e-user-id', empresaId, filialId, criadoEm: '2026-05-08T12:00:00.000Z' }];

export const mockApiRoutes = async (page: Page) => {
    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const path = url.pathname;

        if (path === '/api/auth/login') return route.fulfill(json({
            accessToken: 'e2e-access-token',
            refreshToken: 'e2e-refresh-token',
            accessTokenExpiraEm: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            refreshTokenExpiraEm: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            usuario: {
                id: 'e2e-user-id',
                nome: 'Administrador E2E',
                email: 'admin@logosoft.local',
                empresaId,
                filialId,
                permissoes: ADMIN_PERMISSIONS
            },
            user: {
                id: 'e2e-user-id',
                nome: 'Administrador E2E',
                email: 'admin@logosoft.local',
                empresaId,
                filialId,
                permissoes: ADMIN_PERMISSIONS
            },
            permissoes: ADMIN_PERMISSIONS
        }));
        if (path === '/api/auth/refresh') return route.fulfill(json({
            accessToken: 'e2e-access-token-renovado',
            refreshToken: 'e2e-refresh-token-renovado',
            accessTokenExpiraEm: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            refreshTokenExpiraEm: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            permissoes: ADMIN_PERMISSIONS
        }));
        if (path === '/api/auth/logout') return route.fulfill(json({ success: true }));
        if (path === '/api/health') return route.fulfill(json({ status: 'ok' }));
        if (path.includes('/api/administracao/empresas')) return route.fulfill(json(method === 'GET' ? empresas : empresas[0]));
        if (path.includes('/api/administracao/filiais')) return route.fulfill(json(method === 'GET' ? filiais : filiais[0]));
        if (method !== 'GET') {
            let body: Record<string, unknown> = {};
            try {
                body = request.postDataJSON() as Record<string, unknown>;
            } catch {
                body = {};
            }
            if (path.includes('/vendas/pedidos')) return route.fulfill(json({ ...pedidoVenda, ...body, statusPedido: path.includes('/faturar') ? 5 : path.includes('/aprovar') ? 3 : path.includes('/cancelar') ? 4 : 2 }));
            if (path.includes('/compras/pedidos')) return route.fulfill(json({ ...pedidoCompra, ...body, statusPedido: path.includes('/receber') ? 5 : path.includes('/aprovar') ? 3 : path.includes('/cancelar') ? 6 : 2 }));
            if (path.includes('/produtos')) return route.fulfill(json({ ...produtos[0], ...body, id: produtoId }));
            if (path.includes('/estoque')) return route.fulfill(json({ id: localId, codigo: 'LOC-E2E', nome: 'Local E2E', status: 1, ...body }));
            return route.fulfill(json({ id: 'e2e-created-id', codigo: 'E2E', nome: 'Registro E2E', status: 'ATIVO', ...body }));
        }

        if (path.includes('/api/produtos/categorias')) return route.fulfill(json(categorias));
        if (path.includes('/api/produtos/unidades-medida')) return route.fulfill(json(unidades));
        if (path.includes('/api/produtos/marcas')) return route.fulfill(json(marcas));
        if (path === '/api/produtos' || path.match(/\/api\/produtos\/[^/]+$/)) return route.fulfill(json(path === '/api/produtos' ? produtos : produtos[0]));
        if (path.includes('/api/pessoas')) return route.fulfill(json(pessoas));
        if (path.includes('/api/clientes')) return route.fulfill(json(clientes));
        if (path.includes('/api/fornecedores')) return route.fulfill(json(fornecedores));
        if (path.includes('/api/estoque/locais')) return route.fulfill(json(locais));
        if (path.includes('/api/estoque/saldos')) return route.fulfill(json([{ id: 'saldo-1', empresaId, filialId, produtoId, localEstoqueId: localId, quantidadeAtual: 10, quantidadeReservada: 2, quantidadeDisponivel: 8 }]));
        if (path.includes('/api/estoque/movimentos')) return route.fulfill(json([{ id: 'mov-1', produtoId, localEstoqueId: localId, tipoMovimento: 1, quantidade: 10, origemModulo: 'E2E', documento: 'DOC-E2E', criadoEm: '2026-05-08T12:00:00.000Z' }]));
        if (path.includes('/api/estoque/reservas')) return route.fulfill(json([{ id: 'res-1', produtoId, localEstoqueId: localId, quantidade: 1, origemModulo: 'Venda', statusReserva: 1 }]));
        if (path.includes('/api/estoque/inventarios')) return route.fulfill(json([{ id: 'inv-1', codigo: 'INV-001', localEstoqueId: localId, descricao: 'Inventário E2E', statusInventario: 1, itens: [] }]));
        if (path.includes('/api/vendas/pedidos/')) return route.fulfill(json(pedidoVenda));
        if (path.includes('/api/vendas/pedidos')) return route.fulfill(json([pedidoVenda]));
        if (path.includes('/api/compras/pedidos/')) return route.fulfill(json(pedidoCompra));
        if (path.includes('/api/compras/pedidos')) return route.fulfill(json([pedidoCompra]));
        if (path.includes('/api/financeiro/formas-pagamento')) return route.fulfill(json([{ id: 'fp-1', nome: 'PIX', permiteReceber: true, permitePagar: true, permiteRecebimento: true, permitePagamento: true, status: 'ATIVO' }]));
        if (path.includes('/api/financeiro/condicoes-pagamento')) return route.fulfill(json([{ id: 'cond-1', nome: '30/60/90', parcelas: 3, intervaloDias: 30, quantidadeParcelas: 3, status: 'ATIVO' }]));
        if (path.includes('/api/financeiro/contas-receber')) return route.fulfill(json(contasReceber));
        if (path.includes('/api/financeiro/contas-pagar')) return route.fulfill(json(contasPagar));
        if (path.includes('/api/auditoria/eventos')) return route.fulfill(json(auditoria));

        return route.fulfill(json([]));
    });
};
