import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams } from '@/lib/http/requestUtils';
import {
    ContagemNotificacoes,
    ContagemQuery,
    NotificacaoResponse,
    NotificacoesListQuery,
    NotificacoesPaginadas
} from '@/features/notificacoes/types/notificacoes.types';

type NotificacoesListResponse = NotificacaoResponse[] | NotificacoesPaginadas;

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const listParams = (query?: NotificacoesListQuery) =>
    cleanQueryParams({
        empresaId: query?.empresaId,
        filialId: query?.filialId,
        situacao: query?.situacao,
        severidade: query?.severidade,
        categoria: query?.categoria,
        moduloOrigem: query?.moduloOrigem,
        incluirExpiradas: query?.incluirExpiradas,
        page: query?.page,
        pageSize: query?.pageSize
    });

const emptyPaged = (query?: NotificacoesListQuery): NotificacoesPaginadas => ({
    items: [],
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? 20,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false
});

const normalizePaged = (data: NotificacoesListResponse, query?: NotificacoesListQuery): NotificacoesPaginadas => {
    if (!Array.isArray(data)) return data;
    return { ...emptyPaged(query), items: data, pageSize: query?.pageSize ?? (data.length || 20), totalItems: data.length, totalPages: 1 };
};

export const notificacoesApi = {
    async listar(query?: NotificacoesListQuery) {
        return runRequest(async () => {
            const response = await httpClient.get<NotificacoesListResponse>('/api/notificacoes', { params: listParams(query) });
            return normalizePaged(response.data, query);
        });
    },
    async contarNaoLidas(query?: ContagemQuery) {
        return runRequest(async () => {
            const response = await httpClient.get<ContagemNotificacoes>('/api/notificacoes/nao-lidas/contagem', {
                params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId })
            });
            return response.data;
        });
    },
    async marcarLida(id: string) {
        return runRequest(async () => {
            const response = await httpClient.post<NotificacaoResponse>(`/api/notificacoes/${id}/marcar-lida`);
            return response.data;
        });
    },
    async marcarTodasLidas(query?: ContagemQuery) {
        return runRequest(async () => {
            await httpClient.post<void>('/api/notificacoes/marcar-todas-lidas', null, {
                params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId })
            });
        });
    },
    async arquivar(id: string) {
        return runRequest(async () => {
            const response = await httpClient.post<NotificacaoResponse>(`/api/notificacoes/${id}/arquivar`);
            return response.data;
        });
    }
};
