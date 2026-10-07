// Rótulos da fatia Endereços da Pessoa (v1.11.0a8b73). Fonte: D47 item 2, D49 item 2, D52, D53, D102 e o
// inventário `docs/arquitetura/debate/15-inventario-endereco-pessoa.md` (EP-1 a EP-19). O design escreve só os
// rótulos; a aba, o diálogo, os hooks, os schemas e a lógica são do `dev-senior-react`. Padrão visual: aba do
// `TabView` do `PessoaFormDialog` + diálogo aninhado, sem componente compartilhado novo.
//
// O backend serializa enum como NÚMERO (sem `JsonStringEnumConverter`, `Program.cs:28`). O enum abaixo é
// indexado pelo valor numérico do C# e traz, no comentário, a linha de onde o valor veio
// (`../New project 3/src`, lido em 2026-10-01).

import { PESSOA_MUNICIPIO_TEXTOS_SUBSTITUTOS_B73 } from '@/features/pessoas/components/pessoaFiscalLabels';
import { UFS_BRASIL } from '@/lib/constants/ufs';

// ---------------------------------------------------------------------------------------------
// Enum TipoEndereco (valor numérico do C#)
// ---------------------------------------------------------------------------------------------

/** `TipoEndereco`, `Erp.Domain/Pessoas/TipoEndereco.cs:3-10` (6 valores). O JSON é numérico (EP-10). */
export const TIPO_ENDERECO_OPTIONS: { label: string; value: number }[] = [
    { label: 'Comercial', value: 1 }, // Comercial = 1 (:5)
    { label: 'Residencial', value: 2 }, // Residencial = 2 (:6)
    { label: 'Entrega', value: 3 }, // Entrega = 3 (:7)
    { label: 'Cobrança', value: 4 }, // Cobranca = 4 (:8)
    { label: 'Fiscal', value: 5 }, // Fiscal = 5 (:9)
    { label: 'Outro', value: 99 } // Outro = 99 (:10)
];

/** Valor padrão do Dropdown de tipo ao cadastrar: Comercial = 1. */
export const TIPO_ENDERECO_PADRAO = 1;

export const tipoEnderecoLabel = (value?: number | null): string => {
    if (value === null || value === undefined) return '-';
    return TIPO_ENDERECO_OPTIONS.find((option) => option.value === value)?.label ?? `Valor ${value}`;
};

/** O tipo Fiscal NÃO define o endereço da nota (EP-4, B-35): o resolver usa o principal de qualquer tipo. */
export const TIPO_ENDERECO_FISCAL_VALOR = 5;
export const TIPO_ENDERECO_DICA = 'O tipo é só uma classificação. O endereço usado na nota fiscal é o principal, qualquer que seja o tipo: marcar "Fiscal" não faz este endereço valer na nota.';

// ---------------------------------------------------------------------------------------------
// UF (D52: combo estático com as 27 siglas)
// ---------------------------------------------------------------------------------------------

/**
 * As 27 UFs já existem em `UFS_BRASIL` (`lib/constants/ufs.ts`): reuso, não cópia. Não usa o catálogo do servidor, que exigiria `FISCAL_CADASTROS_CONSULTAR`, fora do perfil de Pessoas
 * (EP-14). O backend só confere 2 letras (EP-9); a conferência contra as 27 é do schema do cliente.
 */
export const UF_ENDERECO_OPTIONS: { label: string; value: string }[] = UFS_BRASIL.map((uf) => ({ label: uf, value: uf }));

// ---------------------------------------------------------------------------------------------
// Aba e permissão
// ---------------------------------------------------------------------------------------------

export const PESSOA_ENDERECOS_ABA = {
    /** header do TabPanel */
    titulo: 'Endereços',
    descricao: 'Endereços da pessoa. O endereço principal é o endereço usado na nota fiscal.',
    novoEndereco: 'Novo endereço',
    /** aria-label do DataTable */
    tabelaAria: 'Endereços da pessoa'
} as const;

export const permissaoNecessariaEnderecoLabel = (permissao: string): string => `Permissão necessária: ${permissao}.`;

export const PESSOA_ENDERECOS_PERMISSAO = {
    /** title do Novo endereço, Editar, Marcar principal e Excluir quando falta PESSOAS_GERENCIAR (S1): motivo visível */
    acaoSemGerenciar: permissaoNecessariaEnderecoLabel('PESSOAS_GERENCIAR'),
    /** texto fixo sob o cabeçalho da aba para S1 (consulta): a lista aparece, as ações não */
    somenteLeitura: 'Você só pode consultar os endereços. Para cadastrar, editar ou excluir é necessária a permissão PESSOAS_GERENCIAR.',
    /** sem PESSOAS_CONSULTAR a lista não carrega (a página já nega, mas o diálogo não confere) */
    semConsultar: 'Para ver os endereços é necessária a permissão PESSOAS_CONSULTAR.'
} as const;

/** Ação indisponível por estado da pessoa/endereço, com motivo. Pessoa inativa: o backend recusa escrita (§4.5). */
export const PESSOA_ENDERECOS_INDISPONIVEL = {
    pessoaInativa: 'Pessoa inativa não pode ter endereços alterados.',
    /** "Marcar principal" no endereço que já é o principal */
    jaPrincipal: 'Este já é o endereço principal. Para trocar, marque outro endereço como principal.'
} as const;

// ---------------------------------------------------------------------------------------------
// Tabela
// ---------------------------------------------------------------------------------------------

export const PESSOA_ENDERECOS_COLUNAS = {
    principal: 'Principal',
    tipo: 'Tipo',
    endereco: 'Endereço',
    bairro: 'Bairro',
    cidadeUf: 'Cidade/UF',
    cep: 'CEP',
    municipioFiscal: 'Município fiscal',
    acoes: 'Ações'
} as const;

/** Marca da linha principal (Tag success) e texto da dica/tooltip. */
export const PESSOA_ENDERECO_PRINCIPAL = {
    marca: 'Principal',
    /** title/tooltip da marca e legenda da aba: o que o principal significa */
    texto: 'Endereço usado na nota fiscal',
    /** linha comum: nada na coluna além do botão de ação */
    naoPrincipal: '-',
    /** o que o operador vê quando é o primeiro endereço: o backend o marca principal mesmo sem pedir (Pessoa.cs:141) */
    primeiroEhPrincipal: 'O primeiro endereço cadastrado vira o principal automaticamente.',
    /** dica no diálogo ao desmarcar o único principal: o backend desfaz (EP-5); a tela não oferece o desmarcar */
    unicoPrincipalDica: 'Este é o endereço principal. Para trocar, marque outro endereço como principal.'
} as const;

/** Município fiscal: sem prometer versão (D102). `municipioIbgeId` nulo = não vinculado. */
export const PESSOA_ENDERECO_MUNICIPIO_FISCAL = {
    vinculado: 'Vinculado',
    naoVinculado: 'Não vinculado',
    /** tooltip da Tag */
    dicaVinculado: 'Município fiscal vinculado a este endereço.',
    // b75 (PF-17): o vínculo agora é feito pela ação "Vincular município"; os textos vêm de `pessoaFiscalLabels.ts`.
    dicaNaoVinculado: PESSOA_MUNICIPIO_TEXTOS_SUBSTITUTOS_B73.dicaNaoVinculado,
    /** sem PESSOAS_DADOS_FISCAIS_GERENCIAR a ação não aparece: o texto manda pedir a quem tem a permissão */
    dicaNaoVinculadoSemPermissao: PESSOA_MUNICIPIO_TEXTOS_SUBSTITUTOS_B73.dicaNaoVinculadoSemPermissao
} as const;

export const municipioFiscalLabel = (municipioIbgeId?: string | null): string => (municipioIbgeId ? PESSOA_ENDERECO_MUNICIPIO_FISCAL.vinculado : PESSOA_ENDERECO_MUNICIPIO_FISCAL.naoVinculado);

/** `Logradouro, número - complemento`. Número é texto ("S/N" vale). */
export const enderecoLinhaLabel = (endereco: { logradouro?: string | null; numero?: string | null; complemento?: string | null }): string => {
    const base = [endereco.logradouro, endereco.numero].filter((parte) => Boolean(parte && parte.trim())).join(', ');
    const complemento = endereco.complemento?.trim();
    return complemento ? `${base} - ${complemento}` : base;
};

/** A resposta devolve o CEP só com 8 dígitos (EnderecoPessoa.cs:177-187): a tela formata `00000-000`. */
export const formatarCepEndereco = (cep?: string | null): string => {
    const digitos = (cep ?? '').replace(/\D/g, '');
    return digitos.length === 8 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : (cep ?? '-') || '-';
};

export const cidadeUfLabel = (endereco: { cidade?: string | null; uf?: string | null }): string => [endereco.cidade, endereco.uf].filter((parte) => Boolean(parte && parte.trim())).join('/');

// ---------------------------------------------------------------------------------------------
// Ações por linha (botões só-ícone: aria-label + tooltip)
// ---------------------------------------------------------------------------------------------

export const PESSOA_ENDERECO_ACOES = {
    editar: 'Editar endereço',
    marcarPrincipal: 'Marcar como principal',
    excluir: 'Excluir endereço',
    /** aria-label por linha: `Editar endereço Rua X, 100` */
    editarAria: (linha: string): string => `Editar endereço ${linha}`,
    marcarPrincipalAria: (linha: string): string => `Marcar como principal o endereço ${linha}`,
    excluirAria: (linha: string): string => `Excluir endereço ${linha}`
} as const;

// ---------------------------------------------------------------------------------------------
// Estados da aba
// ---------------------------------------------------------------------------------------------

export const PESSOA_ENDERECOS_VAZIO = {
    /** edição, 0 endereços ativos: diz o próximo passo */
    titulo: 'Nenhum endereço cadastrado',
    descricao: 'Cadastre o primeiro endereço desta pessoa. Ele será o principal, o endereço usado na nota fiscal.',
    /** sem PESSOAS_GERENCIAR: sem botão, com o motivo */
    descricaoSemGerenciar: 'Esta pessoa ainda não tem endereço. Peça a alguém com a permissão PESSOAS_GERENCIAR para cadastrar o primeiro.',
    /** body do emptyMessage do DataTable */
    emptyMessage: 'Nenhum endereço cadastrado.'
} as const;

/** Criação da Pessoa (sem id): a aba aparece, sem GET e sem botão (D102, PF-3). */
export const PESSOA_ENDERECOS_CRIACAO = {
    texto: 'Salve a pessoa para cadastrar endereços.',
    descricao: 'Os endereços dependem de a pessoa já estar gravada. Salve a pessoa e abra a edição para cadastrá-los.'
} as const;

export const PESSOA_ENDERECOS_ERRO = {
    /** erro recuperável da lista: ApiErrorPanel fixo (code, status, traceId preservados) + botão de nova tentativa */
    tituloListagem: 'Não foi possível carregar os endereços da pessoa.',
    tentarNovamente: 'Tentar novamente',
    /** título do ApiErrorPanel de mutação dentro do diálogo de endereço (o texto do backend segue visível) */
    tituloSalvar: 'Não foi possível salvar o endereço.',
    tituloPrincipal: 'Não foi possível marcar o endereço como principal.',
    tituloExcluir: 'Não foi possível excluir o endereço.',
    /**
     * Endereço inexistente ou já excluído sai 400 PESSOAS_VALIDACAO, não 404 (EP-8): a tela não troca o texto do
     * backend, só acrescenta a orientação depois de reler a lista.
     */
    listaDesatualizada: 'A lista foi recarregada. Confira se o endereço ainda existe e tente novamente.'
} as const;

export const PESSOA_ENDERECOS_TOAST = {
    criado: 'Endereço cadastrado.',
    atualizado: 'Endereço atualizado.',
    principalDefinido: 'Endereço marcado como principal. Ele passa a ser o usado na nota fiscal.',
    excluido: 'Endereço excluído.',
    excluidoPromovido: 'Endereço principal excluído. O sistema escolheu outro endereço como principal: confira a lista.'
} as const;

// ---------------------------------------------------------------------------------------------
// Diálogo de endereço (criar e editar) -- limites do C#
// ---------------------------------------------------------------------------------------------

export const PESSOA_ENDERECO_CRIAR_DIALOG = {
    titulo: 'Novo endereço',
    confirmLabel: 'Cadastrar'
} as const;

export const PESSOA_ENDERECO_EDITAR_DIALOG = {
    titulo: 'Editar endereço',
    confirmLabel: 'Salvar'
} as const;

/** Limites de `EnderecoContatoValidators.cs:5-33` e `EnderecoPessoa.cs:11-26,129-186` (inventário §3.2). */
export const PESSOA_ENDERECO_LIMITES = {
    logradouro: 200,
    numero: 30,
    complemento: 120,
    bairro: 120,
    /** texto livre (PF-1): é o campo do backend; a busca de município é da b75 */
    cidade: 120,
    uf: 2,
    /** o backend exige 8 dígitos depois de remover a máscara; o campo aceita `00000-000` (9 caracteres) */
    cepDigitos: 8,
    cepCampo: 9
} as const;

export const PESSOA_ENDERECO_CAMPOS = {
    tipo: 'Tipo',
    logradouro: 'Logradouro',
    numero: 'Número',
    numeroHint: 'Texto livre. "S/N" vale.',
    complemento: 'Complemento (opcional)',
    bairro: 'Bairro',
    cidade: 'Cidade',
    cidadeHint: 'Texto livre, até 120 caracteres.',
    uf: 'UF',
    ufPlaceholder: 'Selecione a UF',
    cep: 'CEP',
    cepHint: 'Informe os 8 dígitos. A máscara é opcional.',
    principal: 'Endereço principal',
    principalHint: 'O principal é o endereço usado na nota fiscal. Só existe um por pessoa: marcar este rebaixa o anterior.',
    /** campo somente leitura na edição: quem lê é a Tag da tabela e esta linha do diálogo */
    municipioFiscal: 'Município fiscal',
    municipioFiscalHint: PESSOA_MUNICIPIO_TEXTOS_SUBSTITUTOS_B73.municipioFiscalHint
} as const;

/** Mensagens de validação do cliente (mesmos limites do backend). */
export const PESSOA_ENDERECO_VALIDACAO = {
    tipoInvalido: 'Escolha o tipo do endereço.',
    logradouroObrigatorio: 'Informe o logradouro.',
    logradouroTamanho: 'O logradouro aceita no máximo 200 caracteres.',
    numeroObrigatorio: 'Informe o número (use S/N se não houver).',
    numeroTamanho: 'O número aceita no máximo 30 caracteres.',
    complementoTamanho: 'O complemento aceita no máximo 120 caracteres.',
    bairroObrigatorio: 'Informe o bairro.',
    bairroTamanho: 'O bairro aceita no máximo 120 caracteres.',
    cidadeObrigatoria: 'Informe a cidade.',
    cidadeTamanho: 'A cidade aceita no máximo 120 caracteres.',
    ufObrigatoria: 'Selecione a UF.',
    ufInvalida: 'Selecione uma das 27 UFs.',
    cepObrigatorio: 'Informe o CEP.',
    cepInvalido: 'O CEP deve ter 8 dígitos.'
} as const;

// ---------------------------------------------------------------------------------------------
// Avisos da D102 (município vinculado x edição) -- Message warn no diálogo, antes de salvar
// ---------------------------------------------------------------------------------------------

export const PESSOA_ENDERECO_AVISOS = {
    /** UF trocada e `municipioIbgeId` presente: o backend zera o vínculo (EnderecoPessoa.cs:60-71) */
    ufTrocadaComVinculo: 'Ao trocar a UF, o vínculo do município fiscal deste endereço será removido. Será preciso vincular o município de novo.',
    /** cidade trocada, mesma UF e vínculo presente: o backend NÃO zera (EP-2, B-37) */
    cidadeTrocadaMesmaUfComVinculo: 'A cidade foi alterada, mas o município fiscal vinculado continua o antigo: o sistema não atualiza o vínculo ao mudar só a cidade. Confira o vínculo antes de usar este endereço na nota.',
    /** sem vínculo: nenhum aviso (AC-6) */
    nenhum: ''
} as const;

// ---------------------------------------------------------------------------------------------
// Excluir -- ConfirmDialog (definitivo; o DELETE não tem corpo, então não há campo de motivo)
// ---------------------------------------------------------------------------------------------

export const PESSOA_ENDERECO_EXCLUIR_DIALOG = {
    /** `Excluir endereço Rua X, 100 (definitivo)` */
    titulo: (linha: string): string => `Excluir endereço ${linha} (definitivo)`,
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
    /** não há rota para reativar (EP-7, PB-8) */
    avisoDefinitivo: 'A exclusão é definitiva por esta tela: o endereço não poderá ser recuperado nem reativado.',
    /** efeito em notas novas: o resolver lê o principal ativo na hora de gerar (DestinatarioFiscalResolver) */
    avisoEfeito: 'Novas notas deixam de usar este endereço.',
    /** excluir o principal: o backend escolhe outro, sem ordem definida (EP-6, B-36) */
    avisoPrincipal: 'Este é o endereço principal. Ao excluir, o sistema escolhe outro endereço da pessoa como principal, sem ordem definida: confira na lista qual passou a valer na nota fiscal.',
    /** excluir o único endereço: a pessoa fica sem principal (Pessoa.cs: último excluído) */
    avisoUltimo: 'Este é o único endereço da pessoa. Sem endereço, o faturamento para esta pessoa fica recusado.'
} as const;
