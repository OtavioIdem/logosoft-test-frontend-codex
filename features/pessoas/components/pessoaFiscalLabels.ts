// Rótulos da fatia Pessoa fiscal (v1.11.0a8b75). Fonte: D47 item 2, D49 item 2, D50, D52, D53, D102, D104 e o
// inventário `docs/arquitetura/debate/16-inventario-pessoa-fiscal.md` (PF-1 a PF-19). O design escreve só os
// rótulos; a aba, o diálogo, os hooks, os schemas e a lógica são do `dev-senior-react`. Padrão visual: aba do
// `TabView` do `PessoaFormDialog` + diálogo aninhado (`appendTo="self"`), igual ao de endereço da b73, sem
// componente compartilhado novo.
//
// O backend serializa enum como NÚMERO (sem `JsonStringEnumConverter`). Os enums abaixo são indexados pelo valor
// numérico do C# e trazem, no comentário, a linha de onde o valor veio (`../New project 3/src`, lido em 2026-10-02).
//
// Os rótulos "Contribuinte do IPI" e "Tomador é órgão público" repetem o texto que o backend manda o operador
// procurar ("Dados Fiscais > Contribuinte do IPI", `FiscalErrors.cs:365-366`; "Dados Fiscais > Tomador é órgão
// público", `:375-376`): a mensagem de erro e a tela passam a falar a mesma língua (PF-8).

// ---------------------------------------------------------------------------------------------
// Enum IndicadorContribuinteIcms (valor numérico do C#)
// ---------------------------------------------------------------------------------------------

/**
 * `IndicadorContribuinteIcms`, `Erp.Domain/Pessoas/IndicadorContribuinteIcms.cs:12-17` (3 valores explícitos).
 * Só `Contribuinte` exige inscrição estadual na Pessoa (`:35-36`, `ExigeInscricaoEstadual`).
 */
export const INDICADOR_CONTRIBUINTE_ICMS_OPTIONS: { label: string; value: number }[] = [
    { label: 'Contribuinte', value: 1 }, // Contribuinte = 1 (:14)
    { label: 'Isento', value: 2 }, // Isento = 2 (:15)
    { label: 'Não contribuinte', value: 3 } // NaoContribuinte = 3 (:16)
];

/** Valor do indicador que exige inscrição estadual: Contribuinte = 1 (`IndicadorContribuinteIcms.cs:14,35-36`). */
export const INDICADOR_CONTRIBUINTE_ICMS_CONTRIBUINTE = 1;

export const indicadorContribuinteIcmsLabel = (value?: number | null): string => {
    if (value === null || value === undefined) return 'Não informado';
    return INDICADOR_CONTRIBUINTE_ICMS_OPTIONS.find((option) => option.value === value)?.label ?? `Valor ${value}`;
};

/**
 * Descrição curta por valor, para o `title` da opção e para a leitura da aba somente leitura. A tradução para o
 * `indIEDest` da NF-e é derivada no servidor (`IndicadorContribuinteIcms.cs:26-32`: 1->1, 2->2, 3->9) e nunca é
 * informada pela tela.
 */
export const INDICADOR_CONTRIBUINTE_ICMS_DESCRICAO: Record<number, string> = {
    1: 'Tem inscrição estadual ativa e contribui com o ICMS. Exige a inscrição estadual da pessoa.',
    2: 'Contribuinte isento de inscrição estadual.',
    3: 'Não contribui com o ICMS (por exemplo, consumidor final).'
};

// ---------------------------------------------------------------------------------------------
// Enum IndicadorIeDestinatario (derivado, somente leitura)
// ---------------------------------------------------------------------------------------------

/**
 * `IndicadorIeDestinatario` é DERIVADO do indicador acima pelo servidor (`IndicadorContribuinteIcms.cs:26-32`) e
 * nunca vai no request. A aba pode mostrá-lo como linha somente leitura; os valores 1/2/9 são os da NF-e (inventário §4).
 */
export const INDICADOR_IE_DESTINATARIO_LABELS: Record<number, string> = {
    1: 'Contribuinte do ICMS', // ContribuinteIcms = 1 (derivado de Contribuinte, :28)
    2: 'Contribuinte isento', // ContribuinteIsento = 2 (derivado de Isento, :29)
    9: 'Não contribuinte' // NaoContribuinte = 9 (derivado de NaoContribuinte, :30)
};

export const indicadorIeDestinatarioLabel = (value?: number | null): string => {
    if (value === null || value === undefined) return '-';
    return INDICADOR_IE_DESTINATARIO_LABELS[value] ?? `Valor ${value}`;
};

// ---------------------------------------------------------------------------------------------
// Enum RegimeTributario (valor numérico do C#, sem valores explícitos)
// ---------------------------------------------------------------------------------------------

/** `RegimeTributario`, `Erp.Domain/Administration/RegimeTributario.cs:3-8`: sem valores explícitos, portanto 0/1/2. */
export const REGIME_TRIBUTARIO_PARCEIRO_OPTIONS: { label: string; value: number }[] = [
    { label: 'Simples Nacional', value: 0 }, // SimplesNacional = 0 (:5)
    { label: 'Lucro Presumido', value: 1 }, // LucroPresumido = 1 (:6)
    { label: 'Lucro Real', value: 2 } // LucroReal = 2 (:7)
];

export const regimeTributarioParceiroLabel = (value?: number | null): string => {
    if (value === null || value === undefined) return 'Não informado';
    return REGIME_TRIBUTARIO_PARCEIRO_OPTIONS.find((option) => option.value === value)?.label ?? `Valor ${value}`;
};

// ---------------------------------------------------------------------------------------------
// Campos tri-estado (bool? no C#: null = não informado, e null é diferente de false)
// ---------------------------------------------------------------------------------------------

/**
 * `ContribuinteIpi` e `TomadorOrgaoPublico` são `bool?` (`PessoaRequests.cs:44-45`). Checkbox esconderia o
 * "não informado" e o `Fiscal.ContextoDestinatarioContribuinteIpiNaoInformado` existe justamente para ele: a
 * tela usa Dropdown de três opções. `value: null` é a opção "Não informado".
 */
export const TRI_ESTADO_OPTIONS: { label: string; value: boolean | null }[] = [
    { label: 'Não informado', value: null },
    { label: 'Sim', value: true },
    { label: 'Não', value: false }
];

export const triEstadoLabel = (value?: boolean | null): string => {
    if (value === null || value === undefined) return 'Não informado';
    return value ? 'Sim' : 'Não';
};

// ---------------------------------------------------------------------------------------------
// Aba "Dados fiscais" -- cabeçalho, permissões, avisos de gravação
// ---------------------------------------------------------------------------------------------

export const PESSOA_FISCAL_ABA = {
    /** header do TabPanel (D49 item 2). Igual ao texto "Dados Fiscais" que o backend cita, com a caixa da tela. */
    titulo: 'Dados fiscais',
    descricao: 'Classificação fiscal da pessoa para a nota. Estes dados são gravados à parte dos dados gerais.',
    /** botão da aba (PATCH `/dados-fiscais`). Secundário: a ação primária do diálogo segue sendo o Salvar do rodapé. */
    salvar: 'Salvar dados fiscais',
    descartar: 'Descartar alterações',
    /** aria-label do grupo de campos */
    formularioAria: 'Dados fiscais da pessoa'
} as const;

/** PF-1: o PATCH substitui o bloco inteiro. Texto fixo, sempre visível acima do botão (Message info). */
export const PESSOA_FISCAL_GRAVACAO = {
    titulo: 'Salvar grava o bloco fiscal inteiro',
    texto: 'Salvar grava o bloco fiscal inteiro: os campos abaixo substituem o que está gravado, e campo em branco apaga o valor gravado.',
    /** o texto de uma linha para o `title` do botão Salvar dados fiscais */
    tituloBotao: 'Grava os campos fiscais desta pessoa, substituindo o que estava gravado.'
} as const;

export const permissaoNecessariaFiscalLabel = (permissao: string): string => `Permissão necessária: ${permissao}.`;

export const PESSOA_FISCAL_PERMISSAO = {
    /** sem PESSOAS_DADOS_FISCAIS_GERENCIAR: a aba aparece SOMENTE LEITURA, com os valores gravados */
    semGerenciar: permissaoNecessariaFiscalLabel('PESSOAS_DADOS_FISCAIS_GERENCIAR'),
    somenteLeitura: 'Você só pode consultar os dados fiscais. Para alterá-los é necessária a permissão PESSOAS_DADOS_FISCAIS_GERENCIAR.',
    /** title do botão Salvar dados fiscais quando falta a permissão */
    acaoSemGerenciar: 'Permissão necessária: PESSOAS_DADOS_FISCAIS_GERENCIAR.'
} as const;

/** Pessoa inativa: o backend recusa o PATCH com 400 (`Pessoa.cs:109`, PF-12). */
export const PESSOA_FISCAL_INDISPONIVEL = {
    pessoaInativa: 'Pessoa inativa não pode ter os dados fiscais alterados.',
    /** nada alterado desde a última leitura: o botão fica desabilitado com este motivo */
    semAlteracao: 'Nenhuma alteração nos dados fiscais para salvar.'
} as const;

/** Criação da Pessoa (sem id): a aba aparece, sem campos e sem chamada (D104: "só funciona na edição"). */
export const PESSOA_FISCAL_CRIACAO = {
    texto: 'Salve a pessoa para preencher os dados fiscais.',
    descricao: 'Os dados fiscais são gravados na pessoa já cadastrada. Salve a pessoa, abra a edição e volte a esta aba.'
} as const;

// ---------------------------------------------------------------------------------------------
// Campos -- rótulos, dicas e limites (os 8 campos do PATCH `/dados-fiscais`)
// ---------------------------------------------------------------------------------------------

/** Limites de `PessoaValidators.cs:51-55` e `DadosFiscaisPessoa.cs:118-153` (inventário §3.2). */
export const PESSOA_FISCAL_LIMITES = {
    /** `MaximumLength(20)` (PessoaValidators.cs:51); servidor aplica Trim + maiúsculas (DadosFiscaisPessoa.cs:118-135) */
    inscricaoEstadualSt: 20,
    /** `MaximumLength(9)` (:52); só dígitos, ao menos 1 (DadosFiscaisPessoa.cs:137-153) */
    suframa: 9,
    /** `MaximumLength(7)` (:54); o servidor trata ≠ 7 dígitos como "não encontrado" (PF-5) */
    municipioIbgeCodigo: 7,
    /** `MaximumLength(4)` (:55); o servidor completa com zeros à esquerda (PadLeft 4) */
    paisCodigoBacen: 4
} as const;

export const PESSOA_FISCAL_CAMPOS = {
    indicadorContribuinteIcms: 'Indicador de contribuinte do ICMS',
    indicadorContribuinteIcmsPlaceholder: 'Não informado',
    indicadorContribuinteIcmsHint: 'É a classificação da pessoa perante o ICMS. Obrigatório se qualquer outro campo desta aba for preenchido.',
    /** linha somente leitura derivada pelo servidor; some quando o indicador está vazio */
    indicadorIeDestinatario: 'Indicador da IE na NF-e',
    indicadorIeDestinatarioHint: 'Calculado pelo sistema a partir do indicador acima. Não é editável.',
    inscricaoEstadualSt: 'Inscrição estadual de ST',
    inscricaoEstadualStHint: 'Opcional, até 20 caracteres. O sistema grava em maiúsculas.',
    suframa: 'Inscrição SUFRAMA',
    suframaHint: 'Opcional, só dígitos, até 9.',
    regimeTributarioParceiro: 'Regime tributário do parceiro',
    regimeTributarioParceiroPlaceholder: 'Não informado',
    regimeTributarioParceiroHint: 'Regime tributário da própria pessoa, não o da sua empresa.',
    contribuinteIpi: 'Contribuinte do IPI',
    contribuinteIpiHint: 'A nota só pede esta informação quando a sua empresa é contribuinte do IPI.',
    tomadorOrgaoPublico: 'Tomador é órgão público',
    tomadorOrgaoPublicoHint: 'A nota só pede esta informação para pessoa jurídica com item de serviço.',
    municipioIbgeCodigo: 'Município do cadastro fiscal',
    paisCodigoBacen: 'País (código BACEN)'
} as const;

/**
 * IMPORTANTE (needs_decision, ver relatório): `PessoaResponse` devolve `municipioIbgeId` e `paisId` como Guid, e o
 * PATCH recebe os CÓDIGOS (7 dígitos IBGE e até 4 BACEN). Não existe filtro por Id nas duas buscas
 * (`CadastrosFiscaisController.cs:49-76`), então a tela não consegue "carregar do registro" o código desses dois
 * campos. Os textos abaixo cobrem as duas saídas possíveis; o orquestrador trava qual vale.
 */
export const PESSOA_FISCAL_MUNICIPIO_PAIS = {
    /** Message info acima dos dois campos (leitura do estado gravado, sem prometer o nome) */
    gravado: 'Município e país do bloco fiscal já estão gravados nesta pessoa.',
    naoGravado: 'Município e país do bloco fiscal não estão preenchidos nesta pessoa.',
    /** aviso destrutivo se a decisão for "a tela não edita município/país e o PATCH os envia vazios" */
    salvarLimpa: 'Salvar dados fiscais apaga o município e o país já gravados no bloco fiscal desta pessoa: a tela ainda não os edita.',
    /** o município do bloco fiscal NÃO é o que a nota usa: quem vale é o do endereço principal (inventário §4) */
    naoValeNaNota: 'Este município não é o usado na nota fiscal. A nota usa o município vinculado ao endereço principal, na aba "Endereços".'
} as const;

/**
 * Textos que o design não escreveu e a b75 precisa (nó `builder`, emenda da D104). A opção "bloqueado" para município
 * e país não existia: `PESSOA_FISCAL_MUNICIPIO_PAIS.gravado/naoGravado/salvarLimpa` cobrem as duas saídas do design
 * ("salvar com aviso e apagar" foi descartada). Município e país NÃO são editáveis nesta tela: vão nulos só quando o
 * registro também os tem nulos. Com qualquer um preenchido, o salvamento fica bloqueado, com este motivo.
 */
export const PESSOA_FISCAL_MUNICIPIO_PAIS_BLOQUEADO = {
    titulo: 'Salvar dados fiscais está bloqueado',
    texto: 'Esta pessoa tem município ou país gravados no bloco fiscal. Esta tela ainda não consegue reenviá-los, e salvar os apagaria. Nenhum dado foi alterado.',
    /** title do botão Salvar dados fiscais enquanto o bloqueio estiver ativo */
    tituloBotao: 'Bloqueado: salvar apagaria o município ou o país já gravados no bloco fiscal, que esta tela não consegue reenviar.'
} as const;

/**
 * A resposta da lista deveria trazer as chaves fiscais, nulas incluídas (`PessoaResponse.cs:17-28`). Sem elas, a aba não
 * sabe o que está gravado e enviar os 8 campos apagaria o bloco (PF-1): não grava.
 */
export const PESSOA_FISCAL_REGISTRO_INCOMPLETO = {
    titulo: 'Dados fiscais indisponíveis',
    texto: 'A resposta do servidor não trouxe os dados fiscais desta pessoa. Por segurança a tela não grava: salvar poderia apagar o que está gravado. Recarregue a lista de pessoas e abra a pessoa de novo.',
    tituloBotao: 'Bloqueado: o servidor não informou os dados fiscais atuais desta pessoa.'
} as const;

/** Títulos dos três grupos de campos da aba. */
export const PESSOA_FISCAL_GRUPOS = {
    icms: 'ICMS',
    parceiro: 'Parceiro',
    contextoNota: 'Contexto da nota'
} as const;

/** Mensagens de validação do cliente (mesmos limites e regras do backend). */
export const PESSOA_FISCAL_VALIDACAO = {
    /** valor fora das opções (só chega por dado externo; o Dropdown só oferece as opções válidas) */
    valorInvalido: 'Selecione uma das opções da lista.',
    /** espelha `FISCAL_CADASTROS_INDICADOR_CONTRIBUINTE_ICMS_OBRIGATORIO` (`PessoaDadosFiscaisResolver.cs:36-41`) */
    indicadorObrigatorio: 'Informe o indicador de contribuinte do ICMS: há outros campos fiscais preenchidos. Para limpar o bloco, deixe todos em branco.',
    inscricaoEstadualStTamanho: 'A inscrição estadual de ST aceita no máximo 20 caracteres.',
    suframaTamanho: 'A inscrição SUFRAMA aceita no máximo 9 dígitos.',
    suframaSoDigitos: 'A inscrição SUFRAMA aceita só dígitos.',
    municipioIbgeCodigoInvalido: 'O código do município deve ter 7 dígitos.',
    paisCodigoBacenTamanho: 'O código do país aceita no máximo 4 dígitos.'
} as const;

// ---------------------------------------------------------------------------------------------
// Contribuinte sem IE (PF-2) -- motivo visível, envio bloqueado
// ---------------------------------------------------------------------------------------------

/**
 * "Contribuinte" exige `Pessoa.InscricaoEstadual` não vazia (`Pessoa.cs:111-116`, 400 `PESSOAS_VALIDACAO`). A IE mora
 * na aba "Documentos e observações" e se grava pelo `PUT` (PESSOAS_GERENCIAR), que FECHA o diálogo (PF-4). A tela
 * confere a IE SALVA (a do registro), não a digitada e ainda não salva; a tela não grava as duas coisas em sequência.
 */
export const PESSOA_FISCAL_CONTRIBUINTE_SEM_IE = {
    titulo: 'Contribuinte exige inscrição estadual',
    texto: 'Para gravar o indicador "Contribuinte", a pessoa precisa ter a inscrição estadual preenchida. Grave a IE na aba "Documentos e observações" (botão Salvar do rodapé, permissão PESSOAS_GERENCIAR), abra a pessoa de novo e volte a esta aba.',
    /** IE digitada na outra aba e ainda não salva: o registro continua sem IE */
    ieNaoSalva: 'A inscrição estadual digitada na outra aba ainda não foi salva. Salve a pessoa primeiro.',
    /** title do botão Salvar dados fiscais enquanto o aviso estiver ativo */
    tituloBotao: 'Preencha e salve a inscrição estadual da pessoa antes de gravar "Contribuinte".'
} as const;

// ---------------------------------------------------------------------------------------------
// Erros e toast da aba
// ---------------------------------------------------------------------------------------------

export const PESSOA_FISCAL_ERRO = {
    /** ApiErrorPanel fixo (code, status, traceId preservados) acima do botão */
    tituloSalvar: 'Não foi possível salvar os dados fiscais.',
    /** o backend não é substituído por texto genérico; este só acrescenta a orientação depois de reler a lista */
    registroDesatualizado: 'A lista de pessoas foi recarregada. Confira os valores gravados e tente novamente.'
} as const;

export const PESSOA_FISCAL_TOAST = {
    salvo: 'Dados fiscais salvos.',
    /** o bloco ficou todo em branco e o servidor o limpou ("Bloco fiscal da pessoa limpo.") */
    limpo: 'Dados fiscais limpos.'
} as const;

// ---------------------------------------------------------------------------------------------
// Vincular município (ação na tabela de endereços + diálogo aninhado)
// ---------------------------------------------------------------------------------------------

export const PESSOA_MUNICIPIO_ACAO = {
    /** ícone da ação: `pi pi-map-marker` (primeicons) */
    icone: 'pi pi-map-marker',
    vincular: 'Vincular município',
    /** tooltip quando o endereço já tem vínculo: a ação serve para trocar */
    trocar: 'Trocar município vinculado',
    /** aria-label por linha: `Vincular município do endereço Rua X, 100` */
    vincularAria: (linha: string): string => `Vincular município do endereço ${linha}`,
    trocarAria: (linha: string): string => `Trocar município vinculado do endereço ${linha}`
} as const;

/** Motivos de a ação estar desabilitada (title do botão): sempre com o motivo visível. */
export const PESSOA_MUNICIPIO_INDISPONIVEL = {
    /** S3: tem PESSOAS_DADOS_FISCAIS_GERENCIAR e não tem FISCAL_CADASTROS_CONSULTAR. Sem campo livre (D104). */
    semBusca: 'Permissão necessária: FISCAL_CADASTROS_CONSULTAR. Sem ela não é possível buscar o município, e o código não pode ser digitado.',
    /** UF vazia ou diferente de 2 letras: a busca é filtrada pela UF do endereço */
    semUf: 'Este endereço não tem UF válida. Edite o endereço e informe a UF antes de vincular o município.',
    /** ação oculta (não desabilitada) para quem não tem PESSOAS_DADOS_FISCAIS_GERENCIAR (S1, AC-3) */
    semGerenciarFiscal: 'Permissão necessária: PESSOAS_DADOS_FISCAIS_GERENCIAR.',
    /** mensagem ao lado da tabela quando a ação existe e está desabilitada por falta da busca (visível sem hover) */
    avisoTabelaSemBusca: 'Você pode vincular município, mas falta a permissão FISCAL_CADASTROS_CONSULTAR para buscá-lo na lista oficial.'
} as const;

export const PESSOA_MUNICIPIO_DIALOG = {
    titulo: 'Vincular município',
    /** subtítulo/linha de contexto: qual endereço, com a UF que filtra */
    contexto: (linha: string, cidadeUf: string): string => `Endereço: ${linha}${cidadeUf ? ` (${cidadeUf})` : ''}`,
    confirmLabel: 'Vincular',
    cancelLabel: 'Cancelar',
    /** label do campo de busca (Dropdown filtrável com busca no servidor) */
    campo: (uf: string): string => `Município de ${uf}`,
    placeholder: 'Selecione o município',
    filtroPlaceholder: 'Digite o nome do município',
    /** a busca só traz municípios da UF do endereço (D104): não há como escolher município de outra UF */
    dicaUf: (uf: string): string => `A busca traz só municípios de ${uf}, a UF do endereço. Para outra UF, edite o endereço antes.`,
    /** PF-16: o termo diferencia acento; "Sao Paulo" não acha "São Paulo" */
    dicaAcento: 'A busca diferencia acentos: digite o nome como é escrito, por exemplo "São Paulo" e não "Sao Paulo".',
    /** a lista mostra os primeiros resultados; digitar refina */
    dicaLimite: 'A lista mostra os primeiros resultados. Digite parte do nome para refinar.',
    /** a tela não mostra o nome do vínculo atual (não existe filtro por Id; D104, PF-15/16) */
    jaVinculado: 'Este endereço já tem um município vinculado. Escolher outro substitui o vínculo atual.',
    /** a dica que explica por que vincular: o vínculo é o que a nota exige */
    dicaNota: 'A nota fiscal exige o município vinculado ao endereço principal. O texto da cidade e da UF do endereço não é alterado.',
    carregando: 'Buscando municípios...',
    /** sem seleção: o botão Vincular fica desabilitado com este title */
    semSelecao: 'Selecione um município para vincular.'
} as const;

export const PESSOA_MUNICIPIO_VAZIO = {
    /** busca sem resultado: nunca orienta a digitar ID ou código */
    titulo: (uf: string): string => `Nenhum município de ${uf} encontrado`,
    descricao: (uf: string, termo: string): string =>
        termo ? `Nenhum município de ${uf} corresponde a "${termo}". Confira a grafia e os acentos. Se a cidade está correta, ela pode não estar carregada no cadastro fiscal: avise o responsável pelo cadastro fiscal.` : `O cadastro fiscal não tem municípios de ${uf} carregados. Avise o responsável pelo cadastro fiscal.`,
    /** emptyMessage do Dropdown */
    emptyMessage: 'Nenhum município encontrado.',
    /** sem termo digitado: a lista inicial vem vazia */
    semTermo: 'Digite o nome do município para buscar.'
} as const;

export const PESSOA_MUNICIPIO_ERRO = {
    /** erro da BUSCA (recuperável): ApiErrorPanel + Tentar novamente dentro do diálogo */
    tituloBusca: 'Não foi possível buscar os municípios.',
    tentarNovamente: 'Tentar novamente',
    /**
     * erro do PATCH: ApiErrorPanel com o texto do backend preservado. Município inativo chega como
     * `FISCAL_CADASTROS_MUNICIPIO_INATIVO` (rota de endereço) e inexistente como `FISCAL_CADASTROS_MUNICIPIO_NAO_ENCONTRADO`
     * (PF-5); o texto do backend NÃO é trocado. Endereço removido por outro usuário sai 404 `Recurso.NaoEncontrado`.
     */
    tituloVincular: 'Não foi possível vincular o município.',
    /** acrescentado depois do erro, com a lista relida */
    listaDesatualizada: 'A lista de endereços foi recarregada. Confira se o endereço ainda existe e tente novamente.'
} as const;

export const PESSOA_MUNICIPIO_TOAST = {
    /** com o nome escolhido, que a tela conhece no momento da seleção */
    vinculado: (nome: string, uf: string): string => `Município ${nome}/${uf} vinculado ao endereço.`,
    vinculadoSemNome: 'Município vinculado ao endereço.'
} as const;

/**
 * Textos da b73 que a b75 torna falsos (PF-17). `pessoaEnderecosLabels.ts` os usa (fonte única, o design não escreve
 * naquele arquivo):
 *  - `PESSOA_ENDERECO_MUNICIPIO_FISCAL.dicaNaoVinculado`: "...que não é feito por esta tela." deixou de valer.
 *    `dicaNaoVinculadoSemPermissao` vale para quem não tem PESSOAS_DADOS_FISCAIS_GERENCIAR e não vê a ação.
 *  - `PESSOA_ENDERECO_CAMPOS.municipioFiscalHint`: "não é alterado por este cadastro" deixou de valer como está;
 *    segue valendo para o formulário do endereço (o vínculo é uma ação à parte).
 */
export const PESSOA_MUNICIPIO_TEXTOS_SUBSTITUTOS_B73 = {
    dicaNaoVinculado: 'Este endereço ainda não tem município fiscal vinculado. A nota fiscal exige o vínculo: use a ação "Vincular município" na linha do endereço.',
    dicaNaoVinculadoSemPermissao: 'Este endereço ainda não tem município fiscal vinculado. A nota fiscal exige o vínculo; peça a quem tem a permissão PESSOAS_DADOS_FISCAIS_GERENCIAR para vinculá-lo.',
    municipioFiscalHint: 'Salvar o endereço não altera o vínculo do município fiscal. O vínculo é feito pela ação "Vincular município" na lista de endereços.'
} as const;

// ---------------------------------------------------------------------------------------------
// Links dos 4 `Fiscal.DestinatarioSem*` (D50, D104) -- destino: lista /pessoas, sem id
// ---------------------------------------------------------------------------------------------

export const FISCAL_ERRO_DESTINATARIO_SEM_ENDERECO_FISCAL_CODE = 'Fiscal.DestinatarioSemEnderecoFiscal';
export const FISCAL_ERRO_DESTINATARIO_SEM_ENDERECO_PRINCIPAL_CODE = 'Fiscal.DestinatarioSemEnderecoPrincipal';
export const FISCAL_ERRO_DESTINATARIO_SEM_MUNICIPIO_IBGE_CODE = 'Fiscal.DestinatarioSemMunicipioIbge';
export const FISCAL_ERRO_DESTINATARIO_SEM_INDICADOR_ICMS_CODE = 'Fiscal.DestinatarioSemIndicadorContribuinteIcms';

/** Os 4 códigos da D104 ("as quatro" da D53). `SemPessoaVinculada` não é alcançável e fica de fora. */
export const PESSOA_DESTINATARIO_ERRO_CODES = [
    FISCAL_ERRO_DESTINATARIO_SEM_ENDERECO_FISCAL_CODE,
    FISCAL_ERRO_DESTINATARIO_SEM_ENDERECO_PRINCIPAL_CODE,
    FISCAL_ERRO_DESTINATARIO_SEM_MUNICIPIO_IBGE_CODE,
    FISCAL_ERRO_DESTINATARIO_SEM_INDICADOR_ICMS_CODE
] as const;

/**
 * Texto do painel de erro por código. O link leva à LISTA (`/pessoas`): a Pessoa não abre por id (B-38) e o id só
 * viria do texto da mensagem, o que a D50 proíbe. O operador localiza o cliente pelo nome ou documento. O texto
 * nunca manda digitar ID.
 */
export const PESSOA_DESTINATARIO_LINK = {
    rotuloLink: 'Abrir lista de Pessoas',
    /** `anyOf` do link: só PESSOAS_GERENCIAR abre o diálogo de edição (D104) */
    permissaoLink: 'PESSOAS_GERENCIAR',
    /** comum aos 4: como chegar à pessoa */
    comoChegar: 'Na lista de Pessoas, localize o cliente da nota pelo nome ou documento e abra a edição.',
    porCodigo: {
        [FISCAL_ERRO_DESTINATARIO_SEM_ENDERECO_FISCAL_CODE]: {
            titulo: 'O cliente da nota não tem endereço cadastrado',
            orientacao: 'Abra a pessoa do cliente na lista de Pessoas e, na aba "Endereços", cadastre o endereço.'
        },
        [FISCAL_ERRO_DESTINATARIO_SEM_ENDERECO_PRINCIPAL_CODE]: {
            titulo: 'O cliente da nota não tem endereço principal',
            orientacao: 'Abra a pessoa do cliente na lista de Pessoas e, na aba "Endereços", marque um endereço como principal.'
        },
        [FISCAL_ERRO_DESTINATARIO_SEM_MUNICIPIO_IBGE_CODE]: {
            titulo: 'O endereço principal do cliente não tem município vinculado',
            orientacao: 'Abra a pessoa do cliente na lista de Pessoas e, na aba "Endereços", use "Vincular município" no endereço principal.'
        },
        [FISCAL_ERRO_DESTINATARIO_SEM_INDICADOR_ICMS_CODE]: {
            titulo: 'O cliente da nota não tem indicador de contribuinte do ICMS',
            orientacao: 'Abra a pessoa do cliente na lista de Pessoas e, na aba "Dados fiscais", informe o indicador de contribuinte do ICMS.'
        }
    },
    /** sem PESSOAS_GERENCIAR: texto no lugar do link, com o motivo; nunca orienta a digitar ID */
    semPermissaoTexto: 'Para corrigir este cadastro é necessária a permissão PESSOAS_GERENCIAR (editar a pessoa). Peça a quem a tem para completar o cadastro do cliente e tente de novo.'
} as const;
