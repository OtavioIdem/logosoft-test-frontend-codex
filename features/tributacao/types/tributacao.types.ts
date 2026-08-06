import { Guid, IsoDate, PagedResult } from '@/types/erp';

/**
 * Espelho TypeScript do contrato do Motor de Tributação (backend Módulo 05, v1.14.0).
 *
 * **Fonte de verdade:** `docs/fiscal/contrato-motor-tributacao-frontend.md` no repositório do backend,
 * copiado aqui em `docs/fiscal/contrato-motor-tributacao-frontend.md` para rastreabilidade. Os blocos de
 * resultado (`ResultadoIcms`, `ResultadoIpi`, …) são tipos de domínio do backend expostos diretamente no
 * response: **mudança neles é breaking change de API**, e o backend versiona. Não altere estes tipos sem
 * conferir o contrato — divergência silenciosa aqui vira erro de cálculo exibido na tela.
 *
 * **Enums chegam como número**, não string (não há `JsonStringEnumConverter` no backend). Os valores abaixo
 * são explícitos justamente para não depender da ordem de declaração.
 */

export enum TipoCfop {
    Entrada = 1,
    Saida = 2
}

/** Sem valores explícitos no backend — serializa 0/1/2 pela ordem de declaração de `RegimeTributario`. */
export enum RegimeTributario {
    SimplesNacional = 0,
    LucroPresumido = 1,
    LucroReal = 2
}

export enum Crt {
    SimplesNacional = 1,
    SimplesNacionalExcessoSublimite = 2,
    RegimeNormal = 3
}

export enum IndicadorContribuinteIcms {
    Contribuinte = 1,
    Isento = 2,
    NaoContribuinte = 3
}

/** Registro 0200 da EFD — decide, sozinho, o ramo mercadoria × serviço do motor. */
export enum TipoItemSped {
    MercadoriaParaRevenda = 0,
    MateriaPrima = 1,
    Embalagem = 2,
    ProdutoEmProcesso = 3,
    ProdutoAcabado = 4,
    Subproduto = 5,
    ProdutoIntermediario = 6,
    MaterialDeUsoEConsumo = 7,
    AtivoImobilizado = 8,
    Servicos = 9,
    OutrosInsumos = 10,
    Outras = 99
}

export enum FinalidadeNaturezaOperacao {
    Normal = 1,
    Complementar = 2,
    Ajuste = 3,
    Devolucao = 4
}

export enum NaturezaTomadorServico {
    NaoAplicavel = 0,
    PessoaFisica = 1,
    PessoaJuridica = 2,
    OrgaoPublico = 3
}

export enum ModalidadeBaseCalculoIcms {
    MargemValorAgregado = 1,
    Pauta = 2,
    PrecoTabelado = 3,
    ValorOperacao = 4
}

export enum ModalidadeBaseCalculoIcmsSt {
    MargemValorAgregado = 1,
    Pauta = 2,
    PrecoTabelado = 3,
    ListaNegativa = 4,
    ListaPositiva = 5,
    ListaNeutra = 6
}

export enum RegimePisCofins {
    Cumulativo = 1,
    NaoCumulativo = 2
}

export enum TipoCalculoIpi {
    Aliquota = 1,
    ValorPorUnidade = 2
}

export enum TipoCalculoPisCofins {
    Percentual = 1,
    ValorPorUnidade = 2
}

export enum MunicipioIncidenciaIss {
    Prestador = 1,
    Tomador = 2
}

/** Estado de cada retenção — `Dispensado` e `NaoAplicavel` explicam um valor zero que não é "zero calculado". */
export enum SituacaoRetencao {
    NaoAplicavel = 1,
    Dispensado = 2,
    Retido = 3
}

export enum TratamentoIcmsProprio {
    Tributado = 1,
    TributadoComReducao = 2,
    Isento = 3,
    Diferido = 4,
    SubstituidoAnteriormente = 5,
    SimplesNacional = 6
}

export enum TratamentoIpi {
    Tributado = 1,
    TributadoComAliquotaZero = 2,
    Isento = 3,
    NaoTributado = 4,
    Imune = 5,
    Suspenso = 6
}

export enum TratamentoPisCofins {
    Tributado = 1,
    Monofasico = 2,
    SubstituicaoTributaria = 3,
    AliquotaZero = 4,
    Isento = 5,
    SemIncidencia = 6,
    Suspenso = 7,
    SemDireitoACredito = 8
}

export enum TipoSituacaoTributariaIcms {
    Cst = 1,
    Csosn = 2
}

export enum IndicadorOperacaoCst {
    Entrada = 1,
    Saida = 2
}

/* ------------------------------------------------------------------------------------------------ */
/* Simulação — POST /api/fiscal/tributacao/simular                                                    */
/* ------------------------------------------------------------------------------------------------ */

export type ItemDocumentoTributavelRequest = {
    /** Eco na resposta — use para religar resultado ↔ linha da grade sem depender da ordem. */
    identificadorItem?: string | null;
    /** Tabela A (1 dígito, 0–8) — decide a alíquota de 4% no interestadual. */
    origemMercadoria: string;
    ncmId?: Guid | null;
    cfopId?: Guid | null;
    ncmCodigo?: string | null;
    cestCodigo?: string | null;
    cfopCodigo?: string | null;
    tipoItem: TipoItemSped | number;
    quantidade: number;
    valorUnitario: number;
    /** Informado, **não** derivado de quantidade × unitário: é o que o documento carrega e o peso do rateio. */
    valorProduto: number;
};

export type DocumentoTributavelRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    tipoOperacao: TipoCfop | number;
    regimeEmpresa: RegimeTributario | number;
    crtEmitente?: Crt | number | null;
    ufOrigem: string;
    /** Sigla da UF de destino, ou `"EX"` em operação com o exterior. */
    ufDestino: string;
    codigoMunicipioOrigem?: string | null;
    codigoMunicipioDestino?: string | null;
    indicadorContribuinteDestinatario: IndicadorContribuinteIcms | number;
    consumidorFinal: boolean;
    /** Resolve toda vigência: regra, exceção, alíquota interestadual, FCP e teto do INSS. */
    dataOperacao: IsoDate;
    /** Decide se o IPI entra na **base do ICMS** — não se há IPI a calcular. */
    destinatarioContribuinteIpi: boolean;
    /** Decide se **há IPI**. Obrigatório de propósito: default silencioso zeraria o IPI inteiro. */
    emitenteContribuinteIpi: boolean;
    finalidade: FinalidadeNaturezaOperacao | number;
    naturezaTomadorServico: NaturezaTomadorServico | number;
    /** Totais **do documento** — o backend rateia proporcionalmente ao valor do produto. Não ratear aqui. */
    valorFreteTotal: number;
    valorSeguroTotal: number;
    valorOutrasDespesasTotal: number;
    valorDescontoTotal: number;
    itens: ItemDocumentoTributavelRequest[];
};

export type SituacaoTributariaIcmsResponse = {
    origem: string;
    codigoSituacao: string;
    tipo: TipoSituacaoTributariaIcms | number;
    regime: RegimeTributario | number;
    crtEmitente?: Crt | number | null;
    campoXmlCodigoSituacao: string;
    usaCsosn: boolean;
    codigoIcmsTresDigitos?: string | null;
};

export type ResultadoIcms = {
    situacao: SituacaoTributariaIcmsResponse;
    tratamento: TratamentoIcmsProprio | number;
    baseIntegral: number;
    baseCalculo: number;
    percentualReducaoBase: number;
    aliquota: number;
    valorIntegral: number;
    valorDiferido: number;
    valor: number;
    baseFcp: number;
    percentualFcp: number;
    valorFcp: number;
    percentualCreditoSimplesNacional: number;
    valorCreditoSimplesNacional: number;
    retidoAnteriormente: boolean;
    comportaSubstituicaoTributaria: boolean;
    codigoBeneficioFiscal?: string | null;
    totalComFcp: number;
};

export type ResultadoIcmsSt = {
    mva: number;
    mvaAjustadaAplicada: boolean;
    baseComponentes: number;
    baseIntegral: number;
    percentualReducaoBaseSt: number;
    baseCalculo: number;
    aliquotaInternaDestino: number;
    valorIntegral: number;
    valorIcmsProprioDescontado: number;
    valor: number;
    baseFcpSt: number;
    percentualFcpSt: number;
    valorFcpSt: number;
    totalComFcpSt: number;
};

export type ResultadoDifal = {
    baseCalculo: number;
    baseDuplaAplicada: boolean;
    aliquotaInterestadual: number;
    aliquotaInternaDestino: number;
    valorIntegral: number;
    valor: number;
    percentualPartilhaDestino: number;
    valorDestino: number;
    valorOrigem: number;
    baseFcpDestino: number;
    percentualFcpDestino: number;
    valorFcpDestino: number;
    totalDestino: number;
};

export type ResultadoIpi = {
    cstCodigo: string;
    tratamento: TratamentoIpi | number;
    indicadorOperacao: IndicadorOperacaoCst | number;
    tipoCalculo: TipoCalculoIpi | number;
    baseCalculo: number;
    aliquota: number;
    valorPorUnidade: number;
    quantidade: number;
    valor: number;
    codigoEnquadramento: string;
    indicadorCreditaEntrada: boolean;
};

export type ResultadoPis = {
    cstCodigo: string;
    tratamento: TratamentoPisCofins | number;
    tipoCalculo: TipoCalculoPisCofins | number;
    baseCalculo: number;
    aliquota: number;
    valorPorUnidade: number;
    quantidade: number;
    valor: number;
    indicadorCreditaEntrada: boolean;
};

export type ResultadoCofins = ResultadoPis;

export type ResultadoIss = {
    codigoServicoLc116: string;
    municipioIncidencia: MunicipioIncidenciaIss | number;
    codigoMunicipioIncidencia: string;
    baseIntegral: number;
    percentualReducaoBase: number;
    baseCalculo: number;
    aliquota: number;
    valor: number;
    retido: boolean;
};

export type ResultadoRetencaoIrrf = {
    situacao: SituacaoRetencao | number;
    base: number;
    aliquota: number;
    baseMinima: number;
    valorMinimoRecolhimento: number;
    valorBruto: number;
    valor: number;
};

export type ResultadoRetencaoInss = {
    situacao: SituacaoRetencao | number;
    base: number;
    baseAposTeto: number;
    teto: number;
    aliquota: number;
    valor: number;
};

export type ResultadoRetencaoPcc = {
    situacao: SituacaoRetencao | number;
    base: number;
    aliquotaCsll: number;
    aliquotaPis: number;
    aliquotaCofins: number;
    valorCsll: number;
    valorPis: number;
    valorCofins: number;
    valorTotal: number;
    valorTotalBruto: number;
    minimoDispensa: number;
};

export type ResultadoRetencoes = {
    irrf: ResultadoRetencaoIrrf;
    inss: ResultadoRetencaoInss;
    pcc: ResultadoRetencaoPcc;
    issRetido: boolean;
    valorIssRetido: number;
    valorTotalRetido: number;
};

/**
 * Resultado tributário de um item. **Bloco `null` significa "não calculado", nunca "não devido"** — a tela
 * não pode renderizar `null` como `0,00`. Valor zero com bloco preenchido é outra coisa (isenção, alíquota
 * zero, retenção dispensada) e aí o zero é a informação.
 */
export type ResultadoTributacao = {
    icms?: ResultadoIcms | null;
    icmsSt?: ResultadoIcmsSt | null;
    difal?: ResultadoDifal | null;
    ipi?: ResultadoIpi | null;
    pis?: ResultadoPis | null;
    cofins?: ResultadoCofins | null;
    iss?: ResultadoIss | null;
    retencoes?: ResultadoRetencoes | null;
    /** Trilha: qual regra fiscal produziu o resultado. */
    regraAplicadaId?: Guid | null;
    /** Trilha: qual exceção/benefício sobrepôs a regra. */
    excecaoAplicadaId?: Guid | null;
};

/** Componentes monetários efetivamente usados após o rateio do documento — não recalcule o rateio na tela. */
export type ValoresItemUtilizadoResponse = {
    quantidade: number;
    valorUnitario: number;
    valorProduto: number;
    valorFreteRateado: number;
    valorSeguroRateado: number;
    valorOutrasDespesasRateado: number;
    valorDescontoRateado: number;
    baseBruta: number;
};

export type ResultadoTributacaoItemDocumento = {
    /** Posição 0-based no array de entrada. */
    indice: number;
    identificadorItem?: string | null;
    valoresUtilizados: ValoresItemUtilizadoResponse;
    resultado: ResultadoTributacao;
};

export type ResultadoTributacaoDocumento = {
    itens: ResultadoTributacaoItemDocumento[];
};

/* ------------------------------------------------------------------------------------------------ */
/* Cadastro de regras fiscais — /api/fiscal/regras                                                    */
/* ------------------------------------------------------------------------------------------------ */

export type RegraIcmsRequest = {
    cstIcmsCodigo?: string | null;
    csosnCodigo?: string | null;
    modalidadeBaseCalculo: ModalidadeBaseCalculoIcms | number;
    aliquota: number;
    percentualReducaoBase: number;
    aliquotaInternaDestino: number;
    modalidadeBaseCalculoSt: ModalidadeBaseCalculoIcmsSt | number;
    mva: number;
    mvaAjustada: number;
    percentualReducaoBaseSt: number;
    /** `null` = não informado (usa o percentual geral da UF). `0` = zero deliberado. Não confunda os dois. */
    percentualFcp?: number | null;
    percentualFcpSt?: number | null;
    percentualDiferimento: number;
    percentualCreditoSimplesNacional: number;
    codigoBeneficioFiscal?: string | null;
    baseDuplaDifal: boolean;
};

export type RegraIpiRequest = {
    cstIpiCodigo: string;
    tipoCalculo: TipoCalculoIpi | number;
    aliquota: number;
    valorPorUnidade: number;
    codigoEnquadramento: string;
    indicadorCreditaEntrada: boolean;
};

export type RegraPisCofinsRequest = {
    cstPisCodigo: string;
    cstCofinsCodigo: string;
    regime: RegimePisCofins | number;
    aliquotaPis: number;
    aliquotaCofins: number;
    tipoCalculo: TipoCalculoPisCofins | number;
    valorPorUnidadePis: number;
    valorPorUnidadeCofins: number;
    indicadorCreditaEntrada: boolean;
    excluirIcmsDaBase: boolean;
};

export type RegraIssRequest = {
    codigoServicoLc116: string;
    aliquota: number;
    municipioIncidencia: MunicipioIncidenciaIss | number;
    indicadorRetido: boolean;
    percentualReducaoBase: number;
};

export type RegraRetencaoRequest = {
    irrfAliquota: number;
    irrfBaseMinima: number;
    irrfValorMinimoRecolhimento: number;
    inssAliquota: number;
    csllAliquota: number;
    pisRetidoAliquota: number;
    cofinsRetidoAliquota: number;
    pccMinimoDispensa: number;
};

/**
 * Chave de resolução + blocos opcionais. Campos anuláveis da chave são **curinga** (`null` = "vale para
 * qualquer valor"), não "não preenchido". Bloco ausente = tributo **não parametrizado**, não "tributo zero".
 */
export type CriarRegraFiscalOperacaoRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    descricao: string;
    tipoOperacao: TipoCfop | number;
    ufOrigem?: string | null;
    ufDestino?: string | null;
    regimeEmpresa?: RegimeTributario | number | null;
    indicadorContribuinte?: IndicadorContribuinteIcms | number | null;
    consumidorFinal?: boolean | null;
    ncmId?: Guid | null;
    grupoProdutoId?: Guid | null;
    cfopId?: Guid | null;
    prioridade: number;
    vigenciaInicio: IsoDate;
    vigenciaFim?: IsoDate | null;
    icms?: RegraIcmsRequest | null;
    ipi?: RegraIpiRequest | null;
    pisCofins?: RegraPisCofinsRequest | null;
    iss?: RegraIssRequest | null;
    retencao?: RegraRetencaoRequest | null;
};

/**
 * `PUT` é **substituição total**: bloco ausente no payload é removido no backend. Nunca monte o payload
 * incrementalmente — reenvie sempre o objeto completo.
 */
export type AtualizarRegraFiscalOperacaoRequest = Omit<CriarRegraFiscalOperacaoRequest, 'empresaId' | 'filialId'>;

export type InativarRegraFiscalOperacaoRequest = { motivo: string };

export type RegraIcmsResponse = RegraIcmsRequest & { id: Guid };
export type RegraIpiResponse = RegraIpiRequest & { id: Guid };
export type RegraPisCofinsResponse = RegraPisCofinsRequest & { id: Guid };
export type RegraIssResponse = RegraIssRequest & { id: Guid };
export type RegraRetencaoResponse = RegraRetencaoRequest & { id: Guid };

export type RegraFiscalOperacaoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    descricao: string;
    tipoOperacao: TipoCfop | number;
    ufOrigem?: string | null;
    ufDestino?: string | null;
    regimeEmpresa?: RegimeTributario | number | null;
    indicadorContribuinte?: IndicadorContribuinteIcms | number | null;
    consumidorFinal?: boolean | null;
    ncmId?: Guid | null;
    grupoProdutoId?: Guid | null;
    cfopId?: Guid | null;
    prioridade: number;
    vigenciaInicio: IsoDate;
    vigenciaFim?: IsoDate | null;
    ativa: boolean;
    icms?: RegraIcmsResponse | null;
    ipi?: RegraIpiResponse | null;
    pisCofins?: RegraPisCofinsResponse | null;
    iss?: RegraIssResponse | null;
    retencao?: RegraRetencaoResponse | null;
};

export type RegraFiscalOperacaoResumoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    descricao: string;
    tipoOperacao: TipoCfop | number;
    ufOrigem?: string | null;
    ufDestino?: string | null;
    prioridade: number;
    vigenciaInicio: IsoDate;
    vigenciaFim?: IsoDate | null;
    ativa: boolean;
};

export type RegraFiscalListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    tipoOperacao?: TipoCfop | number | null;
    ufDestino?: string | null;
    ncmId?: Guid | null;
    cfopId?: Guid | null;
    somenteAtivas?: boolean | null;
    termo?: string | null;
    pagina?: number;
    tamanhoPagina?: number;
};

export type RegraFiscalListagemResponse = PagedResult<RegraFiscalOperacaoResumoResponse>;

/* ------------------------------------------------------------------------------------------------ */
/* Exceções e benefícios — /api/fiscal/excecoes e /api/fiscal/excecoes-ncm                            */
/* ------------------------------------------------------------------------------------------------ */

export type ExcecaoIcmsRequest = {
    cstIcmsCodigo?: string | null;
    csosnCodigo?: string | null;
    aliquota: number;
    percentualReducaoBase: number;
    percentualDiferimento: number;
    percentualFcp?: number | null;
    percentualCreditoSimplesNacional: number;
};

export type ExcecaoPisCofinsRequest = {
    cstPisCodigo: string;
    cstCofinsCodigo: string;
    aliquotaPis: number;
    aliquotaCofins: number;
    tipoCalculo: TipoCalculoPisCofins | number;
    valorPorUnidadePis: number;
    valorPorUnidadeCofins: number;
    indicadorCreditaEntrada: boolean;
    excluirIcmsDaBase: boolean;
};

/** Uma exceção precisa de **ao menos um bloco** — sem isso o backend rejeita o cadastro fantasma. */
export type CriarExcecaoFiscalRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    descricao: string;
    uf: string;
    codigoBeneficio?: string | null;
    vigenciaInicio: IsoDate;
    vigenciaFim?: IsoDate | null;
    icms?: ExcecaoIcmsRequest | null;
    pisCofins?: ExcecaoPisCofinsRequest | null;
};

export type AtualizarExcecaoFiscalRequest = Omit<CriarExcecaoFiscalRequest, 'empresaId' | 'filialId'>;

export type CriarExcecaoFiscalNcmRequest = CriarExcecaoFiscalRequest & { ncmId: Guid };

export type AtualizarExcecaoFiscalNcmRequest = Omit<CriarExcecaoFiscalNcmRequest, 'empresaId' | 'filialId'>;

export type InativarExcecaoFiscalRequest = { motivo: string };

export type ExcecaoIcmsResponse = ExcecaoIcmsRequest & { id: Guid };
export type ExcecaoPisCofinsResponse = ExcecaoPisCofinsRequest & { id: Guid };

export type ExcecaoFiscalResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    descricao: string;
    uf: string;
    codigoBeneficio?: string | null;
    vigenciaInicio: IsoDate;
    vigenciaFim?: IsoDate | null;
    ativa: boolean;
    icms?: ExcecaoIcmsResponse | null;
    pisCofins?: ExcecaoPisCofinsResponse | null;
};

export type ExcecaoFiscalNcmResponse = ExcecaoFiscalResponse & { ncmId: Guid };

export type ExcecaoFiscalResumoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    descricao: string;
    uf: string;
    codigoBeneficio?: string | null;
    vigenciaInicio: IsoDate;
    vigenciaFim?: IsoDate | null;
    ativa: boolean;
};

export type ExcecaoFiscalNcmResumoResponse = ExcecaoFiscalResumoResponse & { ncmId: Guid };

export type ExcecaoFiscalListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    uf?: string | null;
    somenteAtivas?: boolean | null;
    termo?: string | null;
    pagina?: number;
    tamanhoPagina?: number;
};

export type ExcecaoFiscalNcmListQuery = ExcecaoFiscalListQuery & { ncmId?: Guid | null };

export type ExcecaoFiscalListagemResponse = PagedResult<ExcecaoFiscalResumoResponse>;
export type ExcecaoFiscalNcmListagemResponse = PagedResult<ExcecaoFiscalNcmResumoResponse>;

/* ------------------------------------------------------------------------------------------------ */
/* Cadastros fiscais consultados pelas telas (NCM/CFOP) — /api/fiscal/cadastros                       */
/* ------------------------------------------------------------------------------------------------ */

export type NcmResumoResponse = {
    id: Guid;
    codigo: string;
    descricao: string;
    ativo: boolean;
};

export type CfopResumoResponse = {
    id: Guid;
    codigo: string;
    descricao: string;
    tipo: TipoCfop | number;
    ativo: boolean;
};
