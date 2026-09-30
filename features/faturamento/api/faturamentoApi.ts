import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import { cancelarFaturamentoSchema, confirmarFaturamentoSchema, prepararFaturamentoSchema, retomarReversaoLegSchema } from '@/features/faturamento/schemas/faturamentoSchemas';
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

/**
 * D93: o erro sai com `code`, `status`, `traceId` e erros por campo (antes o client trocava tudo por
 * `new Error(message)`). `mapApiError` lê o `apiError` aninhado, então o `ApiErrorPanel` mostra os metadados.
 */
export class FaturamentoApiError extends Error {
    apiError: ReturnType<typeof mapApiError>;

    constructor(apiError: ReturnType<typeof mapApiError>) {
        super(apiError.message);
        this.name = 'FaturamentoApiError';
        this.apiError = apiError;
    }
}

/**
 * D92: houve resposta HTTP (qualquer status)? Sem resposta -- rede, timeout, ou recusa local do schema antes
 * de enviar -- o `status` fica indefinido e o mesmo `correlationId` pode ser reenviado.
 */
export const respostaHttpRecebida = (error: unknown) => typeof mapApiError(error).status === 'number';

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new FaturamentoApiError(mapApiError(error));
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
    },
    async retomarReversao(id: string, values: unknown) {
        const payload = parseSchema(retomarReversaoLegSchema, values);
        return runRequest(async () => {
            const response = await httpClient.post<FaturamentoResponse>(`/api/faturamento/${id}/retomar-reversao`, payload);
            return response.data;
        });
    }
};
