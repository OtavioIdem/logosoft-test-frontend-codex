import { ApiError } from '@/types/erp';

/**
 * Catálogo dos 422 do motor de tributação.
 *
 * **Trate pelo `codigo`, nunca pelo texto** — a mensagem do backend é para humano e pode mudar; o código é
 * estável e é a única coisa que o contrato garante. E **nenhum destes devolve cálculo parcial**: quando o
 * motor não consegue calcular, não existe "o total dos itens que deram certo" — mostrar uma soma incompleta
 * é o defeito que só aparece na fiscalização.
 */
export type TributacaoErrorKind =
    /** Cadastro fiscal faltando ou inconsistente — quem resolve é o usuário, na tela de regras. */
    | 'cadastro'
    /** Carga de tabela pendente no backend. **Não é erro do usuário** e não adianta ele mexer no formulário. */
    | 'carga'
    /** Preenchimento do próprio documento simulado. */
    | 'preenchimento'
    /** Escopo organizacional: a empresa/filial do corpo não pertence ao usuário autenticado (400 do contrato). */
    | 'contexto';

export type TributacaoErrorInfo = {
    codigo: string;
    kind: TributacaoErrorKind;
    titulo: string;
    /** O que a tela diz. A mensagem do backend continua visível como detalhe técnico. */
    mensagem: string;
    /** O que o usuário faz a seguir. Vazio quando não há ação possível do lado dele. */
    acao?: string;
};

export const TRIBUTACAO_ERROR_CATALOG: Record<string, TributacaoErrorInfo> = {
    FISCAL_TRIBUTACAO_OPERACAO_SEM_REGRA_FISCAL: {
        codigo: 'FISCAL_TRIBUTACAO_OPERACAO_SEM_REGRA_FISCAL',
        kind: 'cadastro',
        titulo: 'Sem regra fiscal para esta operação',
        mensagem: 'Não há regra fiscal cadastrada para esta combinação de operação.',
        acao: 'Cadastre uma regra fiscal que cubra esta operação.'
    },
    FISCAL_TRIBUTACAO_REGRA_FORA_DE_VIGENCIA: {
        codigo: 'FISCAL_TRIBUTACAO_REGRA_FORA_DE_VIGENCIA',
        kind: 'cadastro',
        titulo: 'Regra fora de vigência',
        mensagem: 'A regra encontrada não está vigente na data da operação.',
        acao: 'Confira a data da operação ou a vigência da regra.'
    },
    FISCAL_TRIBUTACAO_REGRA_AMBIGUA: {
        codigo: 'FISCAL_TRIBUTACAO_REGRA_AMBIGUA',
        kind: 'cadastro',
        titulo: 'Regras conflitantes',
        mensagem: 'Há mais de uma regra igualmente específica para esta operação.',
        acao: 'Ajuste a prioridade ou a especificidade das regras citadas na mensagem do backend.'
    },
    FISCAL_TRIBUTACAO_REGRA_INCOMPLETA: {
        codigo: 'FISCAL_TRIBUTACAO_REGRA_INCOMPLETA',
        kind: 'cadastro',
        titulo: 'Regra não parametriza este tributo',
        mensagem: 'A regra aplicável existe, mas não parametriza o tributo necessário para esta operação.',
        acao: 'Edite a regra e preencha o bloco do tributo que falta.'
    },
    FISCAL_TRIBUTACAO_FCP_NAO_DEFINIDO_PARA_UF: {
        codigo: 'FISCAL_TRIBUTACAO_FCP_NAO_DEFINIDO_PARA_UF',
        kind: 'carga',
        titulo: 'Tabela de FCP não carregada',
        mensagem: 'Não há percentual de FCP carregado para esta UF na data da operação.'
    },
    FISCAL_TRIBUTACAO_ALIQUOTA_INTERESTADUAL_NAO_ENCONTRADA: {
        codigo: 'FISCAL_TRIBUTACAO_ALIQUOTA_INTERESTADUAL_NAO_ENCONTRADA',
        kind: 'carga',
        titulo: 'Alíquota interestadual não cadastrada',
        mensagem: 'Não há alíquota interestadual cadastrada para este trajeto de UFs.'
    },
    FISCAL_TRIBUTACAO_TETO_INSS_NAO_DEFINIDO: {
        codigo: 'FISCAL_TRIBUTACAO_TETO_INSS_NAO_DEFINIDO',
        kind: 'carga',
        titulo: 'Teto do INSS não carregado',
        mensagem: 'Não há teto do INSS carregado para a competência da operação.'
    },
    FISCAL_TRIBUTACAO_ITEM_INVALIDO: {
        codigo: 'FISCAL_TRIBUTACAO_ITEM_INVALIDO',
        kind: 'preenchimento',
        titulo: 'Item inconsistente',
        mensagem: 'Um dos itens está inconsistente (quantidade zero ou desconto maior que a base).',
        acao: 'Revise a grade de itens antes de simular novamente.'
    }
};

/**
 * O 400 do contrato é escopo organizacional: empresa/filial fora do contexto do usuário autenticado. Não tem
 * `codigo` — o catálogo cobre só os 422 —, então o identificador abaixo é do frontend, como o da validação
 * local, e nunca deve ser confundido com código estável do backend.
 */
export const TRIBUTACAO_CONTEXTO_ORGANIZACIONAL: TributacaoErrorInfo = {
    codigo: 'Tributacao.ContextoOrganizacional',
    kind: 'contexto',
    titulo: 'Empresa ou filial fora do seu contexto',
    mensagem: 'A empresa ou filial informada não pertence ao usuário autenticado.',
    acao: 'Selecione uma empresa e uma filial vinculadas ao seu acesso.'
};

const temErroDeCampo = (error: ApiError) => Boolean(error.validationErrors?.length) || Boolean(error.fieldErrors && Object.keys(error.fieldErrors).length);

export const describeTributacaoError = (error?: ApiError | null): TributacaoErrorInfo | null => {
    if (!error) return null;

    const codigo = error.code?.trim();
    if (codigo) return TRIBUTACAO_ERROR_CATALOG[codigo] ?? null;

    /*
     * 400 sem código é o contexto organizacional. O ASP.NET também responde 400 para ModelState inválido, e
     * esse traz erros por campo — nesse caso o painel de erro já aponta o campo e rotular como escopo
     * mandaria o usuário trocar de empresa por um problema que não é de empresa.
     */
    if (error.status === 400 && !temErroDeCampo(error)) return TRIBUTACAO_CONTEXTO_ORGANIZACIONAL;

    return null;
};

/**
 * Três dos códigos são **carga de tabela pendente no backend**, não erro de quem está usando a tela. Merecem
 * tratamento visual de mensagem de sistema, e não de validação de formulário.
 */
export const isCargaPendente = (error?: ApiError | null) => describeTributacaoError(error)?.kind === 'carga';

export const tributacaoErrorSeverity = (error?: ApiError | null): 'error' | 'warn' | 'info' => {
    const info = describeTributacaoError(error);
    if (!info) return 'error';
    if (info.kind === 'carga') return 'info';
    if (info.kind === 'cadastro' || info.kind === 'contexto') return 'warn';
    return 'error';
};
