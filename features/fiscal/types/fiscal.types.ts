import {
    FormatoDocumentoAuxiliarFiscal,
    Guid,
    IsoDateTime,
    OrigemNotaFiscal,
    PagedResult,
    StatusNotaFiscal,
    TipoContingenciaFiscal,
    TipoDocumentoAuxiliarFiscal,
    TipoDocumentoFiscal,
    TipoEventoFiscal,
    TipoOperacaoFiscal,
    TipoServicoTransmissaoFiscal,
    TipoXmlFiscal
} from '@/types/erp';

export type NotaFiscalListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    tipoDocumento?: TipoDocumentoFiscal | number | null;
    tipoOperacao?: TipoOperacaoFiscal | number | null;
    statusFiscal?: StatusNotaFiscal | number | null;
    origem?: OrigemNotaFiscal | number | null;
    origemId?: Guid | null;
    pessoaId?: Guid | null;
    serie?: string | null;
    numero?: string | null;
    chaveAcesso?: string | null;
    protocoloAutorizacao?: string | null;
    dataEmissaoInicial?: IsoDateTime | null;
    dataEmissaoFinal?: IsoDateTime | null;
    dataAutorizacaoInicial?: IsoDateTime | null;
    dataAutorizacaoFinal?: IsoDateTime | null;
    dataCancelamentoInicial?: IsoDateTime | null;
    dataCancelamentoFinal?: IsoDateTime | null;
    valorTotalMinimo?: number | null;
    valorTotalMaximo?: number | null;
    possuiXmlAutorizado?: boolean | null;
    possuiDanfe?: boolean | null;
    contaReceberGerada?: boolean | null;
    statusPedidoVenda?: number | null;
    somenteComPendenciaXmlAutorizado?: boolean | null;
    somenteComPendenciaDanfe?: boolean | null;
    somenteComPendenciaEstoque?: boolean | null;
    somenteComPendenciaFinanceira?: boolean | null;
    page?: number;
    pageSize?: number;
};

export type NotaFiscalExportacaoCsvQuery = NotaFiscalListQuery & {
    formato?: number | null;
    limite?: number | null;
    motivo: string;
};

export type NotaFiscalListagemItemResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    tipoDocumento: TipoDocumentoFiscal | number;
    tipoOperacao: TipoOperacaoFiscal | number;
    statusFiscal: StatusNotaFiscal | number;
    origem: OrigemNotaFiscal | number;
    origemId?: Guid | null;
    pessoaId?: Guid | null;
    serie: string;
    numero: string;
    chaveAcesso?: string | null;
    protocoloAutorizacao?: string | null;
    dataEmissao: IsoDateTime;
    autorizadaEm?: IsoDateTime | null;
    canceladaEm?: IsoDateTime | null;
    valorTotal: number;
    possuiXmlEnvio: boolean;
    possuiXmlAutorizado: boolean;
    possuiDanfe: boolean;
    estoqueAplicavel: boolean;
    estoqueBaixado: boolean;
    estoquePendente: boolean;
    financeiroAplicavel: boolean;
    contaReceberGerada: boolean;
    financeiroPendente: boolean;
    acaoPrincipalCodigo?: string | null;
    acaoPrincipalNome?: string | null;
    acaoPrincipalMetodoHttp?: string | null;
    acaoPrincipalEndpoint?: string | null;
    acaoPrincipalPermissao?: string | null;
    alertas?: string[];
};

export type NotaFiscalListagemResponse = PagedResult<NotaFiscalListagemItemResponse> & {
    hasPreviousPage?: boolean;
    hasNextPage?: boolean;
};

export type ItemNotaFiscalResponse = {
    id: Guid;
    sequencia: number;
    produtoId?: Guid | null;
    codigoItem: string;
    descricao: string;
    ncm?: string | null;
    cfop?: string | null;
    unidadeComercial: string;
    quantidade: number;
    valorUnitario: number;
    valorBruto: number;
    valorDesconto: number;
    valorTotal: number;
    observacao?: string | null;
};

export type ImpostoNotaFiscalResponse = {
    id: Guid;
    itemNotaFiscalId?: Guid | null;
    nome: string;
    cstCsosn?: string | null;
    baseCalculo: number;
    aliquota: number;
    valor: number;
    observacao?: string | null;
};

export type XmlNotaFiscalResponse = {
    id: Guid;
    tipo: TipoXmlFiscal | number;
    hashSha256: string;
    protocolo?: string | null;
    chaveAcesso?: string | null;
    armazenadoEm?: IsoDateTime | null;
};

export type EventoNotaFiscalResponse = {
    id: Guid;
    tipo: TipoEventoFiscal | number;
    codigo?: string | null;
    descricao?: string | null;
    protocolo?: string | null;
    dataEvento?: IsoDateTime | null;
    usuarioId?: Guid | null;
};

export type NotaFiscalResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    tipoDocumento: TipoDocumentoFiscal | number;
    tipoOperacao: TipoOperacaoFiscal | number;
    origem: OrigemNotaFiscal | number;
    origemId?: Guid | null;
    pessoaId?: Guid | null;
    serie: string;
    numero: string;
    chaveAcesso?: string | null;
    protocoloAutorizacao?: string | null;
    dataEmissao: IsoDateTime;
    autorizadaEm?: IsoDateTime | null;
    canceladaEm?: IsoDateTime | null;
    statusFiscal: StatusNotaFiscal | number;
    valorProdutos: number;
    valorDesconto: number;
    valorTotal: number;
    codigoRejeicao?: string | null;
    mensagemRejeicao?: string | null;
    motivoCancelamento?: string | null;
    observacao?: string | null;
    itens: ItemNotaFiscalResponse[];
    impostos: ImpostoNotaFiscalResponse[];
    xmls: XmlNotaFiscalResponse[];
    eventos: EventoNotaFiscalResponse[];
};

export type ResumoPedidoVendaFiscalResponse = {
    id: Guid;
    numero?: string | null;
    status?: number | null;
    clienteId?: Guid | null;
    valorTotal?: number | null;
    faturadoEm?: IsoDateTime | null;
};

export type ResumoEstoqueFiscalResponse = {
    aplicavel: boolean;
    baixado: boolean;
    itensPendentes: number;
    quantidadePendente: number;
    sequenciasPendentes?: number[];
};

export type ResumoFinanceiroFiscalResponse = {
    aplicavel: boolean;
    contaReceberGerada: boolean;
    contaReceberId?: Guid | null;
    status?: number | null;
    valorOriginal?: number | null;
    valorSaldo?: number | null;
};

export type AcoesResumoFiscalResponse = {
    podeValidar: boolean;
    podeGerarXmlEnvio: boolean;
    podeAssinarXmlEnvio: boolean;
    podeTransmitirSefaz: boolean;
    podeGerarDanfe: boolean;
    podeBaixarEstoque: boolean;
    podeGerarContaReceber: boolean;
    podeCancelar: boolean;
    podeEmitirCartaCorrecao: boolean;
};

export type ResumoOperacionalNotaFiscalResponse = {
    notaFiscalId: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    tipoDocumento: TipoDocumentoFiscal | number;
    serie: string;
    numero: string;
    statusFiscal: StatusNotaFiscal | number;
    origem: OrigemNotaFiscal | number;
    origemId?: Guid | null;
    possuiXmlEnvio: boolean;
    possuiXmlAutorizado: boolean;
    possuiDanfe: boolean;
    pedidoVenda?: ResumoPedidoVendaFiscalResponse | null;
    estoque?: ResumoEstoqueFiscalResponse | null;
    financeiro?: ResumoFinanceiroFiscalResponse | null;
    acoes: AcoesResumoFiscalResponse;
    alertas?: string[];
};

export type EtapaWorkflowFiscalResponse = {
    ordem: number;
    codigo: string;
    nome: string;
    status: 'Concluida' | 'Disponivel' | 'Bloqueada' | 'NaoAplicavel' | string;
    obrigatoria: boolean;
    metodoHttp?: string | null;
    endpoint?: string | null;
    permissao?: string | null;
    motivoBloqueio?: string | null;
};

export type AcaoWorkflowFiscalResponse = {
    codigo: string;
    nome: string;
    metodoHttp?: string | null;
    endpoint?: string | null;
    permissao?: string | null;
    habilitada: boolean;
    motivoBloqueio?: string | null;
    payloadReferencia?: string | null;
};

export type WorkflowOperacionalNotaFiscalResponse = {
    notaFiscalId: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    tipoDocumento: TipoDocumentoFiscal | number;
    statusFiscal: StatusNotaFiscal | number;
    etapaAtual?: string | null;
    ordemEtapaAtual: number;
    percentualConcluido: number;
    resumo?: Record<string, unknown> | null;
    etapas: EtapaWorkflowFiscalResponse[];
    proximasAcoes: AcaoWorkflowFiscalResponse[];
    bloqueios?: string[];
    alertas?: string[];
};

export type LogIntegracaoFiscalResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    notaFiscalId?: Guid | null;
    operacao: string;
    statusIntegracao: number;
    correlationId?: string | null;
    payloadResumo?: string | null;
    mensagem?: string | null;
    registradoEm?: IsoDateTime | null;
    podeReprocessar: boolean;
    contemDadoSensivelOcultado: boolean;
};

export type ObservabilidadeFiscalResponse = {
    empresaId: Guid;
    filialId?: Guid | null;
    geradoEm?: IsoDateTime | null;
    registradoApos?: IsoDateTime | null;
    totalLogsAnalisados: number;
    totalSucesso: number;
    totalFalha: number;
    totalReprocessamento: number;
    totalPendente: number;
    ultimoRegistroEm?: IsoDateTime | null;
    possuiFalhaRecente: boolean;
    possuiPendenciaRecente: boolean;
    operacoesComFalha?: string[];
    alertas?: string[];
    logsRecentes: LogIntegracaoFiscalResponse[];
};

export type CriarNotaFiscalRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    tipoDocumento: TipoDocumentoFiscal | number;
    tipoOperacao: TipoOperacaoFiscal | number;
    origem: OrigemNotaFiscal | number;
    origemId?: Guid | null;
    serie: string;
    numero: string;
    dataEmissao: string | Date;
    naturezaOperacaoId?: Guid | null;
    pessoaId?: Guid | null;
    observacao?: string | null;
};

export type GerarNotaFiscalPedidoVendaRequest = {
    pedidoVendaId: Guid;
    tipoDocumento: TipoDocumentoFiscal | number;
    serie: string;
    numero: string;
    naturezaOperacaoId?: Guid | null;
    cfopPadrao?: string | null;
    unidadeComercialPadrao: string;
    validarDadosFiscaisProduto: boolean;
    observacao?: string | null;
};

export type NotaFiscalPedidoVendaResponse = {
    notaFiscal: NotaFiscalResponse;
    pedidoVendaId: Guid;
    numeroPedidoVenda?: string | null;
    alertas?: string[];
};

export type AdicionarItemNotaFiscalRequest = {
    produtoId?: Guid | null;
    codigoItem: string;
    descricao: string;
    ncm?: string | null;
    cfop?: string | null;
    unidadeComercial: string;
    quantidade: number;
    valorUnitario: number;
    valorDesconto: number;
    observacao?: string | null;
};

export type AdicionarImpostoNotaFiscalRequest = {
    itemNotaFiscalId?: Guid | null;
    nome: string;
    cstCsosn?: string | null;
    baseCalculo: number;
    aliquota: number;
    valor: number;
    observacao?: string | null;
};

export type ArmazenarXmlNotaFiscalRequest = {
    tipo: TipoXmlFiscal | number;
    conteudoXml: string;
    protocolo?: string | null;
    chaveAcesso?: string | null;
};

export type GerarXmlEnvioNotaFiscalRequest = {
    armazenarXml: boolean;
    validarSchema: boolean;
    schemaSetName?: string | null;
};

export type AssinarXmlNotaFiscalRequest = {
    certificateThumbprint?: string | null;
    xmlEnvio?: string | null;
    armazenarXmlAssinado: boolean;
    validarSchemaAntesAssinatura: boolean;
    schemaSetName?: string | null;
};

export type TransmitirNotaFiscalSefazRequest = {
    ufAutorizadora: string;
    servico: TipoServicoTransmissaoFiscal | number;
    xmlEnvioAssinado?: string | null;
    validarSchemaAntesTransmissao: boolean;
    schemaSetName?: string | null;
    correlationId?: string | null;
};

export type ReprocessarNotaFiscalSefazRequest = TransmitirNotaFiscalSefazRequest & {
    logIntegracaoFiscalId?: Guid | null;
    correlationIdOriginal?: string | null;
    correlationId: string;
    motivo: string;
};

export type ConsultarProtocoloSefazRequest = {
    ufAutorizadora: string;
    servico: TipoServicoTransmissaoFiscal | number;
    xmlConsultaAssinado: string;
    validarSchemaAntesConsulta: boolean;
    schemaSetName?: string | null;
    aplicarReconciliacaoLocal: boolean;
    correlationId?: string | null;
};

export type ConsultaProtocoloSefazResponse = {
    notaFiscalId: Guid;
    statusFiscalAntes: StatusNotaFiscal | number;
    statusFiscalDepois: StatusNotaFiscal | number;
    servico: TipoServicoTransmissaoFiscal | number;
    comunicacaoOk: boolean;
    autorizadaNoAmbiente: boolean;
    reconciliacaoAplicada: boolean;
    codigoStatus?: string | null;
    motivo?: string | null;
    protocolo?: string | null;
    chaveAcesso?: string | null;
    deveReprocessar: boolean;
    alertas?: string[];
};

export type StatusServicoSefazRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    tipoDocumento: TipoDocumentoFiscal | number;
    ufAutorizadora: string;
    xmlStatusServico: string;
    validarSchemaAntesConsulta: boolean;
    schemaSetName?: string | null;
    correlationId?: string | null;
};

export type StatusServicoSefazResponse = {
    empresaId: Guid;
    filialId?: Guid | null;
    tipoDocumento: TipoDocumentoFiscal | number;
    ambiente: number;
    ufAutorizadora: string;
    comunicacaoOk: boolean;
    disponivel: boolean;
    codigoStatus?: string | null;
    motivo?: string | null;
    deveReprocessar: boolean;
    consultadoEm?: IsoDateTime | null;
    alertas?: string[];
};

export type AvaliarContingenciaFiscalRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    tipoDocumento: TipoDocumentoFiscal | number;
    ufAutorizadora: string;
    tipoContingencia: TipoContingenciaFiscal | number;
    motivo: string;
    exigirStatusServicoIndisponivelRecente: boolean;
    janelaStatusServicoMinutos: number;
    correlationId?: string | null;
};

export type HabilitarContingenciaNotaFiscalRequest = Omit<AvaliarContingenciaFiscalRequest, 'empresaId' | 'filialId' | 'tipoDocumento'>;

export type ContingenciaFiscalResponse = {
    notaFiscalId?: Guid | null;
    empresaId: Guid;
    filialId?: Guid | null;
    tipoDocumento: TipoDocumentoFiscal | number;
    ambiente: number;
    ufAutorizadora: string;
    tipoContingencia: TipoContingenciaFiscal | number;
    permitida: boolean;
    statusServicoIndisponivelDetectado: boolean;
    codigoStatusServico?: string | null;
    motivoStatusServico?: string | null;
    motivoOperacional?: string | null;
    avaliadaEm?: IsoDateTime | null;
    alertas?: string[];
};

export type RegistrarRejeicaoNotaFiscalRequest = {
    codigoRejeicao: string;
    mensagemRejeicao: string;
};

export type CancelarNotaFiscalRequest = {
    motivo: string;
    protocoloCancelamento?: string | null;
    xmlCancelamento?: string | null;
};

export type CancelarNotaFiscalSefazRequest = {
    ufAutorizadora: string;
    motivo: string;
    xmlEventoAssinado: string;
    validarSchemaAntesTransmissao: boolean;
    schemaSetName?: string | null;
    correlationId?: string | null;
};

export type EmitirCartaCorrecaoSefazRequest = {
    ufAutorizadora: string;
    textoCorrecao: string;
    xmlEventoAssinado: string;
    validarSchemaAntesTransmissao: boolean;
    schemaSetName?: string | null;
    correlationId?: string | null;
};

export type InutilizarNumeracaoSefazRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    tipoDocumento: TipoDocumentoFiscal | number;
    serie: string;
    numeroInicial: number;
    numeroFinal: number;
    motivo: string;
    ufAutorizadora: string;
    xmlInutilizacaoAssinado: string;
    validarSchemaAntesTransmissao: boolean;
    schemaSetName?: string | null;
    correlationId?: string | null;
};

export type GerarDanfeNotaFiscalRequest = { correlationId?: string | null };

export type BaixarEstoqueNotaFiscalRequest = {
    motivo: string;
    documento?: string | null;
    correlationId?: string | null;
};

export type BaixaEstoqueNotaFiscalItemResponse = {
    pedidoVendaItemId: Guid;
    produtoId: Guid;
    reservaEstoqueId?: Guid | null;
    movimentoEstoqueId?: Guid | null;
    quantidadeBaixada: number;
};

export type BaixarEstoqueNotaFiscalResponse = {
    notaFiscalId: Guid;
    pedidoVendaId?: Guid | null;
    statusFiscal: StatusNotaFiscal | number;
    quantidadeTotalBaixada: number;
    itens: BaixaEstoqueNotaFiscalItemResponse[];
    alertas?: string[];
};

export type GerarContaReceberNotaFiscalRequest = {
    condicaoPagamentoId?: Guid | null;
    primeiraDataVencimento: IsoDateTime;
    documento?: string | null;
    observacao?: string | null;
    correlationId?: string | null;
};

export type ParcelaContaReceberFiscalResponse = {
    id: Guid;
    numero: number;
    vencimento: IsoDateTime;
    valorOriginal: number;
    valorSaldo: number;
    status: number;
};

export type GerarContaReceberNotaFiscalResponse = {
    notaFiscalId: Guid;
    pedidoVendaId?: Guid | null;
    contaReceberId: Guid;
    documento?: string | null;
    origem: number;
    origemId: Guid;
    valorOriginal: number;
    valorSaldo: number;
    status: number;
    jaExistia: boolean;
    parcelas: ParcelaContaReceberFiscalResponse[];
    alertas?: string[];
};

export type NotaFiscalXmlPipelineResponse = {
    notaFiscalId: Guid;
    tipoDocumento: TipoDocumentoFiscal | number;
    statusFiscal: StatusNotaFiscal | number;
    tipoXml: TipoXmlFiscal | number;
    conteudoXml: string;
    schemaSetName?: string | null;
    schemaValidado: boolean;
    armazenado: boolean;
    alertas?: string[];
};

export type TransmissaoSefazResponse = {
    notaFiscalId: Guid;
    statusFiscal: StatusNotaFiscal | number;
    comunicacaoOk: boolean;
    autorizada: boolean;
    codigoStatus?: string | null;
    motivo?: string | null;
    protocolo?: string | null;
    chaveAcesso?: string | null;
    deveReprocessar: boolean;
};

export type EventoFiscalOperacionalResponse = {
    notaFiscalId: Guid;
    statusFiscal?: StatusNotaFiscal | number;
    tipoEvento?: TipoEventoFiscal | number;
    comunicacaoOk: boolean;
    autorizadoPeloAmbiente: boolean;
    codigoStatus?: string | null;
    motivo?: string | null;
    protocolo?: string | null;
    deveReprocessar: boolean;
};

export type CartaCorrecaoResponse = {
    id: Guid;
    notaFiscalId: Guid;
    sequencia: number;
    textoCorrecao: string;
    protocolo?: string | null;
    criadaEm?: IsoDateTime | null;
    criadaPor?: Guid | null;
};

export type InutilizacaoNumeracaoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    tipoDocumento: TipoDocumentoFiscal | number;
    serie: string;
    numeroInicial: number;
    numeroFinal: number;
    motivo: string;
    protocolo?: string | null;
    inutilizadaEm?: IsoDateTime | null;
    inutilizadaPor?: Guid | null;
    comunicacaoOk: boolean;
    autorizadaPeloAmbiente: boolean;
    codigoStatus?: string | null;
    retornoMotivo?: string | null;
    deveReprocessar: boolean;
};

export type DocumentoAuxiliarFiscalResponse = {
    id: Guid;
    notaFiscalId: Guid;
    tipo: TipoDocumentoAuxiliarFiscal | number;
    formato: FormatoDocumentoAuxiliarFiscal | number;
    nomeArquivo: string;
    contentType: string;
    hashSha256: string;
    tamanhoBytes: number;
    geradoEm?: IsoDateTime | null;
    geradoPor?: Guid | null;
    alertas?: string[];
};
