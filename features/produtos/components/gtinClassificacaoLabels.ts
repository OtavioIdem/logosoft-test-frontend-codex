// Textos da sugestão de classificação por GTIN (v1.11.0a8b80, D111).

export const gtinClassificacaoLabels = {
    regiao: 'Sugestão de classificação IBS/CBS por GTIN',
    titulo: 'Sugestão de classificação IBS/CBS',
    botao: 'Sugerir classificação',
    botaoAjuda: 'Consulta a tabela de benefícios da LC 214/2025 pelo código de barras do produto.',
    semCodigo: 'Sugestão por GTIN indisponível: este produto não tem código de barras cadastrado. Cadastre o código na aba "Códigos e fornecedores".',
    codigoForaDoFormato: 'Sugestão por GTIN indisponível: o código de barras principal não tem 8, 12, 13 ou 14 dígitos numéricos.',
    aviso: 'Fonte não oficial: a tabela cobre apenas produtos com benefício da LC 214/2025. A decisão é do operador; nada é preenchido sem a sua escolha.',
    carregando: 'Consultando a tabela de benefícios...',
    naoEncontrado: 'Este GTIN não consta da tabela de benefícios da LC 214/2025. Isso não é erro: o produto segue com a tributação normal.',
    formatoInvalido: 'O GTIN informado é inválido: use 8, 12, 13 ou 14 dígitos numéricos.',
    erroTitulo: 'Não foi possível consultar a sugestão de classificação.',
    tentarNovamente: 'Tentar novamente',
    outrasClassificacoes: 'Outras classificações possíveis',
    usarNcm: 'Usar este NCM',
    usarNcmAjuda: 'Troca o NCM do formulário por este; o CEST é reconferido. Nenhum outro campo é alterado.',
    campos: {
        gtin: 'GTIN consultado',
        anexo: 'Anexo',
        item: 'Item do anexo',
        ncm: 'NCM',
        descricao: 'Descrição',
        cClassTrib: 'cClassTrib',
        cstIbsCbs: 'CST IBS/CBS',
        reducaoIbs: 'Redução IBS',
        reducaoCbs: 'Redução CBS',
        vigencia: 'Vigência'
    }
} as const;

export const GTIN_FORMATO_INVALIDO_CODE = 'FISCAL_CADASTROS_GTIN_FORMATO_INVALIDO';
