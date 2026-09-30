// Rótulos do Fiscal usados fora das telas de séries (v1.11.0a8b71). Fonte: D91 (natureza de operação) e
// D95 (efeito do "Gerar NF" sobre os outros caminhos a partir de um pedido Aprovado).

// ---------------------------------------------------------------------------------------------
// NaturezaOperacaoField (D91)
// ---------------------------------------------------------------------------------------------

export const NATUREZA_OPERACAO_FIELD = {
    rotulo: 'Natureza de operação',
    placeholder: 'Selecione a natureza de operação',
    nenhumaEncontrada: 'Nenhuma natureza encontrada com este filtro.',
    recarregar: 'Recarregar',
    carregando: 'Carregando as naturezas de operação ativas da empresa…',
    semEmpresa: 'Selecione a empresa para listar as naturezas de operação.',
    semPermissao: 'Listar as naturezas de operação exige a permissão FISCAL_CADASTROS_CONSULTAR.',
    erroConsulta: 'Não foi possível carregar as naturezas de operação. Tente recarregar.',
    vazio:
        'Nenhuma natureza de operação ativa cadastrada para esta empresa. Sem natureza, a geração da nota é recusada pelo backend. O cadastro de naturezas ainda não tem tela; peça a inclusão ao responsável fiscal.',
    listaCortada: 'A lista mostra só as primeiras 200 naturezas ativas da empresa, em ordem de código.'
} as const;

// ---------------------------------------------------------------------------------------------
// Criar nota fiscal manual
// ---------------------------------------------------------------------------------------------

export const CRIAR_NOTA_FISCAL = {
    // O endpoint existe (`NaturezasOperacaoController.cs:41-73`); este diálogo ainda não oferece a seleção.
    // Na nota manual, sem natureza não é erro: o CFOP do item vem do que for informado, sem derivação
    // (`NotaFiscalBasicaUseCases.cs:118-124`), diferente do Gerar NF a partir do pedido.
    naturezaDica:
        'A natureza vem do cadastro de naturezas de operação ativas da empresa; este diálogo ainda não oferece a seleção. Sem natureza, a nota é criada e o CFOP de cada item vem do que for informado no item, sem derivação.'
} as const;

// ---------------------------------------------------------------------------------------------
// Gerar NF a partir do pedido de venda (D95)
// ---------------------------------------------------------------------------------------------

export const GERAR_NF_PEDIDO_VENDA = {
    // O endpoint existe (`NaturezasOperacaoController.cs:41-73`); este diálogo ainda não oferece a seleção.
    // Sem natureza e com a validação ligada, o backend recusa (`GerarNotaFiscalPedidoVendaUseCase.cs:165-167`).
    naturezaDica:
        'A natureza vem do cadastro de naturezas de operação ativas da empresa; este diálogo ainda não oferece a seleção. Sem natureza, a geração com a validação fiscal ligada é recusada pelo backend.',
    efeito:
        'Gera a nota fiscal em rascunho a partir do pedido. Depois disso, o módulo Faturamento não consegue faturar este pedido: a nota já existe para a origem e não é reaproveitada.'
} as const;
