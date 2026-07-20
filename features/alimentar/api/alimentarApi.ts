import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    abrirRecallSchema,
    adicionarLoteRecallSchema,
    criarLoteSchema,
    motivoSchema,
    registrarMovimentacaoLoteSchema
} from '@/features/alimentar/schemas/alimentarSchemas';
import {
    LoteResponse,
    LotesListQuery,
    MovimentacaoLoteResponse,
    RecallLoteResponse,
    RecallResponse,
    RecallsListQuery
} from '@/features/alimentar/types/alimentar.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const LOTES = '/api/alimentar/lotes';
const RECALLS = '/api/alimentar/recalls';

const lotesParams = (query?: LotesListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, produtoId: query?.produtoId, status: query?.status, termo: query?.termo });
const recallsParams = (query?: RecallsListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status, gravidade: query?.gravidade });

export const alimentarApi = {
    // ---- Lotes ----
    async listarLotes(query?: LotesListQuery) {
        return runRequest(async () => (await httpClient.get<LoteResponse[]>(LOTES, { params: lotesParams(query) })).data);
    },
    async listarLotesAVencer(dias: number, query?: LotesListQuery) {
        return runRequest(async () => (await httpClient.get<LoteResponse[]>(`${LOTES}/a-vencer`, { params: cleanQueryParams({ ...lotesParams(query), dias }) })).data);
    },
    async obterLote(id: string) {
        return runRequest(async () => (await httpClient.get<LoteResponse>(`${LOTES}/${id}`)).data);
    },
    async criarLote(values: unknown) {
        const payload = parseSchema(criarLoteSchema, values);
        return runRequest(async () => (await httpClient.post<LoteResponse>(LOTES, payload)).data);
    },
    async bloquearLote(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<LoteResponse>(`${LOTES}/${id}/bloquear`, payload)).data);
    },
    async desbloquearLote(id: string) {
        return runRequest(async () => (await httpClient.post<LoteResponse>(`${LOTES}/${id}/desbloquear`)).data);
    },
    async listarMovimentacoes(loteId: string) {
        return runRequest(async () => (await httpClient.get<MovimentacaoLoteResponse[]>(`${LOTES}/${loteId}/movimentacoes`)).data);
    },
    async registrarMovimentacao(values: unknown) {
        const payload = parseSchema(registrarMovimentacaoLoteSchema, values);
        return runRequest(async () => (await httpClient.post<MovimentacaoLoteResponse>(`${LOTES}/movimentacoes`, payload)).data);
    },

    // ---- Recalls ----
    async listarRecalls(query?: RecallsListQuery) {
        return runRequest(async () => (await httpClient.get<RecallResponse[]>(RECALLS, { params: recallsParams(query) })).data);
    },
    async abrirRecall(values: unknown) {
        const payload = parseSchema(abrirRecallSchema, values);
        return runRequest(async () => (await httpClient.post<RecallResponse>(RECALLS, payload)).data);
    },
    async listarLotesRecall(id: string) {
        return runRequest(async () => (await httpClient.get<RecallLoteResponse[]>(`${RECALLS}/${id}/lotes`)).data);
    },
    async adicionarLoteRecall(id: string, loteId: string) {
        const payload = parseSchema(adicionarLoteRecallSchema, { loteId });
        return runRequest(async () => (await httpClient.post<RecallResponse>(`${RECALLS}/${id}/lotes`, payload)).data);
    },
    async encerrarRecall(id: string) {
        return runRequest(async () => (await httpClient.post<RecallResponse>(`${RECALLS}/${id}/encerrar`)).data);
    },
    async cancelarRecall(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<RecallResponse>(`${RECALLS}/${id}/cancelar`, payload)).data);
    }
};
