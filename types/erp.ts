export type Guid = string;
export type IsoDateTime = string;

export enum EntityStatus {
    Ativo = 1,
    Inativo = 2,
    Cancelado = 3,
    Bloqueado = 4,
    Pendente = 5
}

export enum TipoPessoa {
    Fisica = 1,
    Juridica = 2
}

export enum TipoProduto {
    Mercadoria = 1,
    Servico = 2,
    MateriaPrima = 3,
    ProdutoAcabado = 4,
    UsoConsumo = 5,
    AtivoImobilizado = 6,
    Outro = 99
}

export enum TipoItemFiscal {
    Mercadoria = 1,
    Servico = 2,
    Composicao = 3,
    Outro = 99
}

export enum TipoMovimentoEstoque {
    Entrada = 1,
    Saida = 2,
    AjusteEntrada = 3,
    AjusteSaida = 4,
    Reserva = 5,
    BaixaReserva = 6,
    CancelamentoReserva = 7
}

export enum StatusReservaEstoque {
    Ativa = 1,
    ParcialmenteBaixada = 2,
    Baixada = 3,
    Cancelada = 4
}

export enum StatusInventario {
    Aberto = 1,
    Fechado = 2,
    Cancelado = 3
}

export enum TipoPedidoVenda {
    Orcamento = 1,
    Pedido = 2
}

export enum StatusPedidoVenda {
    Rascunho = 1,
    AguardandoAprovacao = 2,
    Aprovado = 3,
    Cancelado = 4,
    Faturado = 5
}

export enum OrigemFinanceira {
    Manual = 1,
    PedidoVenda = 2,
    NotaFiscal = 3,
    Compra = 4,
    Contrato = 5,
    AjusteAutorizado = 6
}

export enum StatusContaFinanceira {
    Aberta = 1,
    ParcialmenteQuitada = 2,
    Quitada = 3,
    Cancelada = 4,
    Estornada = 5
}

export enum StatusParcelaFinanceira {
    Aberta = 1,
    ParcialmenteQuitada = 2,
    Quitada = 3,
    Cancelada = 4,
    Estornada = 5
}

export enum StatusPedidoCompra {
    Rascunho = 1,
    AguardandoAprovacao = 2,
    Aprovado = 3,
    ParcialmenteRecebido = 4,
    Recebido = 5,
    Cancelado = 6
}


export enum TipoDocumentoFiscal {
    NFe = 1,
    NFCe = 2,
    NFSe = 3,
    CTe = 4,
    MDFe = 5,
    Outro = 99
}

export enum TipoOperacaoFiscal {
    Venda = 1,
    Compra = 2,
    Devolucao = 3,
    Remessa = 4,
    Transferencia = 5,
    Bonificacao = 6,
    Servico = 7,
    Transporte = 8,
    Outro = 99
}

export enum OrigemNotaFiscal {
    Manual = 1,
    PedidoVenda = 2,
    PedidoCompra = 3,
    Servico = 4,
    Importacao = 5
}

export enum StatusNotaFiscal {
    Rascunho = 1,
    Validada = 2,
    Assinada = 3,
    Transmitida = 4,
    Autorizada = 5,
    Rejeitada = 6,
    Cancelada = 7,
    Inutilizada = 8,
    Denegada = 9,
    Contingencia = 10
}

export enum TipoXmlFiscal {
    Envio = 1,
    Autorizado = 2,
    Cancelamento = 3,
    CartaCorrecao = 4,
    Inutilizacao = 5,
    RetornoAutorizador = 6
}

export enum TipoEventoFiscal {
    Criacao = 1,
    Validacao = 2,
    Assinatura = 3,
    Transmissao = 4,
    Autorizacao = 5,
    Rejeicao = 6,
    Cancelamento = 7,
    CartaCorrecao = 8,
    Inutilizacao = 9,
    ErroIntegracao = 10,
    CorrecaoRascunho = 11,
    Contingencia = 12
}

export enum TipoServicoTransmissaoFiscal {
    Autorizacao = 1,
    ConsultaRetornoAutorizacao = 2,
    ConsultaProtocolo = 3,
    StatusServico = 4
}

export enum TipoContingenciaFiscal {
    Svc = 1,
    Epec = 2,
    OfflineNfce = 3,
    OperacionalInterna = 99
}

export enum TipoDocumentoAuxiliarFiscal {
    Danfe = 1,
    Dacte = 2,
    Damdfe = 3,
    Outros = 99
}

export enum FormatoDocumentoAuxiliarFiscal {
    Pdf = 1,
    Html = 2
}

export type PermissionCode =
    | 'AUDITORIA_CONSULTAR'
    | 'ATIVIDADES_CONSULTAR'
    | 'ATIVIDADES_GERENCIAR'
    | 'RELATORIOS_CONSULTAR'
    | 'ADMINISTRACAO_CONSULTAR'
    | 'ADMINISTRACAO_GERENCIAR'
    | 'SEGURANCA_USUARIOS_CONSULTAR'
    | 'SEGURANCA_USUARIOS_GERENCIAR'
    | 'SEGURANCA_PERMISSOES_GERENCIAR'
    | 'SEGURANCA_SESSOES_GERENCIAR'
    | 'PESSOAS_CONSULTAR'
    | 'PESSOAS_GERENCIAR'
    | 'CLIENTES_CONSULTAR'
    | 'CLIENTES_GERENCIAR'
    | 'FORNECEDORES_CONSULTAR'
    | 'FORNECEDORES_GERENCIAR'
    | 'PRODUTOS_CONSULTAR'
    | 'PRODUTOS_GERENCIAR'
    | 'PRODUTOS_INATIVAR'
    | 'PRODUTOS_DADOS_FISCAIS_GERENCIAR'
    | 'CATEGORIAS_PRODUTO_GERENCIAR'
    | 'UNIDADES_MEDIDA_GERENCIAR'
    | 'MARCAS_GERENCIAR'
    | 'ESTOQUE_CONSULTAR'
    | 'ESTOQUE_MOVIMENTAR'
    | 'ESTOQUE_RESERVAR'
    | 'ESTOQUE_INVENTARIO_GERENCIAR'
    | 'LOCAIS_ESTOQUE_GERENCIAR'
    | 'VENDAS_CONSULTAR'
    | 'VENDAS_GERENCIAR'
    | 'VENDAS_APROVAR'
    | 'VENDAS_CANCELAR'
    | 'VENDAS_FATURAR'
    | 'TABELAS_PRECO_CONSULTAR'
    | 'TABELAS_PRECO_GERENCIAR'
    | 'FINANCEIRO_CONSULTAR'
    | 'FINANCEIRO_GERENCIAR'
    | 'FINANCEIRO_RECEBER'
    | 'FINANCEIRO_PAGAR'
    | 'FINANCEIRO_ESTORNAR'
    | 'FINANCEIRO_CANCELAR'
    | 'FORMAS_PAGAMENTO_GERENCIAR'
    | 'CONDICOES_PAGAMENTO_GERENCIAR'
    | 'COMPRAS_CONSULTAR'
    | 'COMPRAS_GERENCIAR'
    | 'COMPRAS_APROVAR'
    | 'COMPRAS_CANCELAR'
    | 'COMPRAS_RECEBER'
    | 'FISCAL_CONSULTAR'
    | 'FISCAL_EXPORTAR'
    | 'FISCAL_GERENCIAR'
    | 'FISCAL_EMITIR'
    | 'FISCAL_CANCELAR'
    | 'FISCAL_INUTILIZAR'
    | 'FISCAL_CARTA_CORRECAO'
    | 'NOTIFICACOES_CONSULTAR'
    | 'NOTIFICACOES_GERENCIAR'
    | 'ANEXOS_CONSULTAR'
    | 'ANEXOS_BAIXAR'
    | 'ANEXOS_GERENCIAR'
    | 'SERVICOS_CONSULTAR'
    | 'SERVICOS_GERENCIAR'
    | 'SERVICOS_APONTAR'
    | 'SERVICOS_FATURAR'
    | 'PDV_CONSULTAR'
    | 'PDV_CAIXA_GERENCIAR'
    | 'PDV_VENDER'
    | 'FATURAMENTO_CONSULTAR'
    | 'FATURAMENTO_PREPARAR'
    | 'FATURAMENTO_CONFIRMAR'
    | 'FATURAMENTO_CANCELAR'
    | 'COMPRAS_SOLICITACOES_CONSULTAR'
    | 'COMPRAS_SOLICITACOES_GERENCIAR'
    | 'COMPRAS_SOLICITACOES_APROVAR'
    | 'COMPRAS_COTACOES_CONSULTAR'
    | 'COMPRAS_COTACOES_GERENCIAR'
    | 'COMPRAS_COTACOES_APROVAR'
    | 'COMPRAS_CONFERENCIA_FISCAL_REGISTRAR'
    | 'ESTOQUE_AJUSTAR'
    | 'ESTOQUE_BLOQUEIO_GERENCIAR'
    | 'FINANCEIRO_FLUXO_CAIXA_CONSULTAR'
    | 'FROTA_CONSULTAR'
    | 'FROTA_GERENCIAR'
    | 'PORTARIA_CONSULTAR'
    | 'PORTARIA_PRE_AUTORIZAR'
    | 'PORTARIA_OPERAR'
    | 'ALIMENTAR_CONSULTAR'
    | 'ALIMENTAR_LOTES_GERENCIAR'
    | 'ALIMENTAR_RECALL_GERENCIAR'
    | 'RH_CONSULTAR'
    | 'RH_GERENCIAR'
    | 'RH_PONTO_REGISTRAR'
    | 'RH_EVENTOS_GERENCIAR'
    | 'QUALIDADE_CONSULTAR'
    | 'QUALIDADE_INSPECIONAR'
    | 'QUALIDADE_NAO_CONFORMIDADE_GERENCIAR';

export type ApiResult<T> = { success: boolean; data?: T; error?: ApiError };
export type ValidationError = { field: string; message: string };
export type ApiBusinessError = { code: string; message: string };
export type AspNetValidationError = { type: string; title: string; status: number; errors: Record<string, string[]>; traceId: string };
export type ApiError = { code?: string; message: string; details?: string; validationErrors?: ValidationError[]; fieldErrors?: Record<string, string[]>; status?: number; traceId?: string };
export type PagedResult<T> = { items: T[]; page: number; pageSize: number; totalItems: number; totalPages: number };
export type SelectOption<TValue = string | number | boolean | null> = { label: string; value: TValue; disabled?: boolean };

export type LoginResponse = {
    usuarioId: Guid;
    nome: string;
    email: string;
    empresaId: Guid;
    filialId: Guid | null;
    accessToken: string;
    accessTokenExpiraEm: IsoDateTime;
    refreshToken: string;
    refreshTokenExpiraEm: IsoDateTime;
    permissoes: PermissionCode[];
};

export type RefreshTokenResponse = {
    accessToken: string;
    accessTokenExpiraEm: IsoDateTime;
    refreshToken: string;
    refreshTokenExpiraEm: IsoDateTime;
    permissoes: PermissionCode[];
};

export type CurrentUser = { id: Guid; nome: string; email: string; empresaId?: Guid; filialId?: Guid | null; permissoes: PermissionCode[] };
export type AuthTokens = { accessToken: string; accessTokenExpiraEm?: IsoDateTime; refreshToken: string; refreshTokenExpiraEm?: IsoDateTime; expiresAt?: IsoDateTime };
export type AuthSession = AuthTokens & { user: CurrentUser; sessionStartedAt?: IsoDateTime; lastActivityAt?: IsoDateTime };

export type AuditInfo = { criadoPor?: string; criadoEm?: IsoDateTime; alteradoPor?: string; alteradoEm?: IsoDateTime; motivo?: string };
export type StatusHistoryItem = { id: Guid | string; statusAnterior?: string | number; statusNovo: string | number; motivo?: string; usuario?: string; criadoEm: IsoDateTime };
export type BaseOperationalRecord = { id: Guid; codigo?: string; status?: EntityStatus | number | string; empresaId?: Guid; filialId?: Guid | null; auditoria?: AuditInfo; historicoStatus?: StatusHistoryItem[] };

export type Empresa = BaseOperationalRecord & { razaoSocial: string; nomeFantasia?: string | null; documento: string; inscricaoEstadual?: string | null; inscricaoMunicipal?: string | null; createdAt?: IsoDateTime };
export type Filial = BaseOperationalRecord & { empresaId: Guid; nome: string; documento: string; inscricaoEstadual?: string | null; inscricaoMunicipal?: string | null };
export type Setor = BaseOperationalRecord & { empresaId: Guid; filialId?: Guid | null; nome: string; descricao?: string | null };
export type Cargo = BaseOperationalRecord & { empresaId: Guid; filialId?: Guid | null; setorId?: Guid | null; nome: string; descricao?: string | null; nivelHierarquico: number };
export type CentroCusto = BaseOperationalRecord & { empresaId: Guid; filialId?: Guid | null; codigo: string; nome: string; descricao?: string | null };

export type Pessoa = BaseOperationalRecord & { tipoPessoa: TipoPessoa; nomeRazaoSocial: string; nomeFantasia?: string | null; documento: string; inscricaoEstadual?: string | null; inscricaoMunicipal?: string | null; observacao?: string | null };
export type Cliente = BaseOperationalRecord & { pessoaId: Guid; codigo: string; limiteCredito: number; creditoBloqueado: boolean; motivoBloqueioCredito?: string | null; observacao?: string | null };
export type Fornecedor = BaseOperationalRecord & { pessoaId: Guid; codigo: string; observacao?: string | null };

export type Produto = BaseOperationalRecord & { codigo: string; descricao: string; descricaoComercial?: string | null; tipoProduto: TipoProduto; unidadeMedidaId: Guid; categoriaProdutoId?: Guid | null; marcaId?: Guid | null; precoVendaBase: number; custoReferencial: number; controlaEstoque: boolean; permiteVenda: boolean; permiteCompra: boolean; ncm?: string | null; cest?: string | null; origemMercadoriaCodigo?: string | null; tipoItemFiscal?: TipoItemFiscal | null; unidadeTributavelId?: Guid | null; codigoFiscalExterno?: string | null; observacao?: string | null; codigosBarras?: CodigoBarrasProduto[]; fornecedores?: ProdutoFornecedor[] };
export type CategoriaProduto = BaseOperationalRecord & { codigo: string; nome: string; descricao?: string | null };
export type UnidadeMedida = BaseOperationalRecord & { sigla: string; descricao: string; casasDecimais: number; permiteFracionado: boolean };
export type Marca = BaseOperationalRecord & { nome: string; descricao?: string | null };
export type CodigoBarrasProduto = { id?: Guid; codigo: string; descricao?: string | null; principal: boolean };
export type ProdutoFornecedor = { id?: Guid; fornecedorId: Guid; codigoFornecedor?: string | null; descricaoFornecedor?: string | null; principal: boolean };

export type EstoqueSaldo = BaseOperationalRecord & { produtoId: Guid; localEstoqueId: Guid; quantidadeAtual: number; quantidadeReservada: number; quantidadeDisponivel: number };
export type MovimentoEstoque = BaseOperationalRecord & { produtoId: Guid; localEstoqueId: Guid; tipoMovimento?: TipoMovimentoEstoque | number; quantidade: number; origemModulo?: string; origemId?: Guid | null; documento?: string | null; motivo?: string | null; criadoEm?: IsoDateTime };
export type LocalEstoque = BaseOperationalRecord & { codigo: string; nome: string; descricao?: string | null };
export type ReservaEstoque = BaseOperationalRecord & { produtoId: Guid; localEstoqueId: Guid; quantidade: number; origemModulo: string; origemId?: Guid | null; observacao?: string | null; statusReserva?: StatusReservaEstoque | number };
export type Inventario = BaseOperationalRecord & { codigo: string; localEstoqueId: Guid; descricao?: string | null; statusInventario?: StatusInventario | number; itens?: ItemInventario[] };
export type ItemInventario = { id?: Guid; produtoId: Guid; quantidadeContada: number; observacao?: string | null };

export type PedidoVenda = BaseOperationalRecord & { numero: string; clienteId: Guid; dataEmissao: IsoDateTime; dataPrevisaoEntrega?: IsoDateTime | null; tipo: TipoPedidoVenda; statusPedido: StatusPedidoVenda; valorProdutos: number; valorDesconto: number; valorTotal: number; observacao?: string | null; motivoCancelamento?: string | null; aprovadoEm?: IsoDateTime | null; canceladoEm?: IsoDateTime | null; faturadoEm?: IsoDateTime | null; itens: ItemPedidoVenda[] };
export type ItemPedidoVenda = { id: Guid; produtoId: Guid; localEstoqueId?: Guid | null; quantidade: number; valorUnitario: number; valorDesconto: number; valorTotal?: number; observacao?: string | null };

export type ContaReceber = BaseOperationalRecord & { clienteId: Guid; documento: string; origem: OrigemFinanceira; origemId?: Guid | null; dataEmissao: IsoDateTime; observacao?: string | null; valorTotal?: number; saldo?: number; statusConta?: StatusContaFinanceira | number; parcelas?: ParcelaReceber[]; recebimentos?: Recebimento[] };
export type ParcelaReceber = { id: Guid; numero: number; vencimento: IsoDateTime; valor: number; saldo?: number; status?: StatusParcelaFinanceira | number };
export type Recebimento = { id: Guid; parcelaId: Guid; formaPagamentoId: Guid; dataRecebimento: IsoDateTime; valorRecebido: number };
export type ContaPagar = BaseOperationalRecord & { fornecedorId: Guid; documento: string; origem: OrigemFinanceira; origemId?: Guid | null; dataEmissao: IsoDateTime; observacao?: string | null; valorTotal?: number; saldo?: number; statusConta?: StatusContaFinanceira | number; parcelas?: ParcelaPagar[]; pagamentos?: Pagamento[] };
export type ParcelaPagar = { id: Guid; numero: number; vencimento: IsoDateTime; valor: number; saldo?: number; status?: StatusParcelaFinanceira | number };
export type Pagamento = { id: Guid; parcelaId: Guid; formaPagamentoId: Guid; dataPagamento: IsoDateTime; valorPago: number };
export type FormaPagamento = BaseOperationalRecord & { codigo: string; nome: string; permiteRecebimento: boolean; permitePagamento: boolean };
export type CondicaoPagamento = BaseOperationalRecord & { codigo: string; nome: string; quantidadeParcelas: number; intervaloDias: number; permiteEntrada: boolean };

export type PedidoCompra = BaseOperationalRecord & { numero: string; fornecedorId: Guid; dataEmissao: IsoDateTime; dataPrevisaoEntrega?: IsoDateTime | null; condicaoPagamentoId?: Guid | null; statusPedido: StatusPedidoCompra; valorProdutos: number; valorDesconto: number; valorTotal: number; observacao?: string | null; itens: ItemPedidoCompra[] };
export type ItemPedidoCompra = { id: Guid; produtoId: Guid; localEstoqueId?: Guid | null; quantidade: number; valorUnitario: number; valorDesconto: number; valorTotal?: number; observacao?: string | null };

export type AuditoriaEvento = { id: Guid; modulo: string; entidade: string; entidadeId: Guid; acao: number; descricao: string; usuarioId: Guid; empresaId: Guid; filialId?: Guid | null; criadoEm: IsoDateTime };
