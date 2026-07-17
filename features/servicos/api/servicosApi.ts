import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    cancelarOrdemServicoSchema,
    criarOrdemServicoSchema,
    encerrarOrdemServicoSchema,
    faturarOrdemServicoSchema,
    itemOrdemServicoSchema,
    planejarOrdemServicoSchema,
    triarOrdemServicoSchema
} from '@/features/servicos/schemas/servicosSchemas';
import { FaturarOrdemServicoResponse, OrdemServicoResponse, OrdensServicoListQuery } from '@/features/servicos/types/servicos.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const params = (query?: OrdensServicoListQuery) =>
    cleanQueryParams({
        empresaId: query?.empresaId,
        filialId: query?.filialId,
        clienteId: query?.clienteId,
        status: query?.status,
        tecnicoResponsavelId: query?.tecnicoResponsavelId,
        termo: query?.termo
    });

const BASE = '/api/servicos/ordens';

export const servicosApi = {
    async listar(query?: OrdensServicoListQuery) {
        return runRequest(async () => {
            const response = await httpClient.get<OrdemServicoResponse[]>(BASE, { params: params(query) });
            return response.data;
        });
    },
    async obter(id: string) {
        return runRequest(async () => {
            const response = await httpClient.get<OrdemServicoResponse>(`${BASE}/${id}`);
            return response.data;
        });
    },
    async criar(values: unknown) {
        const payload = parseSchema(criarOrdemServicoSchema, values);
        return runRequest(async () => {
            const response = await httpClient.post<OrdemServicoResponse>(BASE, payload);
            return response.data;
        });
    },
    async triar(id: string, values: unknown) {
        const payload = parseSchema(triarOrdemServicoSchema, values);
        return runRequest(async () => {
            const response = await httpClient.post<OrdemServicoResponse>(`${BASE}/${id}/triar`, payload);
            return response.data;
        });
    },
    async planejar(id: string, values: unknown) {
        const payload = parseSchema(planejarOrdemServicoSchema, values);
        return runRequest(async () => {
            const response = await httpClient.post<OrdemServicoResponse>(`${BASE}/${id}/planejar`, payload);
            return response.data;
        });
    },
    async iniciarExecucao(id: string) {
        return runRequest(async () => {
            const response = await httpClient.post<OrdemServicoResponse>(`${BASE}/${id}/iniciar-execucao`);
            return response.data;
        });
    },
    async adicionarItem(id: string, values: unknown) {
        const payload = parseSchema(itemOrdemServicoSchema, values);
        return runRequest(async () => {
            const response = await httpClient.post<OrdemServicoResponse>(`${BASE}/${id}/itens`, payload);
            return response.data;
        });
    },
    async encerrar(id: string, values: unknown) {
        const payload = parseSchema(encerrarOrdemServicoSchema, values);
        return runRequest(async () => {
            const response = await httpClient.post<OrdemServicoResponse>(`${BASE}/${id}/encerrar`, payload);
            return response.data;
        });
    },
    async faturar(id: string, values: unknown) {
        const payload = parseSchema(faturarOrdemServicoSchema, values);
        return runRequest(async () => {
            const response = await httpClient.post<FaturarOrdemServicoResponse>(`${BASE}/${id}/faturar`, payload);
            return response.data;
        });
    },
    async cancelar(id: string, motivo: string) {
        const payload = parseSchema(cancelarOrdemServicoSchema, { motivo });
        return runRequest(async () => {
            const response = await httpClient.post<OrdemServicoResponse>(`${BASE}/${id}/cancelar`, payload);
            return response.data;
        });
    }
};
