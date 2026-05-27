import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, QueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    adicionarImpostoNotaFiscalSchema,
    adicionarItemNotaFiscalSchema,
    armazenarXmlNotaFiscalSchema,
    assinarXmlEnvioSchema,
    avaliarContingenciaFiscalSchema,
    baixarEstoqueNotaFiscalSchema,
    cancelarNotaFiscalSchema,
    cancelarNotaFiscalSefazSchema,
    consultarProtocoloSefazSchema,
    contingenciaFiscalSchema,
    criarNotaFiscalSchema,
    emitirCartaCorrecaoSefazSchema,
    exportarNotasFiscaisCsvSchema,
    gerarContaReceberNotaFiscalSchema,
    gerarDanfeNotaFiscalSchema,
    gerarNotaFiscalPedidoVendaSchema,
    gerarXmlEnvioSchema,
    inutilizarNumeracaoSefazSchema,
    registrarRejeicaoNotaFiscalSchema,
    reprocessarNotaFiscalSefazSchema,
    statusServicoSefazSchema,
    transmitirNotaFiscalSefazSchema
} from '@/features/fiscal/schemas/fiscalSchemas';
import {
    AdicionarImpostoNotaFiscalRequest,
    AdicionarItemNotaFiscalRequest,
    ArmazenarXmlNotaFiscalRequest,
    AssinarXmlNotaFiscalRequest,
    AvaliarContingenciaFiscalRequest,
    BaixarEstoqueNotaFiscalRequest,
    BaixarEstoqueNotaFiscalResponse,
    CancelarNotaFiscalRequest,
    CancelarNotaFiscalSefazRequest,
    CartaCorrecaoResponse,
    ConsultaProtocoloSefazResponse,
    ConsultarProtocoloSefazRequest,
    ContingenciaFiscalResponse,
    CriarNotaFiscalRequest,
    DocumentoAuxiliarFiscalResponse,
    EmitirCartaCorrecaoSefazRequest,
    EventoFiscalOperacionalResponse,
    GerarContaReceberNotaFiscalRequest,
    GerarContaReceberNotaFiscalResponse,
    GerarDanfeNotaFiscalRequest,
    GerarNotaFiscalPedidoVendaRequest,
    GerarXmlEnvioNotaFiscalRequest,
    HabilitarContingenciaNotaFiscalRequest,
    InutilizacaoNumeracaoResponse,
    InutilizarNumeracaoSefazRequest,
    LogIntegracaoFiscalResponse,
    NotaFiscalExportacaoCsvQuery,
    NotaFiscalListQuery,
    NotaFiscalListagemResponse,
    NotaFiscalPedidoVendaResponse,
    NotaFiscalResponse,
    NotaFiscalXmlPipelineResponse,
    ObservabilidadeFiscalResponse,
    RegistrarRejeicaoNotaFiscalRequest,
    ReprocessarNotaFiscalSefazRequest,
    ResumoOperacionalNotaFiscalResponse,
    StatusServicoSefazRequest,
    StatusServicoSefazResponse,
    TransmissaoSefazResponse,
    TransmitirNotaFiscalSefazRequest,
    WorkflowOperacionalNotaFiscalResponse
} from '@/features/fiscal/types/fiscal.types';

export type DownloadedFiscalFile = { blob: Blob; filename: string; contentType?: string | null };

type Schema<T> = { parse: (value: unknown) => T };

export class FiscalApiClientError extends Error {
    apiError: ReturnType<typeof mapApiError>;

    constructor(apiError: ReturnType<typeof mapApiError>) {
        super(apiError.message);
        this.name = 'FiscalApiClientError';
        this.apiError = apiError;
    }
}

const runFiscalRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = await mapFiscalApiError(error);
        throw new FiscalApiClientError(apiError);
    }
};

const normalizeHeaderValue = (value: unknown) => {
    if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
    return typeof value === 'string' ? value : undefined;
};

const filenameFromContentDisposition = (contentDisposition?: string) => {
    if (!contentDisposition) return null;
    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/[\"]/g, '').trim());
    const asciiMatch = /filename=([^;]+)/i.exec(contentDisposition);
    return asciiMatch?.[1]?.replace(/[\"]/g, '').trim() || null;
};

const safeFilename = (filename: string | null, fallback: string) => {
    const cleaned = filename?.replace(/[\\/:*?"<>|]/g, '-').trim();
    return cleaned || fallback;
};

const csvFallbackFilename = () => `notas-fiscais-${new Date().toISOString().slice(0, 10)}.csv`;
const documentoAuxiliarFallbackFilename = (documentoAuxiliarId: string) => `documento-auxiliar-fiscal-${documentoAuxiliarId}.bin`;

const isBlobLike = (value: unknown): value is Blob => typeof Blob !== 'undefined' && value instanceof Blob;

const getHeader = (headers: unknown, name: string) => {
    if (!headers || typeof headers !== 'object') return undefined;
    const record = headers as Record<string, unknown>;
    return normalizeHeaderValue(record[name] ?? record[name.toLowerCase()] ?? record[name.toUpperCase()]);
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (source: Record<string, unknown>, key: string) => {
    const value = source[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const mapFiscalErrorData = (data: unknown, status?: number): ReturnType<typeof mapApiError> | null => {
    if (!isRecord(data)) return null;

    const apiResultError = isRecord(data.error) ? data.error : null;
    if (typeof data.success === 'boolean' && apiResultError) {
        const message = getString(apiResultError, 'message') ?? getString(apiResultError, 'Message');
        if (message) {
            return {
                code: getString(apiResultError, 'code') ?? getString(apiResultError, 'Code'),
                message,
                status,
                traceId: getString(apiResultError, 'traceId') ?? getString(apiResultError, 'TraceId')
            };
        }
    }

    if (isRecord(data.errors)) {
        const firstMessage = Object.values(data.errors)
            .flatMap((value) => (Array.isArray(value) ? value : []))
            .find((message): message is string => typeof message === 'string' && message.trim().length > 0);

        if (firstMessage) {
            return {
                message: firstMessage,
                status,
                traceId: getString(data, 'traceId') ?? getString(data, 'TraceId')
            };
        }
    }

    const message = getString(data, 'message') ?? getString(data, 'Message') ?? getString(data, 'title') ?? getString(data, 'Title');
    if (!message) return null;

    return {
        code: getString(data, 'code') ?? getString(data, 'Code'),
        message,
        status,
        traceId: getString(data, 'traceId') ?? getString(data, 'TraceId')
    };
};

const readBlobErrorData = async (blob: Blob, status?: number): Promise<ReturnType<typeof mapApiError> | null> => {
    if (blob.size === 0) return null;

    const text = await blob.text();
    const trimmed = text.trim();
    if (!trimmed) return null;

    try {
        const parsed = JSON.parse(trimmed);
        return mapFiscalErrorData(parsed, status);
    } catch {
        return {
            message: trimmed.slice(0, 500),
            status
        };
    }
};

async function mapFiscalApiError(error: unknown): Promise<ReturnType<typeof mapApiError>> {
    const response = isRecord(error) && isRecord(error.response) ? error.response : null;
    const status = typeof response?.status === 'number' ? response.status : undefined;
    const data = response?.data;

    if (isBlobLike(data)) {
        const blobMapped = await readBlobErrorData(data, status);
        if (blobMapped) return blobMapped;
    }

    return mapApiError(error);
}

export const formatFiscalApiError = (error: unknown, fallback: string) => {
    if (error instanceof FiscalApiClientError) {
        const meta = [error.apiError.code, error.apiError.status ? `HTTP ${error.apiError.status}` : null, error.apiError.traceId ? `Trace ${error.apiError.traceId}` : null].filter(Boolean).join(' • ');
        return meta ? `${error.apiError.message} (${meta})` : error.apiError.message;
    }

    return error instanceof Error ? error.message : fallback;
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const fiscalListParams = (query?: NotaFiscalListQuery, options?: { includePagination?: boolean }): QueryParams => {
    const params: QueryParams = {
        empresaId: query?.empresaId,
        filialId: query?.filialId,
        tipoDocumento: query?.tipoDocumento,
        tipoOperacao: query?.tipoOperacao,
        statusFiscal: query?.statusFiscal,
        origem: query?.origem,
        origemId: query?.origemId,
        pessoaId: query?.pessoaId,
        serie: query?.serie,
        numero: query?.numero,
        chaveAcesso: query?.chaveAcesso,
        protocoloAutorizacao: query?.protocoloAutorizacao,
        dataEmissaoInicial: query?.dataEmissaoInicial,
        dataEmissaoFinal: query?.dataEmissaoFinal,
        dataAutorizacaoInicial: query?.dataAutorizacaoInicial,
        dataAutorizacaoFinal: query?.dataAutorizacaoFinal,
        dataCancelamentoInicial: query?.dataCancelamentoInicial,
        dataCancelamentoFinal: query?.dataCancelamentoFinal,
        valorTotalMinimo: query?.valorTotalMinimo,
        valorTotalMaximo: query?.valorTotalMaximo,
        possuiXmlAutorizado: query?.possuiXmlAutorizado,
        possuiDanfe: query?.possuiDanfe,
        contaReceberGerada: query?.contaReceberGerada,
        statusPedidoVenda: query?.statusPedidoVenda,
        somenteComPendenciaXmlAutorizado: query?.somenteComPendenciaXmlAutorizado,
        somenteComPendenciaDanfe: query?.somenteComPendenciaDanfe,
        somenteComPendenciaEstoque: query?.somenteComPendenciaEstoque,
        somenteComPendenciaFinanceira: query?.somenteComPendenciaFinanceira
    };

    if (options?.includePagination !== false) {
        params.page = query?.page ?? 1;
        params.pageSize = query?.pageSize ?? 20;
    }

    return cleanQueryParams(params);
};

const appendQuery = (query: QueryParams, extra: QueryParams): QueryParams => cleanQueryParams({ ...query, ...extra });

export const buildCriarNotaFiscalPayload = (values: unknown): CriarNotaFiscalRequest => parseSchema(criarNotaFiscalSchema, values);
export const buildGerarNotaFiscalPedidoVendaPayload = (values: unknown): GerarNotaFiscalPedidoVendaRequest => parseSchema(gerarNotaFiscalPedidoVendaSchema, values);
export const buildAdicionarItemNotaFiscalPayload = (values: unknown): AdicionarItemNotaFiscalRequest => parseSchema(adicionarItemNotaFiscalSchema, values);
export const buildAdicionarImpostoNotaFiscalPayload = (values: unknown): AdicionarImpostoNotaFiscalRequest => parseSchema(adicionarImpostoNotaFiscalSchema, values);
export const buildArmazenarXmlNotaFiscalPayload = (values: unknown): ArmazenarXmlNotaFiscalRequest => parseSchema(armazenarXmlNotaFiscalSchema, values);
export const buildGerarXmlEnvioPayload = (values: unknown): GerarXmlEnvioNotaFiscalRequest => parseSchema(gerarXmlEnvioSchema, values);
export const buildAssinarXmlEnvioPayload = (values: unknown): AssinarXmlNotaFiscalRequest => parseSchema(assinarXmlEnvioSchema, values);
export const buildTransmitirSefazPayload = (values: unknown): TransmitirNotaFiscalSefazRequest => parseSchema(transmitirNotaFiscalSefazSchema, values);
export const buildReprocessarSefazPayload = (values: unknown): ReprocessarNotaFiscalSefazRequest => parseSchema(reprocessarNotaFiscalSefazSchema, values);
export const buildConsultarProtocoloPayload = (values: unknown): ConsultarProtocoloSefazRequest => parseSchema(consultarProtocoloSefazSchema, values);
export const buildStatusServicoPayload = (values: unknown): StatusServicoSefazRequest => parseSchema(statusServicoSefazSchema, values);
export const buildAvaliarContingenciaPayload = (values: unknown): AvaliarContingenciaFiscalRequest => parseSchema(avaliarContingenciaFiscalSchema, values);
export const buildHabilitarContingenciaPayload = (values: unknown): HabilitarContingenciaNotaFiscalRequest => parseSchema(contingenciaFiscalSchema.omit({ empresaId: true, filialId: true, tipoDocumento: true }), values);
export const buildRegistrarRejeicaoPayload = (values: unknown): RegistrarRejeicaoNotaFiscalRequest => parseSchema(registrarRejeicaoNotaFiscalSchema, values);
export const buildCancelarNotaFiscalPayload = (values: unknown): CancelarNotaFiscalRequest => parseSchema(cancelarNotaFiscalSchema, values);
export const buildCancelarNotaFiscalSefazPayload = (values: unknown): CancelarNotaFiscalSefazRequest => parseSchema(cancelarNotaFiscalSefazSchema, values);
export const buildEmitirCartaCorrecaoPayload = (values: unknown): EmitirCartaCorrecaoSefazRequest => parseSchema(emitirCartaCorrecaoSefazSchema, values);
export const buildInutilizarNumeracaoPayload = (values: unknown): InutilizarNumeracaoSefazRequest => parseSchema(inutilizarNumeracaoSefazSchema, values);
export const buildGerarDanfePayload = (values: unknown): GerarDanfeNotaFiscalRequest => parseSchema(gerarDanfeNotaFiscalSchema, values);
export const buildBaixarEstoquePayload = (values: unknown): BaixarEstoqueNotaFiscalRequest => parseSchema(baixarEstoqueNotaFiscalSchema, values);
export const buildGerarContaReceberPayload = (values: unknown): GerarContaReceberNotaFiscalRequest => parseSchema(gerarContaReceberNotaFiscalSchema, values);
export const buildExportarNotasFiscaisCsvPayload = (values: unknown): { motivo: string; limite: number } => parseSchema(exportarNotasFiscaisCsvSchema, values);

const assertExportacaoFiscalCoerente = (query: NotaFiscalExportacaoCsvQuery) => {
    if (!query.empresaId) {
        throw new FiscalApiClientError({ code: 'Fiscal.Exportacao.EmpresaObrigatoria', message: 'Selecione uma empresa antes de exportar o CSV fiscal.' });
    }

    if (query.somenteComPendenciaXmlAutorizado && query.possuiXmlAutorizado === true) {
        throw new FiscalApiClientError({ code: 'Fiscal.Exportacao.FiltroInvalido', message: 'Não combine pendência de XML autorizado com possuiXmlAutorizado=true.' });
    }

    if (query.somenteComPendenciaDanfe && query.possuiDanfe === true) {
        throw new FiscalApiClientError({ code: 'Fiscal.Exportacao.FiltroInvalido', message: 'Não combine pendência de DANFE com possuiDanfe=true.' });
    }

    if (query.somenteComPendenciaFinanceira && query.contaReceberGerada === true) {
        throw new FiscalApiClientError({ code: 'Fiscal.Exportacao.FiltroInvalido', message: 'Não combine pendência financeira com contaReceberGerada=true.' });
    }
};

export const buildExportarNotasFiscaisCsvQueryParams = (query: NotaFiscalExportacaoCsvQuery): QueryParams => {
    const payload = buildExportarNotasFiscaisCsvPayload({ motivo: query.motivo, limite: query.limite ?? 1000 });
    const normalizedQuery = { ...query, motivo: payload.motivo, limite: payload.limite, formato: query.formato ?? 1 };

    assertExportacaoFiscalCoerente(normalizedQuery);

    return appendQuery(fiscalListParams(normalizedQuery, { includePagination: false }), {
        motivo: payload.motivo,
        limite: payload.limite,
        formato: normalizedQuery.formato
    });
};

export const fiscalApi = {
    async listarNotas(query?: NotaFiscalListQuery) {
        return runFiscalRequest(async () => {
            const response = await httpClient.get<NotaFiscalListagemResponse>('/api/fiscal/notas-fiscais', { params: fiscalListParams(query) });
            return response.data;
        });
    },
    async exportarNotasCsv(query: NotaFiscalExportacaoCsvQuery): Promise<DownloadedFiscalFile> {
        return runFiscalRequest(async () => {
            const response = await httpClient.get<Blob>('/api/fiscal/notas-fiscais/exportacoes/csv', {
                params: buildExportarNotasFiscaisCsvQueryParams(query),
                responseType: 'blob'
            });
            const contentType = getHeader(response.headers, 'content-type') ?? response.data.type;

            if (/application\/json|problem\+json/i.test(contentType ?? '')) {
                const mapped = await readBlobErrorData(response.data, response.status);
                throw new FiscalApiClientError(mapped ?? { message: 'A exportação fiscal retornou um payload de erro em vez de um arquivo CSV.', status: response.status });
            }

            return {
                blob: response.data,
                filename: safeFilename(filenameFromContentDisposition(getHeader(response.headers, 'content-disposition')), csvFallbackFilename()),
                contentType
            };
        });
    },
    async buscarNota(id: string) {
        return runFiscalRequest(async () => {
            const response = await httpClient.get<NotaFiscalResponse>(`/api/fiscal/notas-fiscais/${id}`);
            return response.data;
        });
    },
    async buscarResumo(id: string) {
        return runFiscalRequest(async () => {
            const response = await httpClient.get<ResumoOperacionalNotaFiscalResponse>(`/api/fiscal/notas-fiscais/${id}/resumo-operacional`);
            return response.data;
        });
    },
    async buscarWorkflow(id: string) {
        return runFiscalRequest(async () => {
            const response = await httpClient.get<WorkflowOperacionalNotaFiscalResponse>(`/api/fiscal/notas-fiscais/${id}/workflow-operacional`);
            return response.data;
        });
    },
    async buscarIntegracoes(id: string) {
        return runFiscalRequest(async () => {
            const response = await httpClient.get<LogIntegracaoFiscalResponse[]>(`/api/fiscal/notas-fiscais/${id}/integracoes`);
            return response.data;
        });
    },
    async buscarObservabilidade(query: { empresaId?: string | null; filialId?: string | null; registradoApos?: string | null; take?: number | null }) {
        return runFiscalRequest(async () => {
            const response = await httpClient.get<ObservabilidadeFiscalResponse>('/api/fiscal/observabilidade/integracoes', {
                params: cleanQueryParams({ empresaId: query.empresaId, filialId: query.filialId, registradoApos: query.registradoApos, take: query.take ?? 50 })
            });
            return response.data;
        });
    },
    async criarNota(values: unknown) {
        const payload = buildCriarNotaFiscalPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<NotaFiscalResponse>('/api/fiscal/notas-fiscais', payload);
            return response.data;
        });
    },
    async gerarNotaDePedidoVenda(values: unknown) {
        const payload = buildGerarNotaFiscalPedidoVendaPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<NotaFiscalPedidoVendaResponse>('/api/fiscal/notas-fiscais/gerar-de-pedido-venda', payload);
            return response.data;
        });
    },
    async adicionarItem(id: string, values: unknown) {
        const payload = buildAdicionarItemNotaFiscalPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<NotaFiscalResponse>(`/api/fiscal/notas-fiscais/${id}/itens`, payload);
            return response.data;
        });
    },
    async adicionarImposto(id: string, values: unknown) {
        const payload = buildAdicionarImpostoNotaFiscalPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<NotaFiscalResponse>(`/api/fiscal/notas-fiscais/${id}/impostos`, payload);
            return response.data;
        });
    },
    async armazenarXml(id: string, values: unknown) {
        const payload = buildArmazenarXmlNotaFiscalPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<NotaFiscalResponse>(`/api/fiscal/notas-fiscais/${id}/xmls`, payload);
            return response.data;
        });
    },
    async validar(id: string) {
        return runFiscalRequest(async () => {
            const response = await httpClient.post<NotaFiscalResponse>(`/api/fiscal/notas-fiscais/${id}/validar`);
            return response.data;
        });
    },
    async gerarXmlEnvio(id: string, values: unknown) {
        const payload = buildGerarXmlEnvioPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<NotaFiscalXmlPipelineResponse>(`/api/fiscal/notas-fiscais/${id}/gerar-xml-envio`, payload);
            return response.data;
        });
    },
    async assinarXmlEnvio(id: string, values: unknown) {
        const payload = buildAssinarXmlEnvioPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<NotaFiscalXmlPipelineResponse>(`/api/fiscal/notas-fiscais/${id}/assinar-xml-envio`, payload);
            return response.data;
        });
    },
    async transmitirSefaz(id: string, values: unknown) {
        const payload = buildTransmitirSefazPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<TransmissaoSefazResponse>(`/api/fiscal/notas-fiscais/${id}/transmitir-sefaz`, payload);
            return response.data;
        });
    },
    async reprocessarSefaz(id: string, values: unknown) {
        const payload = buildReprocessarSefazPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<TransmissaoSefazResponse>(`/api/fiscal/notas-fiscais/${id}/reprocessar-sefaz`, payload);
            return response.data;
        });
    },
    async consultarProtocoloSefaz(id: string, values: unknown) {
        const payload = buildConsultarProtocoloPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<ConsultaProtocoloSefazResponse>(`/api/fiscal/notas-fiscais/${id}/consultar-protocolo-sefaz`, payload);
            return response.data;
        });
    },
    async consultarStatusServico(values: unknown) {
        const payload = buildStatusServicoPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<StatusServicoSefazResponse>('/api/fiscal/sefaz/status-servico', payload);
            return response.data;
        });
    },
    async listarHistoricoStatusServico(query: { empresaId?: string | null; filialId?: string | null; take?: number | null }) {
        return runFiscalRequest(async () => {
            const response = await httpClient.get<LogIntegracaoFiscalResponse[]>('/api/fiscal/sefaz/status-servico/historico', { params: cleanQueryParams(query) });
            return response.data;
        });
    },
    async avaliarContingencia(values: unknown) {
        const payload = buildAvaliarContingenciaPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<ContingenciaFiscalResponse>('/api/fiscal/sefaz/contingencia/avaliar', payload);
            return response.data;
        });
    },
    async habilitarContingencia(id: string, values: unknown) {
        const payload = buildHabilitarContingenciaPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<ContingenciaFiscalResponse>(`/api/fiscal/notas-fiscais/${id}/habilitar-contingencia`, payload);
            return response.data;
        });
    },
    async listarHistoricoContingencia(query: { empresaId?: string | null; filialId?: string | null; take?: number | null }) {
        return runFiscalRequest(async () => {
            const response = await httpClient.get<LogIntegracaoFiscalResponse[]>('/api/fiscal/sefaz/contingencia/historico', { params: cleanQueryParams(query) });
            return response.data;
        });
    },
    async registrarRejeicao(id: string, values: unknown) {
        const payload = buildRegistrarRejeicaoPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<NotaFiscalResponse>(`/api/fiscal/notas-fiscais/${id}/rejeicao`, payload);
            return response.data;
        });
    },
    async cancelar(id: string, values: unknown) {
        const payload = buildCancelarNotaFiscalPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<NotaFiscalResponse>(`/api/fiscal/notas-fiscais/${id}/cancelar`, payload);
            return response.data;
        });
    },
    async cancelarSefaz(id: string, values: unknown) {
        const payload = buildCancelarNotaFiscalSefazPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<EventoFiscalOperacionalResponse>(`/api/fiscal/notas-fiscais/${id}/cancelar-sefaz`, payload);
            return response.data;
        });
    },
    async emitirCartaCorrecao(id: string, values: unknown) {
        const payload = buildEmitirCartaCorrecaoPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<CartaCorrecaoResponse>(`/api/fiscal/notas-fiscais/${id}/cartas-correcao`, payload);
            return response.data;
        });
    },
    async inutilizarNumeracao(values: unknown) {
        const payload = buildInutilizarNumeracaoPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<InutilizacaoNumeracaoResponse>('/api/fiscal/inutilizacoes', payload);
            return response.data;
        });
    },
    async gerarDanfe(id: string, values: unknown) {
        const payload = buildGerarDanfePayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<DocumentoAuxiliarFiscalResponse>(`/api/fiscal/notas-fiscais/${id}/danfe`, payload);
            return response.data;
        });
    },
    async baixarEstoque(id: string, values: unknown) {
        const payload = buildBaixarEstoquePayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<BaixarEstoqueNotaFiscalResponse>(`/api/fiscal/notas-fiscais/${id}/baixar-estoque`, payload);
            return response.data;
        });
    },
    async gerarContaReceber(id: string, values: unknown) {
        const payload = buildGerarContaReceberPayload(values);
        return runFiscalRequest(async () => {
            const response = await httpClient.post<GerarContaReceberNotaFiscalResponse>(`/api/fiscal/notas-fiscais/${id}/gerar-conta-receber`, payload);
            return response.data;
        });
    },
    async baixarDocumentoAuxiliar(documentoAuxiliarId: string): Promise<DownloadedFiscalFile> {
        return runFiscalRequest(async () => {
            const response = await httpClient.get<Blob>(`/api/fiscal/notas-fiscais/documentos-auxiliares/${documentoAuxiliarId}/download`, { responseType: 'blob' });
            const contentType = getHeader(response.headers, 'content-type') ?? response.data.type;

            return {
                blob: response.data,
                filename: safeFilename(filenameFromContentDisposition(getHeader(response.headers, 'content-disposition')), documentoAuxiliarFallbackFilename(documentoAuxiliarId)),
                contentType
            };
        });
    }
};
