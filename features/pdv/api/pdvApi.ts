import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import { abrirCaixaSchema, fecharCaixaSchema, movimentoCaixaSchema, registrarVendaPdvSchema } from '@/features/pdv/schemas/pdvSchemas';
import { CaixaResponse, CaixasListQuery, VendaPdvResponse, VendasPdvListQuery } from '@/features/pdv/types/pdv.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const caixasParams = (query?: CaixasListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status, operadorId: query?.operadorId });
const vendasParams = (query?: VendasPdvListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, caixaId: query?.caixaId, status: query?.status });

export const caixasApi = {
    async listar(query?: CaixasListQuery) {
        return runRequest(async () => {
            const response = await httpClient.get<CaixaResponse[]>('/api/pdv/caixas', { params: caixasParams(query) });
            return response.data;
        });
    },
    async obter(id: string) {
        return runRequest(async () => {
            const response = await httpClient.get<CaixaResponse>(`/api/pdv/caixas/${id}`);
            return response.data;
        });
    },
    async abrir(values: unknown) {
        const payload = parseSchema(abrirCaixaSchema, values);
        return runRequest(async () => {
            const response = await httpClient.post<CaixaResponse>('/api/pdv/caixas/abrir', payload);
            return response.data;
        });
    },
    async suprimento(id: string, values: unknown) {
        const payload = parseSchema(movimentoCaixaSchema, values);
        return runRequest(async () => {
            const response = await httpClient.post<CaixaResponse>(`/api/pdv/caixas/${id}/suprimento`, payload);
            return response.data;
        });
    },
    async sangria(id: string, values: unknown) {
        const payload = parseSchema(movimentoCaixaSchema, values);
        return runRequest(async () => {
            const response = await httpClient.post<CaixaResponse>(`/api/pdv/caixas/${id}/sangria`, payload);
            return response.data;
        });
    },
    async fechar(id: string, values: unknown) {
        const payload = parseSchema(fecharCaixaSchema, values);
        return runRequest(async () => {
            const response = await httpClient.post<CaixaResponse>(`/api/pdv/caixas/${id}/fechar`, payload);
            return response.data;
        });
    }
};

export const vendasPdvApi = {
    async listar(query?: VendasPdvListQuery) {
        return runRequest(async () => {
            const response = await httpClient.get<VendaPdvResponse[]>('/api/pdv/vendas', { params: vendasParams(query) });
            return response.data;
        });
    },
    async obter(id: string) {
        return runRequest(async () => {
            const response = await httpClient.get<VendaPdvResponse>(`/api/pdv/vendas/${id}`);
            return response.data;
        });
    },
    async registrar(values: unknown) {
        const payload = parseSchema(registrarVendaPdvSchema, values);
        return runRequest(async () => {
            const response = await httpClient.post<VendaPdvResponse>('/api/pdv/vendas', payload);
            return response.data;
        });
    }
};
