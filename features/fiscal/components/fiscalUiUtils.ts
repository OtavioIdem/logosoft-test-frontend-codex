import { OrigemNotaFiscal, SelectOption, StatusNotaFiscal, TipoDocumentoFiscal, TipoEventoFiscal, TipoOperacaoFiscal, TipoServicoTransmissaoFiscal, TipoXmlFiscal } from '@/types/erp';
import { AcoesResumoFiscalResponse, NotaFiscalResponse, ResumoOperacionalNotaFiscalResponse, WorkflowOperacionalNotaFiscalResponse } from '@/features/fiscal/types/fiscal.types';

export const formatFiscalMoney = (value?: number | null) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0));

export const formatFiscalDate = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date) : '-';
};

export const tipoDocumentoFiscalLabel = (value?: number | string | null) => {
    const labels: Record<number, string> = {
        [TipoDocumentoFiscal.NFe]: 'NF-e',
        [TipoDocumentoFiscal.NFCe]: 'NFC-e',
        [TipoDocumentoFiscal.NFSe]: 'NFS-e',
        [TipoDocumentoFiscal.CTe]: 'CT-e',
        [TipoDocumentoFiscal.MDFe]: 'MDF-e',
        [TipoDocumentoFiscal.Outro]: 'Outro'
    };
    return labels[Number(value)] ?? String(value ?? '-');
};

export const tipoOperacaoFiscalLabel = (value?: number | string | null) => {
    const labels: Record<number, string> = {
        [TipoOperacaoFiscal.Venda]: 'Venda',
        [TipoOperacaoFiscal.Compra]: 'Compra',
        [TipoOperacaoFiscal.Devolucao]: 'Devolução',
        [TipoOperacaoFiscal.Remessa]: 'Remessa',
        [TipoOperacaoFiscal.Transferencia]: 'Transferência',
        [TipoOperacaoFiscal.Bonificacao]: 'Bonificação',
        [TipoOperacaoFiscal.Servico]: 'Serviço',
        [TipoOperacaoFiscal.Transporte]: 'Transporte',
        [TipoOperacaoFiscal.Outro]: 'Outro'
    };
    return labels[Number(value)] ?? String(value ?? '-');
};

export const origemNotaFiscalLabel = (value?: number | string | null) => {
    const labels: Record<number, string> = {
        [OrigemNotaFiscal.Manual]: 'Manual',
        [OrigemNotaFiscal.PedidoVenda]: 'Pedido de venda',
        [OrigemNotaFiscal.PedidoCompra]: 'Pedido de compra',
        [OrigemNotaFiscal.Servico]: 'Serviço',
        [OrigemNotaFiscal.Importacao]: 'Importação'
    };
    return labels[Number(value)] ?? String(value ?? '-');
};

export const statusNotaFiscalLabel = (value?: number | string | null) => {
    const labels: Record<number, string> = {
        [StatusNotaFiscal.Rascunho]: 'Rascunho',
        [StatusNotaFiscal.Validada]: 'Validada',
        [StatusNotaFiscal.Assinada]: 'Assinada',
        [StatusNotaFiscal.Transmitida]: 'Transmitida',
        [StatusNotaFiscal.Autorizada]: 'Autorizada',
        [StatusNotaFiscal.Rejeitada]: 'Rejeitada',
        [StatusNotaFiscal.Cancelada]: 'Cancelada',
        [StatusNotaFiscal.Inutilizada]: 'Inutilizada',
        [StatusNotaFiscal.Denegada]: 'Denegada',
        [StatusNotaFiscal.Contingencia]: 'Contingência'
    };
    return labels[Number(value)] ?? String(value ?? '-');
};

export const statusNotaFiscalTagValue = (value?: number | string | null) => {
    const labels: Record<number, string> = {
        [StatusNotaFiscal.Rascunho]: 'RASCUNHO',
        [StatusNotaFiscal.Validada]: 'VALIDADA',
        [StatusNotaFiscal.Assinada]: 'ASSINADA',
        [StatusNotaFiscal.Transmitida]: 'TRANSMITIDA',
        [StatusNotaFiscal.Autorizada]: 'APROVADO',
        [StatusNotaFiscal.Rejeitada]: 'REJEITADA',
        [StatusNotaFiscal.Cancelada]: 'CANCELADO',
        [StatusNotaFiscal.Inutilizada]: 'INUTILIZADA',
        [StatusNotaFiscal.Denegada]: 'DENEGADA',
        [StatusNotaFiscal.Contingencia]: 'CONTINGENCIA'
    };
    return labels[Number(value)] ?? String(value ?? '-');
};

export const tipoXmlFiscalLabel = (value?: number | string | null) => {
    const labels: Record<number, string> = {
        [TipoXmlFiscal.Envio]: 'Envio',
        [TipoXmlFiscal.Autorizado]: 'Autorizado',
        [TipoXmlFiscal.Cancelamento]: 'Cancelamento',
        [TipoXmlFiscal.CartaCorrecao]: 'Carta de correção',
        [TipoXmlFiscal.Inutilizacao]: 'Inutilização',
        [TipoXmlFiscal.RetornoAutorizador]: 'Retorno autorizador'
    };
    return labels[Number(value)] ?? String(value ?? '-');
};

export const tipoEventoFiscalLabel = (value?: number | string | null) => {
    const labels: Record<number, string> = {
        [TipoEventoFiscal.Criacao]: 'Criação',
        [TipoEventoFiscal.Validacao]: 'Validação',
        [TipoEventoFiscal.Assinatura]: 'Assinatura',
        [TipoEventoFiscal.Transmissao]: 'Transmissão',
        [TipoEventoFiscal.Autorizacao]: 'Autorização',
        [TipoEventoFiscal.Rejeicao]: 'Rejeição',
        [TipoEventoFiscal.Cancelamento]: 'Cancelamento',
        [TipoEventoFiscal.CartaCorrecao]: 'Carta de correção',
        [TipoEventoFiscal.Inutilizacao]: 'Inutilização',
        [TipoEventoFiscal.ErroIntegracao]: 'Erro de integração',
        [TipoEventoFiscal.CorrecaoRascunho]: 'Correção de rascunho',
        [TipoEventoFiscal.Contingencia]: 'Contingência'
    };
    return labels[Number(value)] ?? String(value ?? '-');
};

const acaoResumo = (resumo?: ResumoOperacionalNotaFiscalResponse | null): AcoesResumoFiscalResponse | null => resumo?.acoes ?? null;
const normalizarCodigoAcao = (codigo?: string | null) => (codigo ?? '').trim().toUpperCase();

export const workflowAcaoHabilitada = (workflow: WorkflowOperacionalNotaFiscalResponse | null | undefined, codigos: string[]): boolean | null => {
    if (!workflow) return null;
    const codigosNormalizados = new Set(codigos.map(normalizarCodigoAcao));
    const acao = workflow.proximasAcoes?.find((item) => codigosNormalizados.has(normalizarCodigoAcao(item.codigo)));
    return acao ? Boolean(acao.habilitada) : false;
};

export const notaPodeEditarItens = (nota?: NotaFiscalResponse | null) => [StatusNotaFiscal.Rascunho, StatusNotaFiscal.Validada].includes(Number(nota?.statusFiscal));
export const notaPodeValidar = (nota?: NotaFiscalResponse | null, resumo?: ResumoOperacionalNotaFiscalResponse | null) => acaoResumo(resumo)?.podeValidar ?? (Number(nota?.statusFiscal) === StatusNotaFiscal.Rascunho && (nota?.itens?.length ?? 0) > 0);
export const notaPodeGerarXml = (nota?: NotaFiscalResponse | null, resumo?: ResumoOperacionalNotaFiscalResponse | null) =>
    acaoResumo(resumo)?.podeGerarXmlEnvio ?? [StatusNotaFiscal.Rascunho, StatusNotaFiscal.Validada].includes(Number(nota?.statusFiscal));
export const notaPodeAssinarXml = (nota?: NotaFiscalResponse | null, resumo?: ResumoOperacionalNotaFiscalResponse | null) => acaoResumo(resumo)?.podeAssinarXmlEnvio ?? Number(nota?.statusFiscal) === StatusNotaFiscal.Validada;
export const notaPodeTransmitir = (nota?: NotaFiscalResponse | null, resumo?: ResumoOperacionalNotaFiscalResponse | null) =>
    acaoResumo(resumo)?.podeTransmitirSefaz ?? [StatusNotaFiscal.Assinada, StatusNotaFiscal.Contingencia].includes(Number(nota?.statusFiscal));
export const notaPodeCancelar = (nota?: NotaFiscalResponse | null, resumo?: ResumoOperacionalNotaFiscalResponse | null) => acaoResumo(resumo)?.podeCancelar ?? Number(nota?.statusFiscal) === StatusNotaFiscal.Autorizada;
export const notaPodeCartaCorrecao = (nota?: NotaFiscalResponse | null, resumo?: ResumoOperacionalNotaFiscalResponse | null) => acaoResumo(resumo)?.podeEmitirCartaCorrecao ?? Number(nota?.statusFiscal) === StatusNotaFiscal.Autorizada;
export const notaPodeGerarDanfe = (nota?: NotaFiscalResponse | null, resumo?: ResumoOperacionalNotaFiscalResponse | null) => acaoResumo(resumo)?.podeGerarDanfe ?? Number(nota?.statusFiscal) === StatusNotaFiscal.Autorizada;
export const notaPodeBaixarEstoque = (resumo?: ResumoOperacionalNotaFiscalResponse | null) => Boolean(resumo?.acoes?.podeBaixarEstoque);
export const notaPodeGerarContaReceber = (resumo?: ResumoOperacionalNotaFiscalResponse | null) => Boolean(resumo?.acoes?.podeGerarContaReceber);
export const notaPodeConsultarProtocolo = (nota?: NotaFiscalResponse | null, workflow?: WorkflowOperacionalNotaFiscalResponse | null) =>
    workflowAcaoHabilitada(workflow, ['CONSULTAR_PROTOCOLO', 'CONSULTAR_RETORNO_AUTORIZACAO']) ?? [StatusNotaFiscal.Transmitida, StatusNotaFiscal.Rejeitada].includes(Number(nota?.statusFiscal));
export const notaPodeHabilitarContingencia = (nota?: NotaFiscalResponse | null, workflow?: WorkflowOperacionalNotaFiscalResponse | null) =>
    workflowAcaoHabilitada(workflow, ['HABILITAR_CONTINGENCIA', 'CONTINGENCIA', 'AVALIAR_CONTINGENCIA']) ??
    [StatusNotaFiscal.Assinada, StatusNotaFiscal.Transmitida, StatusNotaFiscal.Rejeitada, StatusNotaFiscal.Contingencia].includes(Number(nota?.statusFiscal));

export const notaFiscalBloqueiosVisuais = (nota?: NotaFiscalResponse | null): string[] => {
    if (!nota) return [];
    const status = Number(nota.statusFiscal);
    const bloqueios: string[] = [];
    if ((nota.itens?.length ?? 0) === 0) bloqueios.push('Inclua pelo menos um item antes de validar, gerar XML ou transmitir.');
    if ([StatusNotaFiscal.Transmitida, StatusNotaFiscal.Autorizada, StatusNotaFiscal.Cancelada, StatusNotaFiscal.Inutilizada, StatusNotaFiscal.Denegada, StatusNotaFiscal.Contingencia].includes(status))
        bloqueios.push('Itens e impostos não devem ser alterados após transmissão, autorização, cancelamento, inutilização ou denegação.');
    if (status !== StatusNotaFiscal.Autorizada) bloqueios.push('Cancelamento, CC-e e DANFE ficam disponíveis somente após autorização.');
    if (status === StatusNotaFiscal.Rejeitada) bloqueios.push('Nota rejeitada exige fluxo controlado de correção antes de nova emissão.');
    return bloqueios;
};

const SENSITIVE_FISCAL_PATTERN =
    /\b(senha|password|token|secret|segredo|certificado|certificate|thumbprint|conteudoXml|xmlEnvio|xmlEventoAssinado|xmlInutilizacaoAssinado|xmlStatusServico|xmlConsultaAssinado|xmlCancelamento)\b\s*[:=]\s*("[^"]*"|'[^']*'|[^;,&\n\r]*)/gi;
const FISCAL_XML_ROOT_TAGS = 'NFe|nfeProc|infNFe|consStatServ|consSitNFe|evento|inutNFe|CTe|cteProc|MDFe|mdfeProc';
const FISCAL_XML_BLOCK_PATTERN = new RegExp(`<\\s*(${FISCAL_XML_ROOT_TAGS})\\b[^>]*>[\\s\\S]*?<\\/\\s*\\1\\s*>`, 'gi');
const FISCAL_XML_SELF_CLOSING_PATTERN = new RegExp(`<\\s*(?:${FISCAL_XML_ROOT_TAGS})\\b[^>]*\\/\\s*>`, 'gi');
const FISCAL_XML_FRAGMENT_PATTERN = new RegExp(`<\\s*(?:${FISCAL_XML_ROOT_TAGS})\\b[\\s\\S]*`, 'gi');
const GENERIC_XML_BLOCK_PATTERN = /<\s*[A-Za-z_][\w:.-]*\b[^>]*>[\s\S]*?<\/\s*[A-Za-z_][\w:.-]*\s*>/g;
const GENERIC_XML_SELF_CLOSING_PATTERN = /<\s*[A-Za-z_][\w:.-]*\b[^>]*\/\s*>/g;

const maskFiscalXmlBlocks = (value: string) =>
    value
        .replace(FISCAL_XML_BLOCK_PATTERN, '[XML_MASKED]')
        .replace(FISCAL_XML_SELF_CLOSING_PATTERN, '[XML_MASKED]')
        .replace(FISCAL_XML_FRAGMENT_PATTERN, '[XML_MASKED]')
        .replace(GENERIC_XML_BLOCK_PATTERN, '[XML_MASKED]')
        .replace(GENERIC_XML_SELF_CLOSING_PATTERN, '[XML_MASKED]');

export const maskFiscalSensitiveText = (value?: string | null) => {
    if (!value) return '-';
    const masked = maskFiscalXmlBlocks(value)
        .replace(SENSITIVE_FISCAL_PATTERN, (_match, key) => `${key}=[MASKED]`)
        .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [MASKED]')
        .trim();

    if (!masked) return '-';
    return masked.length > 500 ? `${masked.slice(0, 497)}...` : masked;
};

export const resetFiltrosFiscaisPorEmpresa = <T extends { empresaId?: string | null; filialId?: string | null; pessoaId?: string | null; page?: number }>(current: T, empresaId: string | null): T => ({
    ...current,
    page: 1,
    empresaId,
    filialId: null,
    pessoaId: null
});

export const resetFiltrosFiscaisPorFilial = <T extends { filialId?: string | null; pessoaId?: string | null; page?: number }>(current: T, filialId: string | null): T => ({
    ...current,
    page: 1,
    filialId,
    pessoaId: null
});

export const hasFiscalSensitiveContent = (value?: string | null) => {
    if (!value) return false;
    SENSITIVE_FISCAL_PATTERN.lastIndex = 0;
    FISCAL_XML_BLOCK_PATTERN.lastIndex = 0;
    FISCAL_XML_SELF_CLOSING_PATTERN.lastIndex = 0;
    FISCAL_XML_FRAGMENT_PATTERN.lastIndex = 0;
    GENERIC_XML_BLOCK_PATTERN.lastIndex = 0;
    GENERIC_XML_SELF_CLOSING_PATTERN.lastIndex = 0;
    return (
        SENSITIVE_FISCAL_PATTERN.test(value) ||
        FISCAL_XML_BLOCK_PATTERN.test(value) ||
        FISCAL_XML_SELF_CLOSING_PATTERN.test(value) ||
        FISCAL_XML_FRAGMENT_PATTERN.test(value) ||
        GENERIC_XML_BLOCK_PATTERN.test(value) ||
        GENERIC_XML_SELF_CLOSING_PATTERN.test(value) ||
        /Bearer\s+[A-Za-z0-9._~+/=-]+/i.test(value)
    );
};

export const tipoDocumentoFiscalOptions: SelectOption<number>[] = [
    { label: 'NF-e', value: TipoDocumentoFiscal.NFe },
    { label: 'NFC-e', value: TipoDocumentoFiscal.NFCe }
];

export const origemNotaFiscalOptions: SelectOption<number>[] = [
    { label: 'Manual', value: OrigemNotaFiscal.Manual },
    { label: 'Pedido de venda', value: OrigemNotaFiscal.PedidoVenda },
    { label: 'Pedido de compra', value: OrigemNotaFiscal.PedidoCompra },
    { label: 'Serviço', value: OrigemNotaFiscal.Servico },
    { label: 'Importação', value: OrigemNotaFiscal.Importacao }
];

export const statusNotaFiscalOptions: SelectOption<number>[] = [
    { label: 'Rascunho', value: StatusNotaFiscal.Rascunho },
    { label: 'Validada', value: StatusNotaFiscal.Validada },
    { label: 'Assinada', value: StatusNotaFiscal.Assinada },
    { label: 'Transmitida', value: StatusNotaFiscal.Transmitida },
    { label: 'Autorizada', value: StatusNotaFiscal.Autorizada },
    { label: 'Rejeitada', value: StatusNotaFiscal.Rejeitada },
    { label: 'Cancelada', value: StatusNotaFiscal.Cancelada },
    { label: 'Inutilizada', value: StatusNotaFiscal.Inutilizada },
    { label: 'Denegada', value: StatusNotaFiscal.Denegada },
    { label: 'Contingência', value: StatusNotaFiscal.Contingencia }
];

export const tipoOperacaoFiscalOptions: SelectOption<number>[] = [
    { label: 'Venda', value: TipoOperacaoFiscal.Venda },
    { label: 'Compra', value: TipoOperacaoFiscal.Compra },
    { label: 'Devolução', value: TipoOperacaoFiscal.Devolucao },
    { label: 'Remessa', value: TipoOperacaoFiscal.Remessa },
    { label: 'Transferência', value: TipoOperacaoFiscal.Transferencia },
    { label: 'Bonificação', value: TipoOperacaoFiscal.Bonificacao },
    { label: 'Serviço', value: TipoOperacaoFiscal.Servico },
    { label: 'Transporte', value: TipoOperacaoFiscal.Transporte },
    { label: 'Outro', value: TipoOperacaoFiscal.Outro }
];

export const servicoTransmissaoFiscalOptions: SelectOption<number>[] = [
    { label: 'Autorização', value: TipoServicoTransmissaoFiscal.Autorizacao },
    { label: 'Consulta retorno autorização', value: TipoServicoTransmissaoFiscal.ConsultaRetornoAutorizacao },
    { label: 'Consulta protocolo', value: TipoServicoTransmissaoFiscal.ConsultaProtocolo },
    { label: 'Status serviço', value: TipoServicoTransmissaoFiscal.StatusServico }
];

export const gerarCorrelationId = (fluxo: string) =>
    `front-${fluxo}-${new Date()
        .toISOString()
        .replace(/[-:.TZ]/g, '')
        .slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
