import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import { atualizarClienteSchema, clienteMotivoSchema, criarClienteSchema } from '@/features/clientes/schemas/clientesSchemas';
import { AtualizarClienteRequest, ClienteListQuery, ClienteMotivoRequest, ClienteResponse, CriarClienteRequest } from '@/features/clientes/types/clientes.types';

const runClienteRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

const parseSchema = <T>(schema: { parse: (value: unknown) => T }, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const params = (query?: ClienteListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, termo: query?.termo });

export const buildCriarClientePayload = (values: unknown): CriarClienteRequest => parseSchema(criarClienteSchema, values);
export const buildAtualizarClientePayload = (values: unknown): AtualizarClienteRequest => parseSchema(atualizarClienteSchema, values);
export const buildClienteMotivoPayload = (motivo: string): ClienteMotivoRequest => parseSchema(clienteMotivoSchema, { motivo });

export const clientesApi = {
    async listar(query?: ClienteListQuery) {
        return runClienteRequest(async () => {
            const response = await httpClient.get<ClienteResponse[]>('/api/clientes', { params: params(query) });
            return response.data;
        });
    },
    async criar(values: unknown) {
        const payload = buildCriarClientePayload(values);
        return runClienteRequest(async () => {
            const response = await httpClient.post<ClienteResponse>('/api/clientes', payload);
            return response.data;
        });
    },
    async atualizar(id: string, values: unknown) {
        const payload = buildAtualizarClientePayload(values);
        return runClienteRequest(async () => {
            const response = await httpClient.put<ClienteResponse>(`/api/clientes/${id}`, payload);
            return response.data;
        });
    },
    async bloquearCredito(id: string, motivo: string) {
        const payload = buildClienteMotivoPayload(motivo);
        return runClienteRequest(async () => {
            await httpClient.post<void>(`/api/clientes/${id}/bloquear-credito`, payload);
        });
    },
    async desbloquearCredito(id: string, motivo: string) {
        const payload = buildClienteMotivoPayload(motivo);
        return runClienteRequest(async () => {
            await httpClient.post<void>(`/api/clientes/${id}/desbloquear-credito`, payload);
        });
    },
    async inativar(id: string, motivo: string) {
        const payload = buildClienteMotivoPayload(motivo);
        return runClienteRequest(async () => {
            await httpClient.post<void>(`/api/clientes/${id}/inativar`, payload);
        });
    }
};
