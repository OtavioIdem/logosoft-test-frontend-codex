import { AxiosResponse } from 'axios';
import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { appConfig } from '@/config/app';
import { ApiError, ApiResult, PagedResult } from '@/types/erp';
import { cleanQueryParams, sanitizePayload, toTermQueryParams } from '@/lib/http/requestUtils';
import { ResourceAction, ResourceDefinition, ResourceQuery, ResourceSavePayload } from '@/features/shared/types/resource.types';

type ApiPayload<T> = ApiResult<T> | T | '' | null | undefined;
type ResourceRecord = Record<string, unknown>;

export class ApiClientError extends Error {
    apiError: ApiError;

    constructor(apiError: ApiError) {
        super(apiError.message);
        this.name = 'ApiClientError';
        this.apiError = apiError;
    }
}

type ResourceClient = {
    list(query?: ResourceQuery): Promise<PagedResult<ResourceRecord>>;
    get(id: string): Promise<ResourceRecord>;
    save(payload: ResourceSavePayload): Promise<ResourceRecord>;
    applyAction(id: string, action: Pick<ResourceAction, 'key' | 'apiAction'>, reason?: string): Promise<ResourceRecord>;
};

const paramsFromQuery = (query: ResourceQuery) =>
    toTermQueryParams({
        search: query.search,
        sortField: query.sortField,
        sortOrder: query.sortOrder ?? undefined
    });

const isApiResult = <T>(payload: ApiPayload<T>): payload is ApiResult<T> => typeof payload === 'object' && payload !== null && 'success' in payload;

const unwrapResponse = <T>(response: AxiosResponse<ApiPayload<T>>): T => {
    const payload = response.data;

    if (payload === '' || payload === null || payload === undefined) {
        return {} as T;
    }

    if (isApiResult<T>(payload)) {
        if (!payload.success) {
            throw new ApiClientError(payload.error ?? { message: 'A API retornou erro ao processar a solicitação.' });
        }

        if (payload.data === undefined) {
            return {} as T;
        }

        return payload.data;
    }

    return payload;
};

const normalizePagedResult = (payload: PagedResult<ResourceRecord> | ResourceRecord[]): PagedResult<ResourceRecord> => {
    if (Array.isArray(payload)) {
        return {
            items: payload,
            page: 1,
            pageSize: payload.length,
            totalItems: payload.length,
            totalPages: 1
        };
    }

    return payload;
};

const execute = async <T>(request: () => Promise<AxiosResponse<ApiPayload<T>>>): Promise<T> => {
    try {
        return unwrapResponse(await request());
    } catch (error) {
        if (error instanceof ApiClientError) {
            throw error;
        }

        throw new ApiClientError(mapApiError(error));
    }
};

const actionEndpointId = (action: Pick<ResourceAction, 'key' | 'apiAction'>) => action.apiAction ?? action.key;

const splitPayloadId = (payload: ResourceSavePayload) => {
    const { id, ...body } = payload;
    return {
        id,
        body: sanitizePayload(body) as ResourceRecord
    };
};

const createAxiosResourceClient = (definition: ResourceDefinition): ResourceClient => ({
    async list(query: ResourceQuery = {}) {
        const payload = await execute<PagedResult<ResourceRecord> | ResourceRecord[]>(() =>
            httpClient.get(definition.endpoint, { params: paramsFromQuery(query) })
        );
        return normalizePagedResult(payload);
    },

    async get(id: string) {
        return execute<ResourceRecord>(() => httpClient.get(`${definition.endpoint}/${id}`));
    },

    async save(payload: ResourceSavePayload) {
        const { id, body } = splitPayloadId(payload);

        if (id) {
            return execute<ResourceRecord>(() => httpClient.put(`${definition.endpoint}/${id}`, body));
        }

        return execute<ResourceRecord>(() => httpClient.post(definition.endpoint, body));
    },

    async applyAction(id: string, action: Pick<ResourceAction, 'key' | 'apiAction'>, reason?: string) {
        const endpoint = `${definition.endpoint}/${id}/${actionEndpointId(action)}`;
        const body = reason ? cleanQueryParams({ motivo: reason }) : undefined;
        return execute<ResourceRecord>(() => httpClient.post(endpoint, body));
    }
});

const createMockProxyClient = (definition: ResourceDefinition): ResourceClient => ({
    async list(query: ResourceQuery = {}) {
        const { createMockResourceClient } = await import('@/features/shared/api/resourceMockClient');
        return createMockResourceClient(definition).list(query);
    },

    async get(id: string) {
        const { createMockResourceClient } = await import('@/features/shared/api/resourceMockClient');
        return createMockResourceClient(definition).get(id);
    },

    async save(payload: ResourceSavePayload) {
        const { createMockResourceClient } = await import('@/features/shared/api/resourceMockClient');
        return createMockResourceClient(definition).save(payload);
    },

    async applyAction(id: string, action: Pick<ResourceAction, 'key' | 'apiAction'>, reason?: string) {
        const { createMockResourceClient } = await import('@/features/shared/api/resourceMockClient');
        return createMockResourceClient(definition).applyAction(id, action, reason);
    }
});

export const createResourceClient = (definition: ResourceDefinition): ResourceClient => (appConfig.useMockApi ? createMockProxyClient(definition) : createAxiosResourceClient(definition));
