import {
    AcaoRetomadaReversaoLeg,
    EstadoLegIntegracaoFaturamento,
    FaturamentoLegResponse,
    FaturamentoResponse,
    LegIntegracaoFaturamento,
    ProntidaoEtapaConhecida,
    ProntidaoRecursoConhecido,
    StatusFaturamento,
    TipoDocumentoConfirmarFaturamento,
    TipoDocumentoFiscal,
    TipoOcorrenciaFaturamento
} from '@/features/faturamento/types/faturamento.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

export const statusFaturamentoLabel = (value: number) => {
    const map: Record<number, string> = {
        [StatusFaturamento.Rascunho]: 'Rascunho',
        [StatusFaturamento.PendenteFiscal]: 'Pendente fiscal',
        [StatusFaturamento.FiscalAutorizado]: 'Fiscal autorizado',
        [StatusFaturamento.EstoqueProcessado]: 'Estoque processado',
        [StatusFaturamento.Faturado]: 'Faturado',
        [StatusFaturamento.Cancelado]: 'Cancelado',
        [StatusFaturamento.Erro]: 'Erro'
    };
    return map[n(value)] ?? String(value);
};

export const statusFaturamentoSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusFaturamento.Faturado:
            return 'success';
        case StatusFaturamento.Cancelado:
        case StatusFaturamento.Erro:
            return 'danger';
        case StatusFaturamento.Rascunho:
            return 'info';
        default:
            return 'warning';
    }
};

export const statusFaturamentoOptions = [
    { label: 'Todas as etapas', value: null },
    { label: 'Rascunho', value: StatusFaturamento.Rascunho },
    { label: 'Pendente fiscal', value: StatusFaturamento.PendenteFiscal },
    { label: 'Fiscal autorizado', value: StatusFaturamento.FiscalAutorizado },
    { label: 'Estoque processado', value: StatusFaturamento.EstoqueProcessado },
    { label: 'Faturado', value: StatusFaturamento.Faturado },
    { label: 'Cancelado', value: StatusFaturamento.Cancelado },
    { label: 'Erro', value: StatusFaturamento.Erro }
];

// D94: só as 2 opções que o Confirmar aceita (`FaturamentoValidators.cs:20-21`), no lugar de 6.
export const tipoDocumentoOptions: { label: string; value: TipoDocumentoConfirmarFaturamento }[] = [
    { label: 'NF-e', value: TipoDocumentoFiscal.NFe },
    { label: 'NFC-e', value: TipoDocumentoFiscal.NFCe }
];

export const tipoOcorrenciaLabel = (value: number) => {
    const map: Record<number, string> = {
        [TipoOcorrenciaFaturamento.Informativa]: 'Informativa',
        [TipoOcorrenciaFaturamento.Alerta]: 'Alerta',
        [TipoOcorrenciaFaturamento.Erro]: 'Erro'
    };
    return map[n(value)] ?? String(value);
};

export const tipoOcorrenciaSeverity = (value: number): Severity => {
    switch (n(value)) {
        case TipoOcorrenciaFaturamento.Erro:
            return 'danger';
        case TipoOcorrenciaFaturamento.Alerta:
            return 'warning';
        default:
            return 'info';
    }
};

// Transições de UI (backend é autoridade final).
export const podeConfirmar = (etapa: number) => ![StatusFaturamento.Faturado, StatusFaturamento.Cancelado].includes(n(etapa));
export const podeCancelar = (etapa: number) => n(etapa) !== StatusFaturamento.Cancelado;

// legFaturamentoLabel (D25): catálogo fixo dos 6 legs, na ordem de LegIntegracaoFaturamento.
export const legFaturamentoLabel = (value: number) => {
    const map: Record<number, string> = {
        [LegIntegracaoFaturamento.GerarNotaFiscal]: 'Gerar nota fiscal',
        [LegIntegracaoFaturamento.GerarXmlEnvio]: 'Gerar XML de envio',
        [LegIntegracaoFaturamento.AssinarXml]: 'Assinar XML',
        [LegIntegracaoFaturamento.TransmitirAutorizarSefaz]: 'Transmitir e autorizar na SEFAZ',
        [LegIntegracaoFaturamento.BaixarEstoque]: 'Baixar estoque',
        [LegIntegracaoFaturamento.GerarContaReceber]: 'Gerar conta a receber'
    };
    return map[n(value)] ?? `Leg desconhecido (${value})`;
};

// estadoLegLabel/estadoLegSeverity (D1/AC-3): estado desconhecido nunca vira "Revertido".
export const estadoLegLabel = (value: number) => {
    const map: Record<number, string> = {
        [EstadoLegIntegracaoFaturamento.Integrado]: 'Integrado',
        [EstadoLegIntegracaoFaturamento.Falhou]: 'Falhou',
        [EstadoLegIntegracaoFaturamento.Revertido]: 'Revertido',
        [EstadoLegIntegracaoFaturamento.EmReversao]: 'Em reversão'
    };
    return map[n(value)] ?? `Estado desconhecido (${value})`;
};

export const estadoLegSeverity = (value: number): Severity => {
    switch (n(value)) {
        case EstadoLegIntegracaoFaturamento.Integrado:
            return 'success';
        case EstadoLegIntegracaoFaturamento.Falhou:
            return 'danger';
        case EstadoLegIntegracaoFaturamento.Revertido:
            return 'info';
        case EstadoLegIntegracaoFaturamento.EmReversao:
            return 'warning';
        default:
            return null;
    }
};

export const acaoRetomadaOptions = [
    { label: 'Reaplicar a inversa', value: AcaoRetomadaReversaoLeg.ReaplicarInversa },
    { label: 'Declarar efeito desfeito', value: AcaoRetomadaReversaoLeg.DeclararEfeitoDesfeito }
];

const LEGS_CATALOGO: LegIntegracaoFaturamento[] = [
    LegIntegracaoFaturamento.GerarNotaFiscal,
    LegIntegracaoFaturamento.GerarXmlEnvio,
    LegIntegracaoFaturamento.AssinarXml,
    LegIntegracaoFaturamento.TransmitirAutorizarSefaz,
    LegIntegracaoFaturamento.BaixarEstoque,
    LegIntegracaoFaturamento.GerarContaReceber
];

export type LinhaLegFaturamento = {
    key: string;
    leg: number;
    legLabel: string;
    registro: FaturamentoLegResponse | null;
};

// montarLinhasDeLegs (D25): sempre 6 linhas, na ordem 1 a 6; "Sem registro" quando o leg não veio;
// legs fora do catálogo (valor desconhecido) viram linha extra, no fim.
export const montarLinhasDeLegs = (legs?: FaturamentoLegResponse[] | null): LinhaLegFaturamento[] => {
    const registros = legs ?? [];
    const porLeg = new Map<number, FaturamentoLegResponse>();
    registros.forEach((registro) => porLeg.set(n(registro.leg), registro));

    const fixas: LinhaLegFaturamento[] = LEGS_CATALOGO.map((leg) => ({
        key: `leg-${leg}`,
        leg,
        legLabel: legFaturamentoLabel(leg),
        registro: porLeg.get(leg) ?? null
    }));

    const extras: LinhaLegFaturamento[] = registros
        .filter((registro) => !LEGS_CATALOGO.includes(n(registro.leg)))
        .map((registro) => ({
            key: `leg-extra-${registro.id}`,
            leg: n(registro.leg),
            legLabel: legFaturamentoLabel(registro.leg),
            registro
        }));

    return [...fixas, ...extras];
};

// confirmacaoBloqueadaPorReversao (D23): o backend já recusa confirmar com leg EmReversao.
export const confirmacaoBloqueadaPorReversao = (faturamento: FaturamentoResponse) => Boolean(faturamento.possuiLegEmReversao);

export const cancelamentoBloqueadoPorReversao = (faturamento: FaturamentoResponse) => Boolean(faturamento.possuiLegEmReversao);

export const cancelamentoBloqueadoTooltip = (podeRetomarReversao: boolean) =>
    podeRetomarReversao
        ? 'Há um leg em reversão. Retome a reversão antes de cancelar o faturamento.'
        : 'Há um leg em reversão. É necessário um operador com a permissão FATURAMENTO_RETOMAR_REVERSAO para retomá-la antes de cancelar o faturamento.';

// legQueParou (D93): o primeiro leg, na ordem do catálogo, cujo registro está `Falhou`. Reusa as linhas de
// `montarLinhasDeLegs` (D25/D30), a mesma fonte da tabela "Legs de integração" do detalhe.
export const legQueParou = (legs?: FaturamentoLegResponse[] | null): LinhaLegFaturamento | null =>
    montarLinhasDeLegs(legs).find((linha) => linha.registro !== null && n(linha.registro.estado) === EstadoLegIntegracaoFaturamento.Falhou) ?? null;

// D113/AJ-37 (emenda QA-01): o envio recusado LOCALMENTE grava `RECUSA_LOCAL` só na nota (`NotaFiscal.CodigoRejeicao`).
// O motivo do leg 4 e o alerta do Confirmar dizem "Nota fiscal rejeitada pela SEFAZ. Código: {cStat}..." mesmo na
// recusa local (backend `ConfirmarFaturamentoUseCase.cs:275-277`). Por isso o sinal primário é o `codigoRejeicao` da nota,
// lido pela tela (`useCodigoRejeicaoNota`); a substring no motivo é só segundo sinal, para quando o backend corrigir o texto.
// Sem o código da nota (sem permissão, leitura falhando ou carregando), o motivo sai como veio, sem afirmar recusa local.
export const CODIGO_RECUSA_LOCAL = 'RECUSA_LOCAL';
export const ehRecusaLocal = (motivo?: string | null) => typeof motivo === 'string' && motivo.includes(CODIGO_RECUSA_LOCAL);

/** Primeiro sinal: o código gravado na nota. */
export const notaRecusadaLocalmente = (codigoRejeicaoNota?: string | null) => codigoRejeicaoNota === CODIGO_RECUSA_LOCAL;

const PREFIXO_REJEICAO_SEFAZ = 'Nota fiscal rejeitada pela SEFAZ';

/** O leg 4 (transmissão) está em `Falhou`? Só então vale ler a nota. */
export const leg4Falhou = (legs?: FaturamentoLegResponse[] | null) =>
    (legs ?? []).some((leg) => n(leg.leg) === LegIntegracaoFaturamento.TransmitirAutorizarSefaz && n(leg.estado) === EstadoLegIntegracaoFaturamento.Falhou);

// Motivo do leg para exibição: no leg 4, recusa local troca o texto "rejeitada pela SEFAZ" pelo da recusa local.
export const motivoLegExibicao = (leg: number, motivo?: string | null, codigoRejeicaoNota?: string | null) =>
    n(leg) === LegIntegracaoFaturamento.TransmitirAutorizarSefaz && (notaRecusadaLocalmente(codigoRejeicaoNota) || ehRecusaLocal(motivo))
        ? FATURAMENTO_RESULTADO.recusaLocal
        : motivo?.trim() || null;

// Alerta devolvido pelo Confirmar: o do leg 4 repete o motivo do leg. Com a nota recusada localmente, o alerta de
// "rejeitada pela SEFAZ" recebe o texto da recusa local; sem ela, só a substring (segundo sinal) troca o texto.
export const alertaExibicao = (alerta: string, codigoRejeicaoNota?: string | null) =>
    ehRecusaLocal(alerta) || (notaRecusadaLocalmente(codigoRejeicaoNota) && alerta.trim().startsWith(PREFIXO_REJEICAO_SEFAZ)) ? FATURAMENTO_RESULTADO.recusaLocal : alerta;

// Texto "parou no leg N (rótulo): motivo" -- lê o motivo gravado no leg, sem derivar nada (D23).
export const descricaoLegQueParou = (linha: LinhaLegFaturamento, codigoRejeicaoNota?: string | null) => {
    const posicao = LEGS_CATALOGO.includes(linha.leg) ? `leg ${linha.leg} (${linha.legLabel})` : linha.legLabel;
    const motivo = motivoLegExibicao(linha.leg, linha.registro?.motivo, codigoRejeicaoNota);
    return motivo ? `Parou no ${posicao}: ${motivo}` : `Parou no ${posicao}, sem motivo registrado. Veja as ocorrências.`;
};

export type ResultadoConfirmacaoResumo = {
    severity: 'success' | 'error' | 'info';
    titulo: string;
    detalhe: string;
    concluido: boolean;
};

// D93: o resultado sai da etapa REAL devolvida pelo Confirmar (`ConfirmarFaturamentoUseCase.cs:367-374`).
// "Faturamento confirmado" só com etapa Faturado; HTTP 200 com etapa Erro nunca vira sucesso.
export const resumoResultadoConfirmacao = (faturamento: FaturamentoResponse, codigoRejeicaoNota?: string | null): ResultadoConfirmacaoResumo => {
    const etapa = n(faturamento.etapa);
    const parou = legQueParou(faturamento.legs);

    if (etapa === StatusFaturamento.Faturado) {
        return { severity: 'success', titulo: FATURAMENTO_RESULTADO.tituloFaturado, detalhe: FATURAMENTO_RESULTADO.detalheFaturado, concluido: true };
    }

    if (etapa === StatusFaturamento.Erro) {
        return { severity: 'error', titulo: FATURAMENTO_RESULTADO.tituloErro, detalhe: parou ? descricaoLegQueParou(parou, codigoRejeicaoNota) : FATURAMENTO_RESULTADO.detalheErroSemLeg, concluido: false };
    }

    return {
        severity: 'info',
        titulo: `${FATURAMENTO_RESULTADO.tituloParcialPrefixo} ${statusFaturamentoLabel(etapa)}`,
        detalhe: parou ? descricaoLegQueParou(parou, codigoRejeicaoNota) : FATURAMENTO_RESULTADO.detalheParcial,
        concluido: false
    };
};

export const FATURAMENTO_RESULTADO = {
    cardTitulo: 'Resultado da última confirmação',
    tituloFaturado: 'Faturamento confirmado',
    detalheFaturado: 'O faturamento chegou à etapa Faturado.',
    tituloErro: 'Faturamento terminou em erro',
    detalheErroSemLeg: 'O backend devolveu a etapa Erro sem leg em falha registrado. Veja as ocorrências.',
    tituloParcialPrefixo: 'Faturamento parou na etapa',
    detalheParcial: 'O faturamento não chegou à etapa Faturado. Veja os legs de integração abaixo.',
    // D93 (`Faturamento.cs:117-123`): tentar de novo é confirmar ESTE faturamento, não preparar outro.
    proximoPasso: 'Próximo passo: corrija a causa e use "Confirmar" de novo neste mesmo faturamento. Não prepare outro faturamento para o pedido.',
    alertasTitulo: 'Alertas devolvidos pelo backend',
    correlationIdRotulo: 'ID de correlação enviado',
    correlationIdAjuda: 'Informe este identificador ao suporte ao investigar a transmissão.',
    etapaRotulo: 'Etapa devolvida',
    confirmarDeNovo: 'Confirmar de novo',
    // Sinal persistente para quem abre o detalhe depois (sem resposta de confirmação na tela).
    persistentePrefixo: 'O faturamento está em Erro.',
    // D113/AJ-37: selo do servidor com SEFAZ simulada (health `fiscal.mock`) e texto da recusa local (leg 4).
    seloSefazSimulada: 'SEFAZ simulada',
    seloSefazSimuladaDetalhe: 'O servidor está com a SEFAZ simulada: esta nota não foi autorizada por uma SEFAZ real.',
    recusaLocal: 'Recusado no servidor antes de sair: configuração do servidor, não rejeição da SEFAZ. Nada foi transmitido; avise quem administra o servidor.'
} as const;

export const FATURAMENTO_CONFIRMAR = {
    titulo: 'Confirmar faturamento (dados fiscais)',
    instrucao: 'Informe os dados fiscais para gerar e transmitir a nota. Campos obrigatórios marcados com *.',
    // FT-21 (D97): sem natureza e sem endereço fiscal do cliente, nenhum faturamento conclui nesta versão.
    preRequisitos:
        'Para concluir, o faturamento precisa de vários cadastros fiscais em dia (natureza de operação, endereço fiscal do cliente, emitente, série, entre outros). O checklist de prontidão abaixo lista o que falta, com link para a tela de cada cadastro; o Confirmar só libera quando nada estiver pendente.',
    grupoDocumento: 'Documento',
    grupoNatureza: 'Natureza de operação',
    grupoTransmissao: 'Transmissão',
    grupoContaReceber: 'Conta a receber',
    grupoExcecao: 'Parâmetros de exceção',
    ajudaCfop: 'O CFOP de cada item é derivado da natureza, do par de UFs e do tipo do item; não é informado aqui.',
    ajudaUnidade: 'Usada só se o produto não tiver unidade no cadastro.',
    correlationIdRotulo: 'ID de correlação',
    correlationIdAjuda: 'Gerado automaticamente a cada abertura; reenviado só se a chamada anterior não tiver resposta.',
    rotuloConfirmar: 'Confirmar',
    // D113: com avaliacao = Retomada o mesmo botão passa a "Retomar" (reenvia o Confirmar com os mesmos parâmetros).
    rotuloRetomar: 'Retomar',
    indisponivelPrefixo: 'Confirmar indisponível:',
    erroTitulo: 'O backend recusou a confirmação.'
} as const;

// D113: prontidão. A rota de cada recurso mora em `prontidaoRecursos.ts`; aqui só o texto.
export const FATURAMENTO_PRONTIDAO = {
    titulo: 'Prontidão para faturar',
    descricaoLeitura: 'Conferência feita pelo backend com o pedido deste faturamento. Natureza, série e número só entram na conferência quando você informa no Confirmar.',
    consultando: 'Conferindo o que falta cadastrar…',
    aguardandoDigitacao: 'Aguardando você terminar de preencher para conferir…',
    semPedido: 'Este faturamento não informa o pedido de venda; a prontidão não pode ser conferida.',
    pronto: 'Nada pendente: o backend informa que o faturamento está pronto para confirmar.',
    prontoLeitura: 'Nada pendente com os dados do pedido. Natureza, série e número ainda são conferidos no Confirmar.',
    pendentes: (quantidade: number) => (quantidade === 1 ? '1 pendência a resolver antes de confirmar' : `${quantidade} pendências a resolver antes de confirmar`),
    encadeadas: 'Algumas pendências só aparecem depois que a anterior é resolvida. Use "Reconferir" após corrigir.',
    reconferir: 'Reconferir',
    informeNoConfirmar: 'informe no Confirmar',
    erroTitulo: 'Não foi possível conferir a prontidão.',
    erroBloqueio: 'O Confirmar fica bloqueado até a conferência responder. Use "Reconferir".',
    erroNaoEncontrado: 'O pedido deste faturamento não foi encontrado neste contexto. O Confirmar fica bloqueado.',
    retomadaTexto: 'Este faturamento já tem etapas integradas. Só faturamento, estoque e financeiro são reavaliados; o que já foi integrado não se repete.',
    semPermissaoLink: (descricao: string) => `Peça a quem tem acesso a ${descricao} para corrigir.`,
    confirmarBloqueado: 'Confirmar indisponível: resolva as pendências da prontidão.',
    confirmarAguardando: 'Confirmar indisponível: aguardando a conferência da prontidão.',
    confirmarErro: 'Confirmar indisponível: a prontidão não pôde ser conferida.'
} as const;

export const PRONTIDAO_ETAPA_ROTULO: Record<ProntidaoEtapaConhecida, string> = {
    Pedido: 'Pedido de venda',
    Faturamento: 'Faturamento',
    Cliente: 'Cliente',
    Emitente: 'Emitente (empresa e filial)',
    ConfiguracaoFiscal: 'Configuração fiscal',
    Certificado: 'Certificado digital',
    Serie: 'Série e número',
    Natureza: 'Natureza de operação',
    Produto: 'Produtos',
    Destinatario: 'Destinatário',
    RegraFiscal: 'Regra fiscal',
    Estoque: 'Estoque',
    Financeiro: 'Financeiro'
};

// Rótulo do link que leva à tela que corrige a pendência.
export const PRONTIDAO_RECURSO_ROTULO: Record<ProntidaoRecursoConhecido, string> = {
    Empresas: 'Abrir Empresas e filiais',
    ConfiguracaoFiscal: 'Abrir Configuração de emissão',
    Certificados: 'Abrir Configuração de emissão (certificados)',
    SeriesFiscais: 'Abrir Séries fiscais',
    NaturezasOperacao: 'Abrir Naturezas de operação',
    Produtos: 'Abrir Produtos',
    Pessoas: 'Abrir Pessoas',
    RegrasFiscais: 'Abrir Regras fiscais',
    Estoque: 'Abrir Entradas de estoque',
    CondicoesPagamento: 'Abrir Condições de pagamento',
    PedidoVenda: 'Abrir Pedidos de venda',
    Faturamento: 'Abrir Faturamentos'
};

export const prontidaoEtapaRotulo = (etapa: string) => (Object.prototype.hasOwnProperty.call(PRONTIDAO_ETAPA_ROTULO, etapa) ? PRONTIDAO_ETAPA_ROTULO[etapa as ProntidaoEtapaConhecida] : etapa);

export const FATURAMENTO_PREPARAR = {
    titulo: 'Preparar faturamento',
    // D95 (`FaturamentoRepository.cs:21-25`): reaproveita só o faturamento que não está em Erro nem Cancelado.
    instrucao:
        'Prepara o faturamento de um pedido de venda aprovado. Se o pedido já tiver faturamento em andamento, ele é reaproveitado; faturamento em Erro ou Cancelado não é reaproveitado.',
    pedidoRotulo: 'Pedido de venda aprovado *',
    pedidoVazio: 'Nenhum pedido aprovado encontrado para a empresa.',
    semEmpresa: 'Selecione a empresa no filtro da tela para listar os pedidos aprovados.',
    consultandoExistentes: 'Consultando faturamentos existentes do pedido…',
    existenteAtivo: (etapa: string) => `Este pedido já tem um faturamento em andamento (etapa ${etapa}). Preparar reaproveita esse faturamento.`,
    existenteErro: (quantidade: number) =>
        `Este pedido já tem ${quantidade} faturamento(s) em Erro. Preparar de novo cria outro faturamento e não reaproveita os anteriores. Para tentar de novo, abra o mais recente e confirme.`,
    abrirExistente: 'Abrir o faturamento em Erro mais recente',
    abrirAtivo: 'Abrir o faturamento em andamento',
    observacaoRotulo: 'Observação'
} as const;

export const FATURAMENTO_LISTA = {
    semEmpresaTitulo: 'Selecione uma empresa',
    semEmpresaDescricao: 'A lista de faturamentos é por empresa. Escolha a empresa no filtro acima.',
    vazioTitulo: 'Nenhum faturamento',
    vazioDescricao: 'Prepare um faturamento a partir de um pedido de venda aprovado.',
    pedidoForaDaLista: 'Pedido fora da lista carregada'
} as const;

export const FATURAMENTO_DETALHE = {
    pedidoRotulo: 'Pedido de venda',
    clienteRotulo: 'Cliente',
    clienteNaoCarregado: 'Cliente não carregado',
    contaReceberGerada: 'Gerada',
    abrirPedido: 'Abrir pedido'
} as const;

// Rótulo do pedido no combo e na lista: número e total, sem GUID.
export const pedidoVendaRotulo = (pedido: { numero: string; valorTotal?: number | null }, formatarValor: (valor: number) => string) =>
    [pedido.numero, `Total ${formatarValor(Number(pedido.valorTotal ?? 0))}`].filter(Boolean).join(' • ');
