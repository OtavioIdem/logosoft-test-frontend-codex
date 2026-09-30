// Rótulos da fatia Naturezas de operação (v1.11.0a8b72). Fonte: D47-D53, D98-D101 e o inventário
// `docs/arquitetura/debate/14-inventario-naturezas-operacao.md`. O design escreve só os rótulos; a tela, os
// diálogos, os hooks, os schemas e a lógica da grade são do `dev-senior-react`. Padrão de tela: Séries
// fiscais (D48), sem componente compartilhado novo.
//
// O backend serializa enum como NÚMERO (sem `JsonStringEnumConverter`, `Program.cs:28-31`). Por isso cada
// enum abaixo é indexado pelo valor numérico do C# e traz, no comentário, a linha de onde o valor veio
// (`../New project 3/src`, lido em 2026-09-30).

// ---------------------------------------------------------------------------------------------
// Enums (valor numérico do C#)
// ---------------------------------------------------------------------------------------------

/** `TipoDocumentoFiscal`, `Erp.Domain/Fiscal/EnumsFiscal.cs:3-10`. A natureza aceita os 6 (`Enum.IsDefined`, NO-16). */
export const TIPO_DOCUMENTO_NATUREZA_OPTIONS: { label: string; value: number }[] = [
    { label: 'NF-e', value: 1 }, // NFe = 1 (:5)
    { label: 'NFC-e', value: 2 }, // NFCe = 2 (:6)
    { label: 'NFS-e', value: 3 }, // NFSe = 3 (:7)
    { label: 'CT-e', value: 4 }, // CTe = 4 (:8)
    { label: 'MDF-e', value: 5 }, // MDFe = 5 (:9)
    { label: 'Outro', value: 99 } // Outro = 99 (:10)
];

/** `TipoOperacaoFiscal`, `EnumsFiscal.cs:13-23` (9 valores). */
export const TIPO_OPERACAO_NATUREZA_OPTIONS: { label: string; value: number }[] = [
    { label: 'Venda', value: 1 }, // Venda = 1 (:15)
    { label: 'Compra', value: 2 }, // Compra = 2 (:16)
    { label: 'Devolução', value: 3 }, // Devolucao = 3 (:17)
    { label: 'Remessa', value: 4 }, // Remessa = 4 (:18)
    { label: 'Transferência', value: 5 }, // Transferencia = 5 (:19)
    { label: 'Bonificação', value: 6 }, // Bonificacao = 6 (:20)
    { label: 'Serviço', value: 7 }, // Servico = 7 (:21)
    { label: 'Transporte', value: 8 }, // Transporte = 8 (:22)
    { label: 'Outro', value: 99 } // Outro = 99 (:23)
];

/** `FinalidadeNaturezaOperacao`, `Erp.Domain/Fiscal/Cadastros/EnumsCadastrosFiscais.cs:36-42`. */
export const FINALIDADE_NATUREZA_OPTIONS: { label: string; value: number }[] = [
    { label: 'Normal', value: 1 }, // Normal = 1 (:38)
    { label: 'Complementar', value: 2 }, // Complementar = 2 (:39)
    { label: 'Ajuste', value: 3 }, // Ajuste = 3 (:40)
    { label: 'Devolução', value: 4 } // Devolucao = 4 (:41)
];

/** `IndicadorPresencaComprador` (indPres da NF-e), `EnumsCadastrosFiscais.cs:47-55` (7 valores; 6 e 7 não existem). */
export const INDICADOR_PRESENCA_COMPRADOR_OPTIONS: { label: string; value: number }[] = [
    { label: 'Não se aplica', value: 0 }, // NaoSeAplica = 0 (:49)
    { label: 'Presencial', value: 1 }, // Presencial = 1 (:50)
    { label: 'Internet', value: 2 }, // Internet = 2 (:51)
    { label: 'Teleatendimento', value: 3 }, // Teleatendimento = 3 (:52)
    { label: 'Entrega em domicílio', value: 4 }, // EntregaDomicilio = 4 (:53)
    { label: 'Presencial fora do estabelecimento', value: 5 }, // PresencialForaDoEstabelecimento = 5 (:54)
    { label: 'Outros', value: 9 } // Outros = 9 (:55)
];

/** `AmbitoCfop`, `EnumsCadastrosFiscais.cs:62-67`. Derivado do 1º dígito do CFOP (5 = interno, 6 = interestadual, 7 = exterior). */
export const AMBITO_CFOP_OPTIONS: { label: string; value: number }[] = [
    { label: 'Interno', value: 1 }, // Interno = 1 (:64)
    { label: 'Interestadual', value: 2 }, // Interestadual = 2 (:65)
    { label: 'Exterior', value: 3 } // Exterior = 3 (:66)
];

/**
 * `TipoItemCfop`, `Erp.Domain/Fiscal/Cadastros/TipoItemCfop.cs:15-22`. `null` (campo `TipoItem` ausente) é o
 * mapeamento genérico e vale para qualquer item (`NaturezaOperacao.cs:166-175`: cai nele quando não há
 * combinação exata). O valor `null` do Dropdown NÃO pode ser enviado como `undefined`: o request leva `null`.
 */
export const TIPO_ITEM_CFOP_QUALQUER_ITEM = 'Qualquer item';
export const TIPO_ITEM_CFOP_OPTIONS: { label: string; value: number | null }[] = [
    { label: TIPO_ITEM_CFOP_QUALQUER_ITEM, value: null }, // TipoItem? = null
    { label: 'Revenda', value: 1 }, // Revenda = 1 (:18)
    { label: 'Produção própria', value: 2 } // ProducaoPropria = 2 (:21)
];

const rotuloPorValor = (options: { label: string; value: number | null }[], value: number | null | undefined, vazio: string): string => {
    if (value === null || value === undefined) return vazio;
    return options.find((option) => option.value === value)?.label ?? `Valor ${value}`;
};

export const tipoDocumentoNaturezaLabel = (value?: number | null): string => rotuloPorValor(TIPO_DOCUMENTO_NATUREZA_OPTIONS, value, '-');
export const tipoOperacaoNaturezaLabel = (value?: number | null): string => rotuloPorValor(TIPO_OPERACAO_NATUREZA_OPTIONS, value, '-');
export const finalidadeNaturezaLabel = (value?: number | null): string => rotuloPorValor(FINALIDADE_NATUREZA_OPTIONS, value, '-');
export const indicadorPresencaCompradorLabel = (value?: number | null): string => rotuloPorValor(INDICADOR_PRESENCA_COMPRADOR_OPTIONS, value, '-');
export const ambitoCfopLabel = (value?: number | null): string => rotuloPorValor(AMBITO_CFOP_OPTIONS, value, '-');
/** `null`/ausente = "Qualquer item" (nunca "-"): é um valor válido da chave, não falta de dado. */
export const tipoItemCfopLabel = (value?: number | null): string => rotuloPorValor(TIPO_ITEM_CFOP_OPTIONS, value, TIPO_ITEM_CFOP_QUALQUER_ITEM);

// ---------------------------------------------------------------------------------------------
// Permissão
// ---------------------------------------------------------------------------------------------

export const permissaoNecessariaNaturezaLabel = (permissao: string): string => `Permissão necessária: ${permissao}.`;

export const NATUREZAS_OPERACAO_PERMISSAO = {
    /** description do UnauthorizedState quando falta FISCAL_CADASTROS_CONSULTAR (S3/S4): sem ela não há listagem nem busca de CFOP */
    unauthorizedDescription: 'Naturezas de operação exigem FISCAL_CADASTROS_CONSULTAR para listar e buscar CFOP.',
    /** title do botão Nova natureza quando falta FISCAL_CADASTROS_GERENCIAR (S1) */
    novaNaturezaSemGerenciar: permissaoNecessariaNaturezaLabel('FISCAL_CADASTROS_GERENCIAR'),
    /** title do botão Salvar/Editar quando falta FISCAL_CADASTROS_GERENCIAR */
    acaoSemGerenciar: permissaoNecessariaNaturezaLabel('FISCAL_CADASTROS_GERENCIAR'),
    /** busca de CFOP na grade sem FISCAL_CADASTROS_CONSULTAR (a busca usa a mesma permissão) */
    buscaCfopSemConsultar: permissaoNecessariaNaturezaLabel('FISCAL_CADASTROS_CONSULTAR')
} as const;

// ---------------------------------------------------------------------------------------------
// Página e listagem
// ---------------------------------------------------------------------------------------------

export const NATUREZAS_OPERACAO_PAGINA = {
    titulo: 'Naturezas de operação',
    descricao: 'Cadastro das naturezas de operação da empresa e do CFOP que vale para cada âmbito e tipo de item.',
    novaNatureza: 'Nova natureza',
    cardListagem: 'Naturezas cadastradas',
    campoSituacao: 'Situação'
} as const;

export const NATUREZAS_OPERACAO_COLUNAS = {
    codigo: 'Código',
    descricao: 'Descrição',
    tipoDocumento: 'Tipo de documento',
    operacao: 'Operação',
    finalidade: 'Finalidade',
    filial: 'Filial',
    situacao: 'Situação',
    acoes: 'Ações'
} as const;

/** body da coluna Filial quando a natureza vale para a empresa toda (`FilialId` nulo) */
export const NATUREZA_SEM_FILIAL = 'Todas as filiais';

export const SITUACAO_NATUREZA_LABEL = {
    ativa: 'Ativa',
    inativa: 'Inativa'
} as const;

export const situacaoNaturezaSeverity = (ativa: boolean): 'success' | 'danger' => (ativa ? 'success' : 'danger');

// Filtro de Situação (D98): "Ativas" -> somenteAtivas=true; "Todas" -> omite o parâmetro. NÃO há "Inativas":
// o servidor só filtra com `true` (NO-3), então `false` devolveria tudo e a opção mentiria.
export const NATUREZAS_OPERACAO_FILTRO_SITUACAO_VALOR = {
    ativas: 'ativas',
    todas: 'todas'
} as const;

export type NaturezasOperacaoFiltroSituacaoValor = (typeof NATUREZAS_OPERACAO_FILTRO_SITUACAO_VALOR)[keyof typeof NATUREZAS_OPERACAO_FILTRO_SITUACAO_VALOR];

export const NATUREZAS_OPERACAO_FILTRO_SITUACAO_OPTIONS: { label: string; value: NaturezasOperacaoFiltroSituacaoValor }[] = [
    { label: 'Ativas', value: NATUREZAS_OPERACAO_FILTRO_SITUACAO_VALOR.ativas },
    { label: 'Todas', value: NATUREZAS_OPERACAO_FILTRO_SITUACAO_VALOR.todas }
];

export const NATUREZAS_OPERACAO_FILTRO_SITUACAO_PADRAO: NaturezasOperacaoFiltroSituacaoValor = NATUREZAS_OPERACAO_FILTRO_SITUACAO_VALOR.ativas;

// ---------------------------------------------------------------------------------------------
// Estados da listagem
// ---------------------------------------------------------------------------------------------

export const NATUREZAS_OPERACAO_VAZIO = {
    /** 0 naturezas na empresa: diz o próximo passo */
    titulo: 'Nenhuma natureza de operação cadastrada',
    descricao: 'Cadastre a primeira natureza de operação desta empresa e mapeie o CFOP de cada âmbito. Sem ela, o faturamento e a geração de nota fiscal ficam indisponíveis.',
    /** descrição quando o operador não tem FISCAL_CADASTROS_GERENCIAR: sem botão, com o motivo */
    descricaoSemGerenciar: 'Peça a alguém com a permissão FISCAL_CADASTROS_GERENCIAR para cadastrar a primeira natureza de operação desta empresa.',
    /** filtro Ativas sem resultado, mas a empresa tem inativas ou o filtro esconde algo */
    tituloFiltrado: 'Nenhuma natureza ativa encontrada',
    descricaoFiltrado: 'Não há natureza ativa nesta empresa. Cadastre uma natureza de operação ou mude a situação para Todas para ver as inativas.',
    descricaoFiltradoSemGerenciar: 'Não há natureza ativa nesta empresa. Peça a quem administra o cadastro fiscal para cadastrar uma, ou mude a situação para Todas para ver as inativas.',
    /** sem empresa escolhida no filtro: a listagem não consulta */
    semEmpresa: 'Selecione a empresa para listar as naturezas de operação.'
} as const;

export const NATUREZAS_OPERACAO_ERRO = {
    /** erro recuperável da listagem: ApiErrorPanel fixo + botão de nova tentativa (o ApiErrorPanel não tem retry) */
    tituloListagem: 'Não foi possível carregar as naturezas de operação.',
    tentarNovamente: 'Tentar novamente',
    /** aviso sob a tabela quando o servidor devolve 404 ao editar natureza de outra filial (NO-7, não medido em execução) */
    naoEncontradaDica: 'Este cadastro pode pertencer a outra empresa ou filial fora do seu acesso.'
} as const;

export const NATUREZAS_OPERACAO_TOAST = {
    criada: (codigo: string): string => `Natureza de operação ${codigo} cadastrada.`,
    atualizada: (codigo: string): string => `Natureza de operação ${codigo} atualizada.`,
    inativada: (codigo: string): string => `Natureza de operação ${codigo} inativada.`
} as const;

// ---------------------------------------------------------------------------------------------
// Diálogo de natureza (criar e editar), em seções
// ---------------------------------------------------------------------------------------------

export const NATUREZA_OPERACAO_CRIAR_DIALOG = {
    titulo: 'Cadastrar natureza de operação',
    confirmLabel: 'Cadastrar'
} as const;

export const NATUREZA_OPERACAO_EDITAR_DIALOG = {
    /** `Editar natureza de operação ${codigo}` */
    titulo: (codigo: string): string => `Editar natureza de operação ${codigo}`,
    confirmLabel: 'Salvar'
} as const;

export const NATUREZA_OPERACAO_SECOES = {
    identificacao: 'Identificação',
    classificacao: 'Classificação fiscal',
    efeitos: 'Efeitos da operação',
    mapeamentoCfop: 'CFOP por âmbito e tipo de item'
} as const;

export const NATUREZA_OPERACAO_CAMPOS = {
    empresa: 'Empresa',
    empresaHint: 'A natureza pertence à empresa selecionada no contexto.',
    filial: 'Filial (opcional)',
    filialHint: 'Deixe em branco para valer em todas as filiais da empresa. A filial não pode ser alterada depois.',
    codigo: 'Código',
    codigoHint: 'Até 40 caracteres, sem espaços. O sistema grava em maiúsculas e não permite alterar depois.',
    codigoSomenteLeitura: 'O código identifica a natureza nas notas já emitidas e não pode ser alterado.',
    descricao: 'Descrição',
    descricaoHint: 'Até 200 caracteres.',
    observacao: 'Observação (opcional)',
    observacaoHint: 'Até 500 caracteres.',
    tipoDocumento: 'Tipo de documento',
    tipoOperacao: 'Tipo de operação',
    finalidade: 'Finalidade',
    indicadorPresencaComprador: 'Presença do comprador',
    indicadorPresencaCompradorHint: 'Indicador de presença (indPres) enviado na nota.',
    indicadorConsumidorFinal: 'Consumidor final',
    indicadorConsumidorFinalHint: 'Marca a operação como venda a consumidor final.',
    movimentaEstoque: 'Movimenta estoque',
    movimentaEstoqueHint: 'A nota gerada com esta natureza movimenta o estoque.',
    geraFinanceiro: 'Gera financeiro',
    geraFinanceiroHint: 'A nota gerada com esta natureza gera título financeiro.'
} as const;

/** Mensagens de validação do cliente (mesmos limites do domínio, `NaturezaOperacao.cs:42,196-235`). */
export const NATUREZA_OPERACAO_VALIDACAO = {
    codigoObrigatorio: 'Informe o código da natureza.',
    codigoTamanho: 'O código aceita no máximo 40 caracteres.',
    codigoEspaco: 'O código não pode ter espaços.',
    descricaoObrigatoria: 'Informe a descrição da natureza.',
    descricaoTamanho: 'A descrição aceita no máximo 200 caracteres.',
    observacaoTamanho: 'A observação aceita no máximo 500 caracteres.',
    empresaObrigatoria: 'Selecione a empresa antes de cadastrar a natureza.'
} as const;

/** Erro de negócio `FISCAL_CADASTROS_NATUREZA_CODIGO_DUPLICADO` (`CadastrosFiscaisErrors.cs:105-106`): vai para o campo Código. */
export const NATUREZA_CODIGO_DUPLICADO = {
    codigoDoErro: 'FISCAL_CADASTROS_NATUREZA_CODIGO_DUPLICADO',
    /** texto no campo Código (a checagem do backend inclui naturezas inativas) */
    campo: 'Já existe uma natureza com este código nesta empresa, ativa ou inativa. Use outro código.'
} as const;

/** Natureza inativa não é alterada pelo backend ("Natureza de operação inativa não pode ser alterada."). */
export const NATUREZA_OPERACAO_INATIVA_AVISO = 'Natureza inativa não pode ser editada. Cadastre uma nova natureza se precisar de outra configuração.';

// ---------------------------------------------------------------------------------------------
// Grade de CFOP (âmbito x tipo de item)
// ---------------------------------------------------------------------------------------------

export const NATUREZA_CFOP_GRADE = {
    titulo: 'CFOP por âmbito e tipo de item',
    descricao: 'Diz qual CFOP vale para cada combinação. Se não houver CFOP para o tipo do item, vale a linha "Qualquer item" do mesmo âmbito.',
    colunaAmbito: 'Âmbito',
    colunaTipoItem: 'Tipo de item',
    colunaCfop: 'CFOP',
    colunaAcoes: 'Ações',
    adicionarLinha: 'Adicionar CFOP',
    removerLinha: 'Remover linha',
    /** aria-label do botão só-ícone de remover: `Remover CFOP do âmbito X, item Y` */
    removerLinhaAria: (ambito: string, tipoItem: string): string => `Remover CFOP do âmbito ${ambito}, ${tipoItem}`,
    /** grade vazia: natureza sem mapeamento é aceita pelo backend, mas não gera nota */
    vazio: 'Nenhum CFOP mapeado. Sem mapeamento, a nota com esta natureza é recusada por falta de CFOP para o âmbito.',
    /** chave âmbito x tipo de item repetida (o backend aceita e a última vence em silêncio; a tela impede) */
    chaveRepetida: 'Já existe uma linha com este âmbito e tipo de item. Cada combinação pode ter um só CFOP.',
    chaveRepetidaAviso: 'Corrija as linhas repetidas para salvar.',
    cfopObrigatorio: 'Escolha o CFOP desta linha.',
    cfopPlaceholder: 'Buscar CFOP por código ou descrição',
    /** mensagem de vazio da busca: nunca orienta a digitar ID nem código de outra tela */
    cfopNenhumEncontrado: 'Nenhum CFOP ativo encontrado para este âmbito.',
    /** dica da busca: o filtro é guia, o backend valida o âmbito */
    cfopBuscaHint: 'A busca lista só CFOPs ativos do âmbito da linha.',
    /** trocar o âmbito da linha limpa o CFOP escolhido */
    trocaAmbitoLimpaCfop: 'Ao trocar o âmbito, o CFOP da linha é limpo: ele precisa pertencer ao novo âmbito.',
    erroBuscaCfop: 'Não foi possível buscar os CFOPs. Tente novamente.',
    /** aviso ao salvar edição: o PUT envia a lista inteira (null preserva, [] apaga, lista substitui) */
    substituicaoAviso: 'Ao salvar, esta lista substitui o mapeamento atual: linhas removidas aqui deixam de valer.',
    /** body do CFOP já salvo: o mapeamento não traz a descrição, só o código */
    cfopSalvoSemDescricao: (codigo: string): string => codigo
} as const;

// ---------------------------------------------------------------------------------------------
// Inativar -- ReasonDialog (D98)
// ---------------------------------------------------------------------------------------------

export const NATUREZA_MOTIVO_INATIVAR_MAX = 400;

/** título do ReasonDialog: "Inativar natureza de operação X (definitivo)" */
export const inativarNaturezaTitulo = (codigo: string): string => `Inativar natureza de operação ${codigo} (definitivo)`;

export const NATUREZA_OPERACAO_INATIVAR_DIALOG = {
    confirmLabel: 'Inativar',
    campoMotivo: 'Motivo obrigatório',
    motivoHint: 'De 1 a 400 caracteres. O motivo é enviado para auditoria e histórico da operação.',
    motivoObrigatorio: 'Informe o motivo da inativação.',
    motivoTamanho: 'O motivo aceita no máximo 400 caracteres.',
    /** D98: não há rota para reativar (NO-15, B-31) */
    avisoDefinitivo: 'A inativação é definitiva por esta tela: a natureza não poderá ser reativada nem editada, e o código continua reservado na empresa.',
    /** o que muda para o operador */
    avisoEfeito: 'A natureza deixa de aparecer na escolha de nota fiscal e de faturamento. Notas já emitidas não mudam.'
} as const;

// ---------------------------------------------------------------------------------------------
// Link D101 (CfopSemMapeamentoParaAmbito) e campo NaturezaOperacaoField (D100)
// ---------------------------------------------------------------------------------------------

export const NATUREZA_OPERACAO_LINK = {
    /** rótulo do link para /fiscal/naturezas-operacao, só para quem tem FISCAL_CADASTROS_CONSULTAR ou _GERENCIAR */
    cadastrar: 'Cadastrar natureza de operação',
    /** título do painel quando o erro é CfopSemMapeamentoParaAmbito (o texto do backend segue visível no ApiErrorPanel) */
    tituloCfopSemMapeamento: 'Natureza de operação sem CFOP mapeado para este âmbito',
    /** complemento quando a sessão não tem nenhuma FISCAL_CADASTROS_*: sem link, nunca orienta a digitar ID */
    semPermissaoTexto: 'Peça a alguém com permissão de cadastros fiscais para mapear o CFOP desta natureza de operação.'
} as const;

/**
 * Substitui `NATUREZA_OPERACAO_FIELD.vazio` de `fiscalLabels.ts` (D100): deixa de dizer que o cadastro não tem
 * tela. O link `NATUREZA_OPERACAO_LINK.cadastrar` é renderizado pelo componente, só com permissão de cadastro.
 */
export const NATUREZA_OPERACAO_FIELD_VAZIO = {
    /** com permissão de cadastro (texto + link "Cadastrar natureza de operação") */
    comPermissao: 'Nenhuma natureza de operação ativa cadastrada para esta empresa. Sem natureza, a geração da nota é recusada pelo backend. Cadastre uma natureza para continuar.',
    /** sem nenhuma FISCAL_CADASTROS_*: sem link, com o motivo visível */
    semPermissao: 'Nenhuma natureza de operação ativa cadastrada para esta empresa. Sem natureza, a geração da nota é recusada pelo backend. Peça a alguém com permissão de cadastros fiscais para cadastrar a natureza.'
} as const;

/** Dicas dos diálogos Nova nota e Gerar NF depois da D100 (o campo deixa de ser desabilitado). */
export const NATUREZA_OPERACAO_DICA_NOTA = {
    notaManual: 'Natureza de operação ativa da empresa. Sem natureza, a nota é criada e o CFOP de cada item vem do que for informado no item, sem derivação.',
    gerarNf: 'Natureza de operação ativa da empresa. Com a validação fiscal ligada, a geração exige natureza com CFOP mapeado para o âmbito da operação.'
} as const;
