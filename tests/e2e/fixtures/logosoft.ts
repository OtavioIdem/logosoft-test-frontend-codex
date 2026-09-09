import { expect, Page } from '@playwright/test';

/**
 * O usuario mockado precisa de um GUID de verdade: meResponseSchema valida usuarioId,
 * empresaId e filialId com authGuidSchema, e um id livre faz o /me reprovar no Zod,
 * limpar a sessao e mandar a navegacao para o login.
 */
const e2eUsuarioId = '33333333-3333-3333-3333-333333333333';

// Estado compartilhado para armazenar opções de sessão por página
// Usado para que writeSession() possa configurar a resposta de /api/auth/me em mockApiRoutes()
const sessionConfigByPage = new WeakMap<Page, { usuarioId: string; nome: string; email: string; empresaId: string; filialId: string; permissoes: string[] }>();

export const ADMIN_PERMISSIONS = [
    'AUDITORIA_CONSULTAR',
    'ATIVIDADES_CONSULTAR',
    'ATIVIDADES_GERENCIAR',
    'RELATORIOS_CONSULTAR',
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
    'COMPRAS_RECEBER',
    'FISCAL_CONSULTAR',
    'FISCAL_GERENCIAR',
    'FISCAL_EMITIR',
    'FISCAL_EXPORTAR',
    'FISCAL_CANCELAR',
    'FISCAL_INUTILIZAR',
    'FISCAL_CARTA_CORRECAO'
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
    'FISCAL_CONSULTAR',
    'AUDITORIA_CONSULTAR',
    'ATIVIDADES_CONSULTAR',
    'RELATORIOS_CONSULTAR'
];

type SessionOptions = {
    permissions?: string[];
    email?: string;
    name?: string;
};

export const writeSession = async (page: Page, options: SessionOptions = {}) => {
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const sessionUser = {
        id: e2eUsuarioId,
        nome: options.name ?? 'Administrador E2E',
        email: options.email ?? 'admin@logosoft.local',
        empresaId: '11111111-1111-1111-1111-111111111111',
        filialId: '22222222-2222-2222-2222-222222222222',
        permissoes: options.permissions ?? ADMIN_PERMISSIONS
    };

    const sessionData = {
        accessToken: 'e2e-access-token',
        accessTokenExpiraEm: expires,
        refreshToken: 'e2e-refresh-token',
        refreshTokenExpiraEm: expires,
        expiresAt: expires,
        user: sessionUser
    };

    // Armazenar configuração de sessão para que mockApiRoutes() possa usá-la na resposta de /api/auth/me
    sessionConfigByPage.set(page, {
        usuarioId: sessionUser.id,
        nome: sessionUser.nome,
        email: sessionUser.email,
        empresaId: sessionUser.empresaId,
        filialId: sessionUser.filialId,
        permissoes: sessionUser.permissoes
    });

    // Usar page.addInitScript para escrever a sessão em localStorage ANTES de qualquer script de página
    const sessionJson = JSON.stringify(sessionData);
    await page.addInitScript((sessionJson) => {
        window.localStorage.setItem('logosoft.session', sessionJson);
    }, sessionJson);
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
const auditoria = [{ id: 'aud-1', modulo: 'Vendas', entidade: 'PedidoVenda', entidadeId: pedidoVenda.id, acao: 1, descricao: 'Pedido de venda criado', usuario: 'Administrador E2E', usuarioId: e2eUsuarioId, empresaId, filialId, criadoEm: '2026-05-08T12:00:00.000Z' }];

const notaFiscalId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const documentoAuxiliarId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const chaveAcessoFiscal = '35260500000000000100550010000001001000001000';
const protocoloFiscal = '135260000000001';

const createFiscalNote = (overrides: Record<string, unknown> = {}) => ({
    id: notaFiscalId,
    empresaId,
    filialId,
    tipoDocumento: 1,
    tipoOperacao: 1,
    origem: 2,
    origemId: pedidoVenda.id,
    pessoaId,
    serie: '1',
    numero: '900001',
    chaveAcesso: null,
    protocoloAutorizacao: null,
    dataEmissao: '2026-05-08T12:00:00.000Z',
    autorizadaEm: null,
    canceladaEm: null,
    statusFiscal: 1,
    valorProdutos: 251,
    valorDesconto: 0,
    valorTotal: 251,
    codigoRejeicao: null,
    mensagemRejeicao: null,
    motivoCancelamento: null,
    observacao: 'Nota fiscal E2E gerada de pedido de venda.',
    itens: [
        {
            id: 'nf-item-1',
            sequencia: 1,
            produtoId,
            codigoItem: 'PROD-001',
            descricao: 'Produto demonstração',
            ncm: '01012100',
            cfop: '5102',
            unidadeComercial: 'UN',
            quantidade: 2,
            valorUnitario: 125.5,
            valorBruto: 251,
            valorDesconto: 0,
            valorTotal: 251,
            observacao: null
        }
    ],
    impostos: [
        {
            id: 'nf-imposto-1',
            itemNotaFiscalId: 'nf-item-1',
            nome: 'ICMS',
            cstCsosn: '102',
            baseCalculo: 251,
            aliquota: 0,
            valor: 0,
            observacao: 'Parametrizado para teste E2E.'
        }
    ],
    xmls: [],
    eventos: [{ id: 'nf-evento-criacao', tipo: 1, codigo: 'CRIACAO', descricao: 'Nota fiscal criada para E2E', protocolo: null, dataEvento: '2026-05-08T12:00:00.000Z', usuarioId: e2eUsuarioId }],
    ...overrides
});

const fiscalListResponse = (notaFiscal: Record<string, any>, estoqueBaixado: boolean, contaReceberGerada: boolean, possuiDanfe: boolean) => ({
    items: [
        {
            id: notaFiscal.id,
            empresaId,
            filialId,
            tipoDocumento: notaFiscal.tipoDocumento,
            tipoOperacao: notaFiscal.tipoOperacao,
            statusFiscal: notaFiscal.statusFiscal,
            origem: notaFiscal.origem,
            origemId: notaFiscal.origemId,
            pessoaId: notaFiscal.pessoaId,
            serie: notaFiscal.serie,
            numero: notaFiscal.numero,
            chaveAcesso: notaFiscal.chaveAcesso,
            protocoloAutorizacao: notaFiscal.protocoloAutorizacao,
            dataEmissao: notaFiscal.dataEmissao,
            autorizadaEm: notaFiscal.autorizadaEm,
            canceladaEm: notaFiscal.canceladaEm,
            valorTotal: notaFiscal.valorTotal,
            possuiXmlEnvio: notaFiscal.xmls.some((xml: Record<string, unknown>) => Number(xml.tipo) === 1),
            possuiXmlAutorizado: notaFiscal.xmls.some((xml: Record<string, unknown>) => Number(xml.tipo) === 2),
            possuiDanfe,
            estoqueAplicavel: true,
            estoqueBaixado,
            estoquePendente: Number(notaFiscal.statusFiscal) === 5 && !estoqueBaixado,
            financeiroAplicavel: true,
            contaReceberGerada,
            financeiroPendente: Number(notaFiscal.statusFiscal) === 5 && estoqueBaixado && !contaReceberGerada,
            acaoPrincipalCodigo: Number(notaFiscal.statusFiscal) === 5 ? 'POS_AUTORIZACAO' : 'CONSULTAR',
            acaoPrincipalNome: Number(notaFiscal.statusFiscal) === 5 ? 'Pós-autorização' : 'Consultar nota fiscal',
            acaoPrincipalMetodoHttp: 'GET',
            acaoPrincipalEndpoint: `/api/fiscal/notas-fiscais/${notaFiscal.id}`,
            acaoPrincipalPermissao: 'FISCAL_CONSULTAR',
            alertas: []
        }
    ],
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false
});

export const mockApiRoutes = async (page: Page) => {
    let notaFiscal: Record<string, any> = createFiscalNote();
    let estoqueBaixado = false;
    let contaReceberGerada = false;
    let documentoAuxiliar: Record<string, unknown> | null = null;
    const fiscalLogs: Record<string, unknown>[] = [];

    // Obter configuração de sessão que foi setada por writeSession(), ou usar padrão
    const getSessionConfig = () =>
        sessionConfigByPage.get(page) ?? {
            usuarioId: e2eUsuarioId,
            nome: 'Administrador E2E',
            email: 'admin@logosoft.local',
            empresaId: '11111111-1111-1111-1111-111111111111',
            filialId: '22222222-2222-2222-2222-222222222222',
            permissoes: ADMIN_PERMISSIONS
        };


    const appendFiscalLog = (operacao: string, statusIntegracao: number, mensagem: string, podeReprocessar = false) => {
        fiscalLogs.unshift({
            id: `log-${fiscalLogs.length + 1}`,
            empresaId,
            filialId,
            notaFiscalId: notaFiscal.id,
            operacao,
            statusIntegracao,
            correlationId: `e2e-${operacao.toLowerCase()}-${fiscalLogs.length + 1}`,
            payloadResumo: 'xml=[XML_MASKED]; token=[MASKED]; senha=[MASKED]',
            mensagem,
            registradoEm: new Date().toISOString(),
            podeReprocessar,
            contemDadoSensivelOcultado: true
        });
    };

    const resumoFiscal = () => ({
        notaFiscalId: notaFiscal.id,
        empresaId,
        filialId,
        tipoDocumento: notaFiscal.tipoDocumento,
        serie: notaFiscal.serie,
        numero: notaFiscal.numero,
        statusFiscal: notaFiscal.statusFiscal,
        origem: notaFiscal.origem,
        origemId: notaFiscal.origemId,
        possuiXmlEnvio: notaFiscal.xmls.some((xml: Record<string, unknown>) => Number(xml.tipo) === 1),
        possuiXmlAutorizado: notaFiscal.xmls.some((xml: Record<string, unknown>) => Number(xml.tipo) === 2),
        possuiDanfe: Boolean(documentoAuxiliar),
        pedidoVenda: { id: pedidoVenda.id, numero: pedidoVenda.numero, status: 5, clienteId, valorTotal: pedidoVenda.valorTotal, faturadoEm: '2026-05-08T12:00:00.000Z' },
        estoque: { aplicavel: true, baixado: estoqueBaixado, itensPendentes: estoqueBaixado ? 0 : 1, quantidadePendente: estoqueBaixado ? 0 : 2, sequenciasPendentes: estoqueBaixado ? [] : [1] },
        financeiro: { aplicavel: true, contaReceberGerada, contaReceberId: contaReceberGerada ? 'cr-fiscal-1' : null, status: contaReceberGerada ? 1 : null, valorOriginal: contaReceberGerada ? notaFiscal.valorTotal : null, valorSaldo: contaReceberGerada ? notaFiscal.valorTotal : null },
        acoes: {
            podeValidar: Number(notaFiscal.statusFiscal) === 1 && notaFiscal.itens.length > 0,
            podeGerarXmlEnvio: [1, 2].includes(Number(notaFiscal.statusFiscal)) && !notaFiscal.xmls.some((xml: Record<string, unknown>) => Number(xml.tipo) === 1),
            podeAssinarXmlEnvio: Number(notaFiscal.statusFiscal) === 2 && notaFiscal.xmls.some((xml: Record<string, unknown>) => Number(xml.tipo) === 1),
            podeTransmitirSefaz: Number(notaFiscal.statusFiscal) === 3,
            podeGerarDanfe: Number(notaFiscal.statusFiscal) === 5 && notaFiscal.xmls.some((xml: Record<string, unknown>) => Number(xml.tipo) === 2) && !documentoAuxiliar,
            podeBaixarEstoque: Number(notaFiscal.statusFiscal) === 5 && !estoqueBaixado,
            podeGerarContaReceber: Number(notaFiscal.statusFiscal) === 5 && estoqueBaixado && !contaReceberGerada,
            podeCancelar: Number(notaFiscal.statusFiscal) === 5,
            podeEmitirCartaCorrecao: Number(notaFiscal.statusFiscal) === 5
        },
        alertas: documentoAuxiliar ? [] : Number(notaFiscal.statusFiscal) === 5 ? ['DANFE pendente.'] : []
    });

    const workflowFiscal = () => {
        const resumo = resumoFiscal();
        const makeAction = (codigo: string, nome: string, permissao: string, habilitada: boolean) => ({
            codigo,
            nome,
            metodoHttp: 'POST',
            endpoint: `/api/fiscal/notas-fiscais/${notaFiscal.id}`,
            permissao,
            habilitada,
            motivoBloqueio: habilitada ? null : 'Ação bloqueada pelo estado operacional atual.',
            payloadReferencia: codigo
        });
        const proximasAcoes = [
            makeAction('VALIDAR', 'Validar nota', 'FISCAL_GERENCIAR', resumo.acoes.podeValidar),
            makeAction('GERAR_XML_ENVIO', 'Gerar XML de envio', 'FISCAL_GERENCIAR', resumo.acoes.podeGerarXmlEnvio),
            makeAction('ASSINAR_XML_ENVIO', 'Assinar XML de envio', 'FISCAL_EMITIR', resumo.acoes.podeAssinarXmlEnvio),
            makeAction('TRANSMITIR_SEFAZ', 'Transmitir SEFAZ', 'FISCAL_EMITIR', resumo.acoes.podeTransmitirSefaz),
            makeAction('GERAR_DANFE', 'Gerar DANFE', 'FISCAL_EMITIR', resumo.acoes.podeGerarDanfe),
            makeAction('BAIXAR_ESTOQUE', 'Baixar estoque', 'ESTOQUE_MOVIMENTAR', resumo.acoes.podeBaixarEstoque),
            makeAction('GERAR_CONTA_RECEBER', 'Gerar conta a receber', 'FINANCEIRO_GERENCIAR', resumo.acoes.podeGerarContaReceber)
        ].filter((acao) => acao.habilitada);
        return {
            notaFiscalId: notaFiscal.id,
            empresaId,
            filialId,
            tipoDocumento: notaFiscal.tipoDocumento,
            statusFiscal: notaFiscal.statusFiscal,
            etapaAtual: Number(notaFiscal.statusFiscal) === 5 ? 'Autorizada' : Number(notaFiscal.statusFiscal) === 3 ? 'Assinada' : Number(notaFiscal.statusFiscal) === 2 ? 'Validada' : 'Rascunho',
            ordemEtapaAtual: Number(notaFiscal.statusFiscal),
            percentualConcluido: Number(notaFiscal.statusFiscal) === 5 ? 75 : Number(notaFiscal.statusFiscal) * 15,
            resumo: {},
            etapas: [
                { ordem: 1, codigo: 'CRIACAO', nome: 'Nota fiscal criada ou gerada', status: 'Concluida', obrigatoria: true, metodoHttp: 'GET', endpoint: `/api/fiscal/notas-fiscais/${notaFiscal.id}`, permissao: 'FISCAL_CONSULTAR', motivoBloqueio: null },
                { ordem: 2, codigo: 'VALIDACAO', nome: 'Validar dados da nota', status: Number(notaFiscal.statusFiscal) >= 2 ? 'Concluida' : 'Disponivel', obrigatoria: true, metodoHttp: 'POST', endpoint: `/api/fiscal/notas-fiscais/${notaFiscal.id}/validar`, permissao: 'FISCAL_GERENCIAR', motivoBloqueio: null },
                { ordem: 3, codigo: 'XML_ENVIO', nome: 'Gerar XML de envio', status: resumo.possuiXmlEnvio ? 'Concluida' : Number(notaFiscal.statusFiscal) >= 2 ? 'Disponivel' : 'Bloqueada', obrigatoria: true, metodoHttp: 'POST', endpoint: `/api/fiscal/notas-fiscais/${notaFiscal.id}/gerar-xml-envio`, permissao: 'FISCAL_GERENCIAR', motivoBloqueio: null },
                { ordem: 4, codigo: 'ASSINATURA', nome: 'Assinar XML de envio', status: Number(notaFiscal.statusFiscal) >= 3 ? 'Concluida' : resumo.possuiXmlEnvio ? 'Disponivel' : 'Bloqueada', obrigatoria: true, metodoHttp: 'POST', endpoint: `/api/fiscal/notas-fiscais/${notaFiscal.id}/assinar-xml-envio`, permissao: 'FISCAL_EMITIR', motivoBloqueio: null },
                { ordem: 5, codigo: 'TRANSMISSAO_SEFAZ', nome: 'Transmitir/autorizar na SEFAZ', status: Number(notaFiscal.statusFiscal) >= 5 ? 'Concluida' : Number(notaFiscal.statusFiscal) === 3 ? 'Disponivel' : 'Bloqueada', obrigatoria: true, metodoHttp: 'POST', endpoint: `/api/fiscal/notas-fiscais/${notaFiscal.id}/transmitir-sefaz`, permissao: 'FISCAL_EMITIR', motivoBloqueio: null },
                { ordem: 6, codigo: 'DANFE', nome: 'Gerar DANFE', status: documentoAuxiliar ? 'Concluida' : resumo.acoes.podeGerarDanfe ? 'Disponivel' : 'Bloqueada', obrigatoria: true, metodoHttp: 'POST', endpoint: `/api/fiscal/notas-fiscais/${notaFiscal.id}/danfe`, permissao: 'FISCAL_EMITIR', motivoBloqueio: null }
            ],
            proximasAcoes,
            bloqueios: [],
            alertas: resumo.alertas
        };
    };

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const path = url.pathname;

        if (path === '/api/auth/me') {
            const config = getSessionConfig();
            return route.fulfill(json({
                usuarioId: config.usuarioId,
                nome: config.nome,
                email: config.email,
                empresaId: config.empresaId,
                filialId: config.filialId,
                isMaster: false,
                permissoes: config.permissoes
            }));
        }

        if (path === '/api/auth/login') return route.fulfill(json({
            accessToken: 'e2e-access-token',
            refreshToken: 'e2e-refresh-token',
            accessTokenExpiraEm: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            refreshTokenExpiraEm: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            usuario: {
                id: e2eUsuarioId,
                nome: 'Administrador E2E',
                email: 'admin@logosoft.local',
                empresaId,
                filialId,
                permissoes: ADMIN_PERMISSIONS
            },
            user: {
                id: e2eUsuarioId,
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

        if (path === '/api/fiscal/notas-fiscais' && method === 'GET') return route.fulfill(json(fiscalListResponse(notaFiscal, estoqueBaixado, contaReceberGerada, Boolean(documentoAuxiliar))));
        if (path === '/api/fiscal/notas-fiscais/exportacoes/csv' && method === 'GET') return route.fulfill({
            status: 200,
            contentType: 'text/csv',
            headers: { 'content-disposition': 'attachment; filename="notas-fiscais-e2e.csv"' },
            body: 'serie,numero,statusFiscal\n1,900001,5\n'
        });
        if (path === '/api/fiscal/notas-fiscais/gerar-de-pedido-venda' && method === 'POST') {
            const body = request.postDataJSON() as Record<string, unknown>;
            notaFiscal = createFiscalNote({ numero: body.numero ?? '900001', serie: body.serie ?? '1' });
            estoqueBaixado = false;
            contaReceberGerada = false;
            documentoAuxiliar = null;
            fiscalLogs.length = 0;
            appendFiscalLog('GerarNotaPedidoVenda', 2, 'Nota fiscal gerada a partir de pedido de venda.');
            return route.fulfill(json({ notaFiscal, pedidoVendaId: pedidoVenda.id, numeroPedidoVenda: pedidoVenda.numero, alertas: [] }));
        }
        if (path === `/api/fiscal/notas-fiscais/${notaFiscal.id}` && method === 'GET') return route.fulfill(json(notaFiscal));
        if (path === `/api/fiscal/notas-fiscais/${notaFiscal.id}/resumo-operacional` && method === 'GET') return route.fulfill(json(resumoFiscal()));
        if (path === `/api/fiscal/notas-fiscais/${notaFiscal.id}/workflow-operacional` && method === 'GET') return route.fulfill(json(workflowFiscal()));
        if (path === `/api/fiscal/notas-fiscais/${notaFiscal.id}/integracoes` && method === 'GET') return route.fulfill(json(fiscalLogs));
        if (path === `/api/fiscal/notas-fiscais/${notaFiscal.id}/validar` && method === 'POST') {
            notaFiscal = { ...notaFiscal, statusFiscal: 2, eventos: [...notaFiscal.eventos, { id: 'nf-evento-validacao', tipo: 2, codigo: 'VALIDADA', descricao: 'Nota validada no E2E', protocolo: null, dataEvento: new Date().toISOString(), usuarioId: e2eUsuarioId }] };
            appendFiscalLog('ValidacaoFiscal', 2, 'Nota fiscal validada.');
            return route.fulfill(json(notaFiscal));
        }
        if (path === `/api/fiscal/notas-fiscais/${notaFiscal.id}/gerar-xml-envio` && method === 'POST') {
            notaFiscal = { ...notaFiscal, xmls: [...notaFiscal.xmls, { id: 'xml-envio-1', tipo: 1, hashSha256: 'hash-envio-e2e', protocolo: null, chaveAcesso: null, armazenadoEm: new Date().toISOString() }] };
            appendFiscalLog('GerarXmlEnvio', 2, 'XML de envio gerado.');
            return route.fulfill(json({ notaFiscalId: notaFiscal.id, tipoDocumento: 1, statusFiscal: notaFiscal.statusFiscal, tipoXml: 1, conteudoXml: '<NFe><infNFe Id="e2e" /></NFe>', schemaSetName: 'NFe-4.00', schemaValidado: false, armazenado: true, alertas: [] }));
        }
        if (path === `/api/fiscal/notas-fiscais/${notaFiscal.id}/assinar-xml-envio` && method === 'POST') {
            notaFiscal = { ...notaFiscal, statusFiscal: 3, eventos: [...notaFiscal.eventos, { id: 'nf-evento-assinatura', tipo: 3, codigo: 'ASSINADA', descricao: 'XML assinado no E2E', protocolo: null, dataEvento: new Date().toISOString(), usuarioId: e2eUsuarioId }] };
            appendFiscalLog('AssinarXmlEnvio', 2, 'XML de envio assinado.');
            return route.fulfill(json({ notaFiscalId: notaFiscal.id, tipoDocumento: 1, statusFiscal: 3, tipoXml: 1, conteudoXml: '<NFe assinatura="mock" />', schemaSetName: 'NFe-4.00', schemaValidado: false, armazenado: true, alertas: [] }));
        }
        if (path === `/api/fiscal/notas-fiscais/${notaFiscal.id}/transmitir-sefaz` && method === 'POST') {
            notaFiscal = {
                ...notaFiscal,
                statusFiscal: 5,
                chaveAcesso: chaveAcessoFiscal,
                protocoloAutorizacao: protocoloFiscal,
                autorizadaEm: new Date().toISOString(),
                xmls: [...notaFiscal.xmls, { id: 'xml-autorizado-1', tipo: 2, hashSha256: 'hash-autorizado-e2e', protocolo: protocoloFiscal, chaveAcesso: chaveAcessoFiscal, armazenadoEm: new Date().toISOString() }],
                eventos: [...notaFiscal.eventos, { id: 'nf-evento-autorizacao', tipo: 5, codigo: '100', descricao: 'Autorizado no E2E mockado', protocolo: protocoloFiscal, dataEvento: new Date().toISOString(), usuarioId: e2eUsuarioId }]
            };
            appendFiscalLog('NFeAutorizacao', 2, 'Autorização mockada concluída.');
            return route.fulfill(json({ notaFiscalId: notaFiscal.id, statusFiscal: 5, comunicacaoOk: true, autorizada: true, codigoStatus: '100', motivo: 'Autorizado', protocolo: protocoloFiscal, chaveAcesso: chaveAcessoFiscal, deveReprocessar: false }));
        }
        if (path === `/api/fiscal/notas-fiscais/${notaFiscal.id}/danfe` && method === 'POST') {
            documentoAuxiliar = { id: documentoAuxiliarId, notaFiscalId: notaFiscal.id, tipo: 1, formato: 2, nomeArquivo: 'danfe-1-900001.html', contentType: 'text/html', hashSha256: 'hash-danfe-e2e', tamanhoBytes: 12345, geradoEm: new Date().toISOString(), geradoPor: e2eUsuarioId, alertas: [] };
            appendFiscalLog('GerarDanfe', 2, 'Documento auxiliar gerado.');
            return route.fulfill(json(documentoAuxiliar));
        }
        if (path === `/api/fiscal/notas-fiscais/${notaFiscal.id}/baixar-estoque` && method === 'POST') {
            estoqueBaixado = true;
            appendFiscalLog('BaixarEstoqueFiscal', 2, 'Estoque baixado pela nota fiscal.');
            return route.fulfill(json({ notaFiscalId: notaFiscal.id, pedidoVendaId: pedidoVenda.id, statusFiscal: 5, quantidadeTotalBaixada: 2, itens: [{ pedidoVendaItemId: 'pv-item-1', produtoId, reservaEstoqueId: 'res-1', movimentoEstoqueId: 'mov-fiscal-1', quantidadeBaixada: 2 }], alertas: [] }));
        }
        if (path === `/api/fiscal/notas-fiscais/${notaFiscal.id}/gerar-conta-receber` && method === 'POST') {
            contaReceberGerada = true;
            appendFiscalLog('GerarContaReceberFiscal', 2, 'Conta a receber gerada pela nota fiscal.');
            return route.fulfill(json({ notaFiscalId: notaFiscal.id, pedidoVendaId: pedidoVenda.id, contaReceberId: 'cr-fiscal-1', documento: 'NF-900001', origem: 2, origemId: notaFiscal.id, valorOriginal: 251, valorSaldo: 251, status: 1, jaExistia: false, parcelas: [{ id: 'parcela-fiscal-1', numero: 1, vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), valorOriginal: 251, valorSaldo: 251, status: 1 }], alertas: [] }));
        }
        if (path === `/api/fiscal/notas-fiscais/documentos-auxiliares/${documentoAuxiliarId}/download` && method === 'GET') return route.fulfill({
            status: 200,
            contentType: 'text/html',
            headers: { 'content-disposition': 'attachment; filename="danfe-1-900001.html"' },
            body: '<html><body>DANFE E2E</body></html>'
        });
        if (path === '/api/fiscal/observabilidade/integracoes' && method === 'GET') return route.fulfill(json({
            empresaId,
            filialId,
            geradoEm: new Date().toISOString(),
            registradoApos: null,
            totalLogsAnalisados: fiscalLogs.length,
            totalSucesso: fiscalLogs.filter((log) => Number(log.statusIntegracao) === 2).length,
            totalFalha: fiscalLogs.filter((log) => Number(log.statusIntegracao) === 3).length,
            totalReprocessamento: fiscalLogs.filter((log) => Number(log.statusIntegracao) === 4).length,
            totalPendente: fiscalLogs.filter((log) => Number(log.statusIntegracao) === 1).length,
            ultimoRegistroEm: fiscalLogs[0]?.registradoEm ?? null,
            possuiFalhaRecente: false,
            possuiPendenciaRecente: false,
            operacoesComFalha: [],
            alertas: ['Payload fiscal sensível mascarado no mock E2E.'],
            logsRecentes: fiscalLogs
        }));
        if (path === '/api/fiscal/sefaz/status-servico' && method === 'POST') return route.fulfill(json({ empresaId, filialId, tipoDocumento: 1, ambiente: 1, ufAutorizadora: 'SP', comunicacaoOk: true, disponivel: true, codigoStatus: '107', motivo: 'Serviço em operação', deveReprocessar: false, consultadoEm: new Date().toISOString(), alertas: [] }));
        if (path === '/api/fiscal/sefaz/status-servico/historico' && method === 'GET') return route.fulfill(json(fiscalLogs.filter((log) => String(log.operacao).includes('Status'))));
        if (path === '/api/fiscal/sefaz/contingencia/historico' && method === 'GET') return route.fulfill(json(fiscalLogs.filter((log) => String(log.operacao).includes('Contingencia'))));
        if (path === '/api/fiscal/sefaz/contingencia/avaliar' && method === 'POST') return route.fulfill(json({ notaFiscalId: null, empresaId, filialId, tipoDocumento: 1, ambiente: 1, ufAutorizadora: 'SP', tipoContingencia: 99, permitida: true, statusServicoIndisponivelDetectado: true, codigoStatusServico: '108', motivoStatusServico: 'Serviço paralisado momentaneamente', motivoOperacional: 'Avaliação operacional E2E.', avaliadaEm: new Date().toISOString(), alertas: [] }));
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
