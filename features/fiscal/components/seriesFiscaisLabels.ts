// Rótulos da fatia Séries fiscais (v1.11.0a8b58, F3.1). Fonte: D47-D54 e AC-6 a AC-16 do plano
// `docs/fatias/v1.11.0a8b58-f3-series-fiscais.md`. P-7a: o design escreve só os rótulos; a tela, os
// diálogos, os hooks e a lógica de situação/faixas são do `dev-senior-react` (Bloco A). Textos entre
// aspas nos AC entram aqui exatamente como estão, porque os testes de componente e E2E procuram por
// eles.

// ---------------------------------------------------------------------------------------------
// Permissão (AC-6)
// ---------------------------------------------------------------------------------------------

/** "Permissão necessária: FISCAL_SERIES_GERENCIAR." / "Permissão necessária: FISCAL_MODELOS_CONSULTAR." */
export const permissaoNecessariaLabel = (permissao: string): string => `Permissão necessária: ${permissao}.`;

export const SERIES_FISCAIS_PERMISSAO = {
    /** title do botão "Nova série" quando falta FISCAL_SERIES_GERENCIAR (S1) */
    novaSerieSemGerenciar: permissaoNecessariaLabel('FISCAL_SERIES_GERENCIAR'),
    /** title do botão "Nova série" quando falta FISCAL_MODELOS_CONSULTAR, mesmo com GERENCIAR (S2b) */
    novaSerieSemModelos: permissaoNecessariaLabel('FISCAL_MODELOS_CONSULTAR'),
    /** description do UnauthorizedState quando falta FISCAL_SERIES_CONSULTAR (S3/S4) */
    unauthorizedDescription: 'Séries fiscais exigem FISCAL_SERIES_CONSULTAR.',
    /** texto da coluna Modelo quando a sessão não tem FISCAL_MODELOS_CONSULTAR (S1) -- nunca o GUID */
    colunaModeloIndisponivel: permissaoNecessariaLabel('FISCAL_MODELOS_CONSULTAR')
} as const;

// ---------------------------------------------------------------------------------------------
// Página e listagem (AC-8)
// ---------------------------------------------------------------------------------------------

export const SERIES_FISCAIS_PAGINA = {
    titulo: 'Séries fiscais',
    descricao: 'Cadastro e ciclo de vida das séries de numeração usadas na emissão de notas fiscais.',
    novaSerie: 'Nova série',
    cardListagem: 'Séries cadastradas'
} as const;

export const SERIES_FISCAIS_COLUNAS = {
    modelo: 'Modelo',
    serie: 'Série',
    estabelecimento: 'Estabelecimento',
    faixa: 'Faixa',
    proximo: 'Próximo',
    restantes: 'Restantes',
    vigencia: 'Vigência',
    situacao: 'Situação',
    acoes: 'Ações'
} as const;

/** body da coluna Modelo: `${codigo} — ${descricao}` (o traço é em travessão, não hífen) */
export const modeloDocumentoFiscalColunaLabel = (codigo: string, descricao: string): string => `${codigo} — ${descricao}`;

/** body da coluna Estabelecimento quando a série não tem filial (exato -- AC-8) */
export const SERIE_FISCAL_SEM_FILIAL = 'Sem filial';

/** trecho da coluna Vigência quando não há data fim (exato -- AC-8) */
export const SERIE_FISCAL_VIGENCIA_INDETERMINADA = 'indeterminada';

/** body da coluna Vigência: "dd/mm/aaaa até indeterminada" ou "dd/mm/aaaa até dd/mm/aaaa" */
export const serieFiscalVigenciaColunaLabel = (inicioFormatado: string, fimFormatado?: string | null): string => `${inicioFormatado} até ${fimFormatado ?? SERIE_FISCAL_VIGENCIA_INDETERMINADA}`;

// Situação derivada contra hoje local (SerieFiscal.cs:101-111). As chaves seguem a ordem de
// precedência que `situacaoSerieFiscal` (seriesFiscaisUtils.ts, Bloco A) deve aplicar: Inativa vence
// sobre as demais, depois Faixa esgotada, depois vigência.
export const SITUACAO_SERIE_FISCAL_LABEL = {
    inativa: 'Inativa',
    faixaEsgotada: 'Faixa esgotada',
    vigenciaAIniciar: 'Vigência a iniciar',
    vigenciaEncerrada: 'Vigência encerrada',
    vigente: 'Vigente'
} as const;

export type SituacaoSerieFiscalChave = keyof typeof SITUACAO_SERIE_FISCAL_LABEL;

export const situacaoSerieFiscalSeverity = (situacao: SituacaoSerieFiscalChave): 'success' | 'info' | 'warning' | 'danger' => {
    switch (situacao) {
        case 'vigente':
            return 'success';
        case 'vigenciaAIniciar':
            return 'info';
        case 'faixaEsgotada':
        case 'vigenciaEncerrada':
            return 'warning';
        default:
            return 'danger';
    }
};

// Filtro de Situação da listagem (AC-4, AC-8, P-12a: padrão "Ativas"). "Ativas" -> somenteAtivas=true;
// "Inativas" -> somenteAtivas=false; "Todas" -> omite o parâmetro.
export const SERIES_FISCAIS_FILTRO_SITUACAO_VALOR = {
    ativas: 'ativas',
    inativas: 'inativas',
    todas: 'todas'
} as const;

export type SeriesFiscaisFiltroSituacaoValor = (typeof SERIES_FISCAIS_FILTRO_SITUACAO_VALOR)[keyof typeof SERIES_FISCAIS_FILTRO_SITUACAO_VALOR];

export const SERIES_FISCAIS_FILTRO_SITUACAO_OPTIONS: { label: string; value: SeriesFiscaisFiltroSituacaoValor }[] = [
    { label: 'Ativas', value: SERIES_FISCAIS_FILTRO_SITUACAO_VALOR.ativas },
    { label: 'Inativas', value: SERIES_FISCAIS_FILTRO_SITUACAO_VALOR.inativas },
    { label: 'Todas', value: SERIES_FISCAIS_FILTRO_SITUACAO_VALOR.todas }
];

export const SERIES_FISCAIS_FILTRO_SITUACAO_PADRAO: SeriesFiscaisFiltroSituacaoValor = SERIES_FISCAIS_FILTRO_SITUACAO_VALOR.ativas;

// Estado vazio da listagem. O aviso de contexto (empresa não selecionada) é do próprio
// `EmpresaFilialFilter` e não entra aqui (fora do escopo deste arquivo, ver briefing do Bloco D).
export const SERIES_FISCAIS_VAZIO = {
    titulo: 'Nenhuma série fiscal cadastrada',
    descricao: 'Cadastre a primeira série fiscal para esta empresa e filial.',
    tituloFiltrado: 'Nenhuma série encontrada',
    descricaoFiltrado: 'Ajuste o filtro de situação, modelo ou filial para encontrar a série.'
} as const;

// ---------------------------------------------------------------------------------------------
// Diálogo Criar (AC-9)
// ---------------------------------------------------------------------------------------------

export const SERIE_FISCAL_CRIAR_DIALOG = {
    /** header do Dialog (exato -- AC-9/plano §6 Bloco D) */
    titulo: 'Cadastrar série fiscal',
    confirmLabel: 'Cadastrar',
    campoEmpresa: 'Empresa',
    campoFilial: 'Filial',
    /** hint do campo Filial quando vazio (exato -- AC-9, SerieFiscalRepository.cs:36) */
    filialVaziaAviso: 'Série sem filial só numera nota sem filial',
    campoModelo: 'Modelo',
    modeloHint: 'Somente modelos de documento fiscal ativos aparecem na lista.',
    campoNumero: 'Número',
    numeroHint: 'De 0 a 999. Não pode repetir uma série ativa neste contexto.',
    campoNumeroInicial: 'Número inicial',
    campoNumeroFinal: 'Número final',
    numeroFinalHint: 'Maior ou igual ao número inicial.',
    campoVigenciaInicio: 'Vigência início',
    campoVigenciaFim: 'Vigência fim (opcional)',
    vigenciaFimHint: 'Deixe em branco para vigência por prazo indeterminado.'
} as const;

// ---------------------------------------------------------------------------------------------
// Diálogo Ampliar (AC-10)
// ---------------------------------------------------------------------------------------------

export const SERIE_FISCAL_AMPLIAR_DIALOG = {
    titulo: 'Ampliar numeração da série',
    confirmLabel: 'Ampliar',
    numeroFinalAtualLabel: 'Número final atual',
    proximoNumeroLabel: 'Próximo número livre',
    campoNovoNumeroFinal: 'Novo número final',
    novoNumeroFinalHint: 'Deve ser maior ou igual ao número final atual.'
} as const;

// ---------------------------------------------------------------------------------------------
// Diálogo Encerrar vigência (AC-11)
// ---------------------------------------------------------------------------------------------

export const SERIE_FISCAL_ENCERRAR_DIALOG = {
    titulo: 'Encerrar vigência da série',
    confirmLabel: 'Encerrar vigência',
    campoVigenciaFim: 'Nova data de fim de vigência',
    /** aviso quando a data escolhida é anterior a hoje */
    dataAnteriorAHojeAviso: 'A data informada é anterior a hoje.',
    /** aviso fixo -- a data pode ser redefinida enquanto a série continuar ativa (SerieFiscal.cs:136-140) */
    dataRedefinivelAviso: 'Enquanto a série estiver ativa, esta data de encerramento pode ser redefinida depois.'
} as const;

// ---------------------------------------------------------------------------------------------
// Diálogo Inativar (AC-12) -- ReasonDialog
// ---------------------------------------------------------------------------------------------

/** título do ReasonDialog: "Inativar série fiscal N (definitivo)" (formato exato -- AC-12) */
export const inativarSerieFiscalTitulo = (numero: number | string): string => `Inativar série fiscal ${numero} (definitivo)`;

export const SERIE_FISCAL_INATIVAR_DIALOG = {
    confirmLabel: 'Inativar',
    /** aviso complementar: a inativação é definitiva para o número (B-9, CHANGELOG) */
    avisoDefinitivo: 'A inativação é definitiva: este número de série não poderá ser reaberto.'
} as const;

// ---------------------------------------------------------------------------------------------
// Diálogo Buracos (AC-13)
// ---------------------------------------------------------------------------------------------

export const buracosSerieFiscalTitulo = (numero: number | string): string => `Buracos da série fiscal ${numero}`;

export const SERIE_FISCAL_BURACOS_DIALOG = {
    consultarLabel: 'Consultar buracos',
    ultimoNumeroAlocadoLabel: 'Último número alocado',
    totalNumerosLabel: 'Total de números disponíveis',
    faixasLabel: 'Faixas',
    /** ultimoNumeroAlocado < numeroInicial (exato -- AC-13) */
    nenhumNumeroAlocado: 'Nenhum número alocado ainda',
    /** lista de buracos vazia (exato -- AC-13) */
    semBuracos: 'Sem buracos',
    /** aviso fixo: notas em andamento aparecem como buraco (SerieFiscalRepository.cs:89-94) */
    notasEmAndamentoAviso: 'Notas em andamento (ainda não autorizadas ou canceladas) aparecem como buraco até serem concluídas.',
    /** aviso quando a lista compactada excede o teto de exibição (P-4a, TETO_FAIXAS_BURACOS = 1000) */
    tetoAviso: (totalFaixas: number, totalNumeros: number): string => `Exibindo as primeiras 1000 faixas. O intervalo tem ${totalFaixas} faixas e ${totalNumeros} números no total.`,
    linkInutilizacoes: 'Ir para Inutilizações'
} as const;

// ---------------------------------------------------------------------------------------------
// Combo de série na nota fiscal (AC-15) -- NotaFiscalSerieField
// ---------------------------------------------------------------------------------------------

export const NOTA_FISCAL_SERIE_FIELD = {
    campoLabel: 'Série',
    placeholder: 'Buscar série',
    /** lista de séries ativas vazia para o contexto (P-1b): aviso + link + campo texto continuam disponíveis */
    vazioAviso: 'Nenhuma série ativa encontrada para este contexto. Cadastre uma série fiscal ou informe o número manualmente.',
    /** rótulo do link para o cadastro (mesmo texto do painel D50 -- AC-16) */
    linkCadastrarSerie: 'Cadastrar série fiscal',
    /** dica exibida no campo texto quando a sessão não tem as duas permissões do combo (P-2a) */
    semPermissaoHint: 'Disponível com as permissões FISCAL_SERIES_CONSULTAR e FISCAL_MODELOS_CONSULTAR.',
    /** combo desabilitado no fluxo "gerar de pedido" enquanto nenhum pedido foi escolhido (exato -- AC-15) */
    selecionePedido: 'Selecione o pedido'
} as const;

// ---------------------------------------------------------------------------------------------
// Painel D50 no detalhe da nota (AC-16) -- NotaFiscalErroCadastroPanel
// ---------------------------------------------------------------------------------------------

export const SERIE_FISCAL_NAO_CADASTRADA_PANEL = {
    titulo: 'Série fiscal não cadastrada para este contexto',
    /** rótulo do link, só quando a sessão tem alguma FISCAL_SERIES_* (exato -- AC-16, mesmo texto do combo) */
    linkCadastrarSerie: 'Cadastrar série fiscal',
    /** texto complementar quando não há nenhuma FISCAL_SERIES_* -- sem link, nunca orienta a digitar ID */
    semPermissaoTexto: 'Peça a alguém com permissão de séries fiscais para cadastrar a série usada neste contexto.'
} as const;
