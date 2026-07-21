import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import { criarChecklistItemSchema, criarDeploySchema, motivoSchema, resultadoChecklistSchema } from '@/features/deploy/schemas/deploySchemas';
import {
    AmbienteResponse,
    DeployResponse,
    DeployResumoResponse,
    DeploysListQuery,
    ItemChecklistDeployResponse,
    MigracoesResponse
} from '@/features/deploy/types/deploy.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const BASE = '/api/deploy';

export const deployApi = {
    async ambiente() {
        return runRequest(async () => (await httpClient.get<AmbienteResponse>(`${BASE}/ambiente`)).data);
    },
    async migracoes() {
        return runRequest(async () => (await httpClient.get<MigracoesResponse>(`${BASE}/migracoes`)).data);
    },
    async listar(query?: DeploysListQuery) {
        return runRequest(async () => (await httpClient.get<DeployResumoResponse[]>(BASE, { params: cleanQueryParams({ status: query?.status, ambiente: query?.ambiente }) })).data);
    },
    async obter(id: string) {
        return runRequest(async () => (await httpClient.get<DeployResponse>(`${BASE}/${id}`)).data);
    },
    async checklist(id: string) {
        return runRequest(async () => (await httpClient.get<ItemChecklistDeployResponse[]>(`${BASE}/${id}/checklist`)).data);
    },
    async criar(values: unknown) {
        const payload = parseSchema(criarDeploySchema, values);
        return runRequest(async () => (await httpClient.post<DeployResponse>(BASE, payload)).data);
    },
    async concluir(id: string) {
        return runRequest(async () => (await httpClient.post<DeployResponse>(`${BASE}/${id}/concluir`)).data);
    },
    async falhar(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<DeployResponse>(`${BASE}/${id}/falhar`, payload)).data);
    },
    async reverter(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<DeployResponse>(`${BASE}/${id}/reverter`, payload)).data);
    },
    async adicionarItemChecklist(values: unknown) {
        const payload = parseSchema(criarChecklistItemSchema, values);
        return runRequest(async () => (await httpClient.post<DeployResponse>(`${BASE}/checklist`, payload)).data);
    },
    async registrarResultadoChecklist(itemId: string, values: unknown) {
        const payload = parseSchema(resultadoChecklistSchema, values);
        return runRequest(async () => (await httpClient.post<DeployResponse>(`${BASE}/checklist/${itemId}/resultado`, payload)).data);
    }
};
