import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    ajusteEstoqueSchema,
    bloqueioEstoqueSchema,
    cancelarInventarioSchema,
    concluirInventarioSchema,
    criarInventarioSchema,
    encerrarBloqueioSchema,
    itemInventarioSchema
} from '@/features/estoque-avancado/schemas/estoqueAvancadoSchemas';
import {
    AjusteEstoqueResponse,
    BloqueioEstoqueResponse,
    InventarioEstoqueResponse,
    InventarioEstoqueResumoResponse,
    InventarioPaginado,
    InventariosListQuery
} from '@/features/estoque-avancado/types/estoqueAvancado.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const params = (query?: InventariosListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, localEstoqueId: query?.localEstoqueId, status: query?.status, page: query?.page, pageSize: query?.pageSize });

type RawList = InventarioEstoqueResumoResponse[] | InventarioPaginado | { resultado: InventarioPaginado };

const normalizePaged = (data: RawList, query?: InventariosListQuery): InventarioPaginado => {
    if (Array.isArray(data)) {
        return { items: data, page: query?.page ?? 1, pageSize: query?.pageSize ?? (data.length || 20), totalItems: data.length, totalPages: 1 };
    }
    if ('resultado' in data && data.resultado) return data.resultado;
    return data as InventarioPaginado;
};

export const estoqueAvancadoApi = {
    async listarInventarios(query?: InventariosListQuery) {
        return runRequest(async () => {
            const response = await httpClient.get<RawList>('/api/estoque/avancado/inventarios', { params: params(query) });
            return normalizePaged(response.data, query);
        });
    },
    async obterInventario(id: string) {
        return runRequest(async () => (await httpClient.get<InventarioEstoqueResponse>(`/api/estoque/avancado/inventarios/${id}`)).data);
    },
    async criarInventario(values: unknown) {
        const payload = parseSchema(criarInventarioSchema, values);
        return runRequest(async () => (await httpClient.post<InventarioEstoqueResponse>('/api/estoque/avancado/inventarios', payload)).data);
    },
    async adicionarItem(id: string, values: unknown) {
        const payload = parseSchema(itemInventarioSchema, values);
        return runRequest(async () => (await httpClient.post<InventarioEstoqueResponse>(`/api/estoque/avancado/inventarios/${id}/itens`, payload)).data);
    },
    async iniciarContagem(id: string) {
        return runRequest(async () => (await httpClient.post<InventarioEstoqueResponse>(`/api/estoque/avancado/inventarios/${id}/iniciar-contagem`)).data);
    },
    async concluirInventario(id: string, values: unknown) {
        const payload = parseSchema(concluirInventarioSchema, values);
        return runRequest(async () => (await httpClient.post<InventarioEstoqueResponse>(`/api/estoque/avancado/inventarios/${id}/concluir`, payload)).data);
    },
    async cancelarInventario(id: string, motivo: string) {
        const payload = parseSchema(cancelarInventarioSchema, { motivo });
        return runRequest(async () => (await httpClient.post<InventarioEstoqueResponse>(`/api/estoque/avancado/inventarios/${id}/cancelar`, payload)).data);
    },
    async criarAjuste(values: unknown) {
        const payload = parseSchema(ajusteEstoqueSchema, values);
        return runRequest(async () => (await httpClient.post<AjusteEstoqueResponse>('/api/estoque/avancado/ajustes', payload)).data);
    },
    async criarBloqueio(values: unknown) {
        const payload = parseSchema(bloqueioEstoqueSchema, values);
        return runRequest(async () => (await httpClient.post<BloqueioEstoqueResponse>('/api/estoque/avancado/bloqueios', payload)).data);
    },
    async liberarBloqueio(id: string, motivo: string) {
        const payload = parseSchema(encerrarBloqueioSchema, { motivo });
        return runRequest(async () => (await httpClient.post<BloqueioEstoqueResponse>(`/api/estoque/avancado/bloqueios/${id}/liberar`, payload)).data);
    },
    async cancelarBloqueio(id: string, motivo: string) {
        const payload = parseSchema(encerrarBloqueioSchema, { motivo });
        return runRequest(async () => (await httpClient.post<BloqueioEstoqueResponse>(`/api/estoque/avancado/bloqueios/${id}/cancelar`, payload)).data);
    }
};
