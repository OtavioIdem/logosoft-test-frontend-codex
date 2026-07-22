import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    abrirInventarioSchema,
    baixarBemSchema,
    cadastrarBemSchema,
    motivoSchema,
    processarDepreciacaoSchema,
    registrarContagemSchema,
    transferirBemSchema
} from '@/features/patrimonio/schemas/patrimonioSchemas';
import {
    BemPatrimonialResponse,
    BensListQuery,
    DepreciacaoResultadoResponse,
    InventarioPatrimonialResponse,
    InventarioPatrimonialResumoResponse,
    InventariosListQuery
} from '@/features/patrimonio/types/patrimonio.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const BENS = '/api/patrimonio/bens';
const DEPRECIACAO = '/api/patrimonio/depreciacao';
const INVENTARIOS = '/api/patrimonio/inventarios';

const bensParams = (query?: BensListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, categoria: query?.categoria, status: query?.status, termo: query?.termo });
const inventariosParams = (query?: InventariosListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status });

export const patrimonioApi = {
    // ---- Bens ----
    async listarBens(query?: BensListQuery) {
        return runRequest(async () => (await httpClient.get<BemPatrimonialResponse[]>(BENS, { params: bensParams(query) })).data);
    },
    async obterBem(id: string) {
        return runRequest(async () => (await httpClient.get<BemPatrimonialResponse>(`${BENS}/${id}`)).data);
    },
    async cadastrarBem(values: unknown) {
        const payload = parseSchema(cadastrarBemSchema, values);
        return runRequest(async () => (await httpClient.post<BemPatrimonialResponse>(BENS, payload)).data);
    },
    async transferirBem(id: string, values: unknown) {
        const payload = parseSchema(transferirBemSchema, values);
        return runRequest(async () => (await httpClient.post<BemPatrimonialResponse>(`${BENS}/${id}/transferir`, payload)).data);
    },
    async bloquearBem(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<BemPatrimonialResponse>(`${BENS}/${id}/bloquear`, payload)).data);
    },
    async desbloquearBem(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<BemPatrimonialResponse>(`${BENS}/${id}/desbloquear`, payload)).data);
    },
    async baixarBem(id: string, values: unknown) {
        const payload = parseSchema(baixarBemSchema, values);
        return runRequest(async () => (await httpClient.post<BemPatrimonialResponse>(`${BENS}/${id}/baixar`, payload)).data);
    },

    // ---- Depreciação ----
    async processarDepreciacao(values: unknown) {
        const payload = parseSchema(processarDepreciacaoSchema, values);
        return runRequest(async () => (await httpClient.post<DepreciacaoResultadoResponse>(`${DEPRECIACAO}/processar`, payload)).data);
    },

    // ---- Inventários ----
    async listarInventarios(query?: InventariosListQuery) {
        return runRequest(async () => (await httpClient.get<InventarioPatrimonialResumoResponse[]>(INVENTARIOS, { params: inventariosParams(query) })).data);
    },
    async obterInventario(id: string) {
        return runRequest(async () => (await httpClient.get<InventarioPatrimonialResponse>(`${INVENTARIOS}/${id}`)).data);
    },
    async abrirInventario(values: unknown) {
        const payload = parseSchema(abrirInventarioSchema, values);
        return runRequest(async () => (await httpClient.post<InventarioPatrimonialResponse>(INVENTARIOS, payload)).data);
    },
    async registrarContagem(id: string, values: unknown) {
        const payload = parseSchema(registrarContagemSchema, values);
        return runRequest(async () => (await httpClient.post<InventarioPatrimonialResponse>(`${INVENTARIOS}/${id}/contagem`, payload)).data);
    },
    async encerrarInventario(id: string) {
        return runRequest(async () => (await httpClient.post<InventarioPatrimonialResponse>(`${INVENTARIOS}/${id}/encerrar`)).data);
    }
};
