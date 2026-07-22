import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    criarContratoSchema,
    gerarFaturamentoSchema,
    motivoSchema,
    reajustarContratoSchema,
    renovarContratoSchema
} from '@/features/contratos/schemas/contratosSchemas';
import { ContratoResponse, ContratosListQuery, FaturamentoContratoResponse } from '@/features/contratos/types/contratos.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const BASE = '/api/contratos';
const params = (query?: ContratosListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, clienteId: query?.clienteId, status: query?.status, termo: query?.termo });

export const contratosApi = {
    async listar(query?: ContratosListQuery) {
        return runRequest(async () => (await httpClient.get<ContratoResponse[]>(BASE, { params: params(query) })).data);
    },
    async obter(id: string) {
        return runRequest(async () => (await httpClient.get<ContratoResponse>(`${BASE}/${id}`)).data);
    },
    async criar(values: unknown) {
        const payload = parseSchema(criarContratoSchema, values);
        return runRequest(async () => (await httpClient.post<ContratoResponse>(BASE, payload)).data);
    },
    async atualizar(id: string, values: unknown) {
        const payload = parseSchema(criarContratoSchema, values);
        return runRequest(async () => (await httpClient.put<ContratoResponse>(`${BASE}/${id}`, payload)).data);
    },
    async aprovar(id: string) {
        return runRequest(async () => (await httpClient.post<ContratoResponse>(`${BASE}/${id}/aprovar`)).data);
    },
    async reajustar(id: string, percentual: number) {
        const payload = parseSchema(reajustarContratoSchema, { percentual });
        return runRequest(async () => (await httpClient.post<ContratoResponse>(`${BASE}/${id}/reajustar`, payload)).data);
    },
    async renovar(id: string, novaDataFim: unknown) {
        const payload = parseSchema(renovarContratoSchema, { novaDataFim });
        return runRequest(async () => (await httpClient.post<ContratoResponse>(`${BASE}/${id}/renovar`, payload)).data);
    },
    async encerrar(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<ContratoResponse>(`${BASE}/${id}/encerrar`, payload)).data);
    },
    async cancelar(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<ContratoResponse>(`${BASE}/${id}/cancelar`, payload)).data);
    },
    async gerarFaturamento(id: string, values: unknown) {
        const payload = parseSchema(gerarFaturamentoSchema, values);
        return runRequest(async () => (await httpClient.post<FaturamentoContratoResponse>(`${BASE}/${id}/faturamentos`, payload)).data);
    }
};
