import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import { atualizarAtividadeSchema, alterarStatusAtividadeSchema, atribuirAtividadeSchema, cancelarAtividadeSchema, comentarAtividadeSchema, criarAtividadeSchema } from '@/features/atividades/schemas/atividadesSchemas';
import {
    AlterarStatusAtividadeRequest,
    AtividadeResponse,
    AtividadesListQuery,
    AtualizarAtividadeRequest,
    AtribuirAtividadeRequest,
    CancelarAtividadeRequest,
    ComentarioAtividadeRequest,
    CriarAtividadeRequest
} from '@/features/atividades/types/atividades.types';
import { PagedResult } from '@/types/erp';

type Schema<T> = { parse: (value: unknown) => T };
type AtividadesListResponse = AtividadeResponse[] | PagedResult<AtividadeResponse>;

const runAtividadesRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const params = (query?: AtividadesListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, responsavelUsuarioId: query?.responsavelUsuarioId, status: query?.status, prioridade: query?.prioridade, termo: query?.termo, page: query?.page, pageSize: query?.pageSize });

// Normaliza a resposta do backend para PagedResult, tolerando endpoints que ainda devolvem array puro.
const normalizePaged = (data: AtividadesListResponse, query?: AtividadesListQuery): PagedResult<AtividadeResponse> => {
    if (!Array.isArray(data)) return data;
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? (data.length || 1);
    return { items: data, page, pageSize, totalItems: data.length, totalPages: 1 };
};

export const buildCriarAtividadePayload = (values: unknown): CriarAtividadeRequest => parseSchema(criarAtividadeSchema, values);
export const buildAtualizarAtividadePayload = (values: unknown): AtualizarAtividadeRequest => parseSchema(atualizarAtividadeSchema, values);
export const buildAtribuirAtividadePayload = (values: unknown): AtribuirAtividadeRequest => parseSchema(atribuirAtividadeSchema, values);
export const buildAlterarStatusAtividadePayload = (values: unknown): AlterarStatusAtividadeRequest => parseSchema(alterarStatusAtividadeSchema, values);
export const buildComentarioAtividadePayload = (values: unknown): ComentarioAtividadeRequest => parseSchema(comentarAtividadeSchema, values);
export const buildCancelarAtividadePayload = (motivo: string): CancelarAtividadeRequest => parseSchema(cancelarAtividadeSchema, { motivo });

export const atividadesApi = {
    async listar(query?: AtividadesListQuery) {
        return runAtividadesRequest(async () => {
            const response = await httpClient.get<AtividadesListResponse>('/api/atividades', { params: params(query) });
            return normalizePaged(response.data, query);
        });
    },

    async obter(id: string) {
        return runAtividadesRequest(async () => {
            const response = await httpClient.get<AtividadeResponse>(`/api/atividades/${id}`);
            return response.data;
        });
    },

    async criar(values: unknown) {
        const payload = buildCriarAtividadePayload(values);
        return runAtividadesRequest(async () => {
            const response = await httpClient.post<AtividadeResponse>('/api/atividades', payload);
            return response.data;
        });
    },

    async atualizar(id: string, values: unknown) {
        const payload = buildAtualizarAtividadePayload(values);
        return runAtividadesRequest(async () => {
            const response = await httpClient.put<AtividadeResponse>(`/api/atividades/${id}`, payload);
            return response.data;
        });
    },

    async atribuir(id: string, values: unknown) {
        const payload = buildAtribuirAtividadePayload(values);
        return runAtividadesRequest(async () => {
            const response = await httpClient.post<AtividadeResponse>(`/api/atividades/${id}/atribuir`, payload);
            return response.data;
        });
    },

    async alterarStatus(id: string, values: unknown) {
        const payload = buildAlterarStatusAtividadePayload(values);
        return runAtividadesRequest(async () => {
            const response = await httpClient.post<AtividadeResponse>(`/api/atividades/${id}/status`, payload);
            return response.data;
        });
    },

    async comentar(id: string, values: unknown) {
        const payload = buildComentarioAtividadePayload(values);
        return runAtividadesRequest(async () => {
            const response = await httpClient.post<AtividadeResponse>(`/api/atividades/${id}/comentarios`, payload);
            return response.data;
        });
    },

    async cancelar(id: string, motivo: string) {
        const payload = buildCancelarAtividadePayload(motivo);
        return runAtividadesRequest(async () => {
            const response = await httpClient.post<AtividadeResponse>(`/api/atividades/${id}/cancelar`, payload);
            return response.data;
        });
    }
};
