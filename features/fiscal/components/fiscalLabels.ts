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
    listaCortada: 'A lista mostra só as primeiras 200 naturezas ativas da empresa, em ordem de código.'
} as const;

// ---------------------------------------------------------------------------------------------
// Gerar NF a partir do pedido de venda (D95)
// ---------------------------------------------------------------------------------------------

export const GERAR_NF_PEDIDO_VENDA = {
    // D100 + emenda da D91: sem natureza selecionada, o Gerar NF não envia (a nota sairia sem CFOP e ficaria presa ao pedido, B-27).
    naturezaObrigatoria: 'Selecione a natureza de operação para gerar a nota.',
    indisponivelPrefixo: 'Gerar NF indisponível:',
    efeito:
        'Gera a nota fiscal em rascunho a partir do pedido. Depois disso, o módulo Faturamento não consegue faturar este pedido: a nota já existe para a origem e não é reaproveitada.'
} as const;
