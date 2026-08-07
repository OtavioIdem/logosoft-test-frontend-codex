import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, QueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    atualizarExcecaoFiscalNcmSchema,
    atualizarExcecaoFiscalSchema,
    atualizarRegraFiscalSchema,
    criarExcecaoFiscalNcmSchema,
    criarExcecaoFiscalSchema,
    criarRegraFiscalSchema,
    inativarRegistroFiscalSchema,
    simularTributacaoSchema
} from '@/features/tributacao/schemas/tributacaoSchemas';
import {
    AtualizarExcecaoFiscalNcmRequest,
    AtualizarExcecaoFiscalRequest,
    AtualizarRegraFiscalOperacaoRequest,
    CfopResumoResponse,
    CriarExcecaoFiscalNcmRequest,
    CriarExcecaoFiscalRequest,
    CriarRegraFiscalOperacaoRequest,
    DocumentoTributavelRequest,
    ExcecaoFiscalListQuery,
    ExcecaoFiscalListagemResponse,
    ExcecaoFiscalNcmListQuery,
    ExcecaoFiscalNcmListagemResponse,
    ExcecaoFiscalNcmResponse,
    ExcecaoFiscalResponse,
    InativarRegraFiscalOperacaoRequest,
    NcmResumoResponse,
    RegraFiscalListQuery,
    RegraFiscalListagemResponse,
    RegraFiscalOperacaoResponse,
    ResultadoTributacaoDocumento
} from '@/features/tributacao/types/tributacao.types';
import { PagedResult } from '@/types/erp';

type Schema<T> = { parse: (value: unknown) => T };

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

/**
 * O motor devolve **422** com `{ codigo, message }` quando o cálculo não pôde ser feito. `mapApiError` já
 * lê `code`/`message`, mas o backend serializa a propriedade como `Codigo` (PascalCase, objeto anônimo do
 * controller), então normalizamos aqui para o resto do app continuar tratando por `error.code`.
 */
export const mapTributacaoApiError = (error: unknown) => {
    const mapped = mapApiError(error);
    if (mapped.code) return mapped;

    const response = typeof error === 'object' && error !== null ? (error as { response?: { data?: unknown } }).response : undefined;
    const data = response?.data;
    if (typeof data === 'object' && data !== null) {
        const codigo = (data as Record<string, unknown>).codigo ?? (data as Record<string, unknown>).Codigo;
        if (typeof codigo === 'string' && codigo.trim()) {
            return { ...mapped, code: codigo.trim() };
        }
    }

    return mapped;
};

export class TributacaoApiClientError extends Error {
    apiError: ReturnType<typeof mapApiError>;

    constructor(apiError: ReturnType<typeof mapApiError>) {
        super(apiError.message);
        this.name = 'TributacaoApiClientError';
        this.apiError = apiError;
    }
}

const runTributacaoRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new TributacaoApiClientError(mapTributacaoApiError(error));
    }
};

export const buildSimularTributacaoPayload = (values: unknown): DocumentoTributavelRequest => parseSchema(simularTributacaoSchema, values) as DocumentoTributavelRequest;
export const buildCriarRegraFiscalPayload = (values: unknown): CriarRegraFiscalOperacaoRequest => parseSchema(criarRegraFiscalSchema, values) as CriarRegraFiscalOperacaoRequest;
export const buildAtualizarRegraFiscalPayload = (values: unknown): AtualizarRegraFiscalOperacaoRequest => parseSchema(atualizarRegraFiscalSchema, values) as AtualizarRegraFiscalOperacaoRequest;
export const buildCriarExcecaoFiscalPayload = (values: unknown): CriarExcecaoFiscalRequest => parseSchema(criarExcecaoFiscalSchema, values) as CriarExcecaoFiscalRequest;
export const buildAtualizarExcecaoFiscalPayload = (values: unknown): AtualizarExcecaoFiscalRequest => parseSchema(atualizarExcecaoFiscalSchema, values) as AtualizarExcecaoFiscalRequest;
export const buildCriarExcecaoFiscalNcmPayload = (values: unknown): CriarExcecaoFiscalNcmRequest => parseSchema(criarExcecaoFiscalNcmSchema, values) as CriarExcecaoFiscalNcmRequest;
export const buildAtualizarExcecaoFiscalNcmPayload = (values: unknown): AtualizarExcecaoFiscalNcmRequest => parseSchema(atualizarExcecaoFiscalNcmSchema, values) as AtualizarExcecaoFiscalNcmRequest;
export const buildInativarPayload = (values: unknown): InativarRegraFiscalOperacaoRequest => parseSchema(inativarRegistroFiscalSchema, values);

const regraListParams = (query?: RegraFiscalListQuery): QueryParams =>
    cleanQueryParams({
        empresaId: query?.empresaId,
        filialId: query?.filialId,
        tipoOperacao: query?.tipoOperacao,
        ufDestino: query?.ufDestino,
        ncmId: query?.ncmId,
        cfopId: query?.cfopId,
        somenteAtivas: query?.somenteAtivas,
        termo: query?.termo,
        pagina: query?.pagina ?? 1,
        tamanhoPagina: query?.tamanhoPagina ?? 20
    });

const excecaoListParams = (query?: ExcecaoFiscalNcmListQuery): QueryParams =>
    cleanQueryParams({
        empresaId: query?.empresaId,
        filialId: query?.filialId,
        ncmId: query?.ncmId,
        uf: query?.uf,
        somenteAtivas: query?.somenteAtivas,
        termo: query?.termo,
        pagina: query?.pagina ?? 1,
        tamanhoPagina: query?.tamanhoPagina ?? 20
    });

export const tributacaoApi = {
    /**
     * Simulação de tributação — `POST` só porque o corpo é grande demais para query string. **Read-only**:
     * não persiste, não gera documento, não consome numeração. Pode ser chamada a cada alteração de campo.
     */
    async simular(values: unknown) {
        const payload = buildSimularTributacaoPayload(values);
        return runTributacaoRequest(async () => {
            const response = await httpClient.post<ResultadoTributacaoDocumento>('/api/fiscal/tributacao/simular', payload);
            return response.data;
        });
    },
    async listarRegras(query?: RegraFiscalListQuery) {
        return runTributacaoRequest(async () => {
            const response = await httpClient.get<RegraFiscalListagemResponse>('/api/fiscal/regras', { params: regraListParams(query) });
            return response.data;
        });
    },
    async buscarRegra(id: string) {
        return runTributacaoRequest(async () => {
            const response = await httpClient.get<RegraFiscalOperacaoResponse>(`/api/fiscal/regras/${id}`);
            return response.data;
        });
    },
    async criarRegra(values: unknown) {
        const payload = buildCriarRegraFiscalPayload(values);
        return runTributacaoRequest(async () => {
            const response = await httpClient.post<RegraFiscalOperacaoResponse>('/api/fiscal/regras', payload);
            return response.data;
        });
    },
    /** `PUT` é substituição total: o payload precisa carregar **todos** os blocos, não só os que mudaram. */
    async atualizarRegra(id: string, values: unknown) {
        const payload = buildAtualizarRegraFiscalPayload(values);
        return runTributacaoRequest(async () => {
            const response = await httpClient.put<RegraFiscalOperacaoResponse>(`/api/fiscal/regras/${id}`, payload);
            return response.data;
        });
    },
    async inativarRegra(id: string, values: unknown) {
        const payload = buildInativarPayload(values);
        return runTributacaoRequest(async () => {
            await httpClient.post(`/api/fiscal/regras/${id}/inativar`, payload);
            return id;
        });
    },
    async listarExcecoes(query?: ExcecaoFiscalListQuery) {
        return runTributacaoRequest(async () => {
            const response = await httpClient.get<ExcecaoFiscalListagemResponse>('/api/fiscal/excecoes', { params: excecaoListParams(query) });
            return response.data;
        });
    },
    async buscarExcecao(id: string) {
        return runTributacaoRequest(async () => {
            const response = await httpClient.get<ExcecaoFiscalResponse>(`/api/fiscal/excecoes/${id}`);
            return response.data;
        });
    },
    async criarExcecao(values: unknown) {
        const payload = buildCriarExcecaoFiscalPayload(values);
        return runTributacaoRequest(async () => {
            const response = await httpClient.post<ExcecaoFiscalResponse>('/api/fiscal/excecoes', payload);
            return response.data;
        });
    },
    async atualizarExcecao(id: string, values: unknown) {
        const payload = buildAtualizarExcecaoFiscalPayload(values);
        return runTributacaoRequest(async () => {
            const response = await httpClient.put<ExcecaoFiscalResponse>(`/api/fiscal/excecoes/${id}`, payload);
            return response.data;
        });
    },
    async inativarExcecao(id: string, values: unknown) {
        const payload = buildInativarPayload(values);
        return runTributacaoRequest(async () => {
            await httpClient.post(`/api/fiscal/excecoes/${id}/inativar`, payload);
            return id;
        });
    },
    async listarExcecoesNcm(query?: ExcecaoFiscalNcmListQuery) {
        return runTributacaoRequest(async () => {
            const response = await httpClient.get<ExcecaoFiscalNcmListagemResponse>('/api/fiscal/excecoes-ncm', { params: excecaoListParams(query) });
            return response.data;
        });
    },
    async buscarExcecaoNcm(id: string) {
        return runTributacaoRequest(async () => {
            const response = await httpClient.get<ExcecaoFiscalNcmResponse>(`/api/fiscal/excecoes-ncm/${id}`);
            return response.data;
        });
    },
    async criarExcecaoNcm(values: unknown) {
        const payload = buildCriarExcecaoFiscalNcmPayload(values);
        return runTributacaoRequest(async () => {
            const response = await httpClient.post<ExcecaoFiscalNcmResponse>('/api/fiscal/excecoes-ncm', payload);
            return response.data;
        });
    },
    async atualizarExcecaoNcm(id: string, values: unknown) {
        const payload = buildAtualizarExcecaoFiscalNcmPayload(values);
        return runTributacaoRequest(async () => {
            const response = await httpClient.put<ExcecaoFiscalNcmResponse>(`/api/fiscal/excecoes-ncm/${id}`, payload);
            return response.data;
        });
    },
    async inativarExcecaoNcm(id: string, values: unknown) {
        const payload = buildInativarPayload(values);
        return runTributacaoRequest(async () => {
            await httpClient.post(`/api/fiscal/excecoes-ncm/${id}/inativar`, payload);
            return id;
        });
    },
    /**
     * Consulta de NCM para os selects de item/regra/exceção. Exige `FISCAL_CADASTROS_CONSULTAR` — quando o
     * usuário não tem a permissão, a tela degrada para lista vazia em vez de quebrar (ver `useNcmOptions`).
     */
    async listarNcm(termo?: string | null) {
        return runTributacaoRequest(async () => {
            const response = await httpClient.get<PagedResult<NcmResumoResponse>>('/api/fiscal/cadastros/ncm', { params: cleanQueryParams({ termo, ativo: true, pagina: 1, tamanhoPagina: 20 }) });
            return response.data;
        });
    },
    async listarCfop(termo?: string | null) {
        return runTributacaoRequest(async () => {
            const response = await httpClient.get<PagedResult<CfopResumoResponse>>('/api/fiscal/cadastros/cfop', { params: cleanQueryParams({ termo, ativo: true, pagina: 1, tamanhoPagina: 20 }) });
            return response.data;
        });
    }
};
