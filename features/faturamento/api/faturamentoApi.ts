import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import { cancelarFaturamentoSchema, confirmarFaturamentoSchema, prepararFaturamentoSchema } from '@/features/faturamento/schemas/faturamentoSchemas';
import {
    ConfirmarFaturamentoResponse,
    FaturamentoHistoricoResponse,
    FaturamentoOcorrenciaResponse,
    FaturamentoPaginado,
    FaturamentoResponse,
    FaturamentosListQuery,
    PrepararFaturamentoResponse
} from '@/features/faturamento/types/faturamento.types';

type Schema<T> = { parse: (value: unknown) => T };
type FaturamentosListResponse = FaturamentoResponse[] | FaturamentoPaginado;

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const params = (query?: FaturamentosListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, pedidoVendaId: query?.pedidoVendaId, etapa: query?.etapa, page: query?.page, pageSize: query?.pageSize });

const normalizePaged = (data: FaturamentosListResponse, query?: FaturamentosListQuery): FaturamentoPaginado => {
    if (!Array.isArray(data)) return data;
    return { items: data, page: query?.page ?? 1, pageSize: query?.pageSize ?? (data.length || 20), totalItems: data.length, totalPages: 1 };
};

export const faturamentoApi = {
    async listar(query?: FaturamentosListQuery) {
        return runRequest(async () => {
            const response = await httpClient.get<FaturamentosListResponse>('/api/faturamento', { params: params(query) });
            return normalizePaged(response.data, query);
        });
    },
    async obter(id: string) {
        return runRequest(async () => {
            const response = await httpClient.get<FaturamentoResponse>(`/api/faturamento/${id}`);
            return response.data;
        });
    },
    async historico(id: string) {
        return runRequest(async () => {
            const response = await httpClient.get<FaturamentoHistoricoResponse[]>(`/api/faturamento/${id}/historico`);
            return response.data;
        });
    },
    async ocorrencias(id: string) {
        return runRequest(async () => {
            const response = await httpClient.get<FaturamentoOcorrenciaResponse[]>(`/api/faturamento/${id}/ocorrencias`);
            return response.data;
        });
    },
    async preparar(values: unknown) {
        const payload = parseSchema(prepararFaturamentoSchema, values);
        return runRequest(async () => {
            const response = await httpClient.post<PrepararFaturamentoResponse>('/api/faturamento/preparar', payload);
            return response.data;
        });
    },
    async confirmar(id: string, values: unknown) {
        const payload = parseSchema(confirmarFaturamentoSchema, values);
        return runRequest(async () => {
            const response = await httpClient.post<ConfirmarFaturamentoResponse>(`/api/faturamento/${id}/confirmar`, payload);
            return response.data;
        });
    },
    async cancelar(id: string, motivo: string) {
        const payload = parseSchema(cancelarFaturamentoSchema, { motivo });
        return runRequest(async () => {
            const response = await httpClient.post<FaturamentoResponse>(`/api/faturamento/${id}/cancelar`, payload);
            return response.data;
        });
    }
};
