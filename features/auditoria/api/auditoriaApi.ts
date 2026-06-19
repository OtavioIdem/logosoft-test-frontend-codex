import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import { AuditoriaEventoResponse, AuditoriaOperacionalQuery, AuditoriaOperacionalResponse } from '@/features/auditoria/types/auditoria.types';
import { auditoriaOperacionalQuerySchema } from '@/features/auditoria/schemas/auditoriaSchemas';

type Schema<T> = { parse: (value: unknown) => T };

const runAuditoriaRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
export const buildAuditoriaOperacionalQuery = (values: unknown): AuditoriaOperacionalQuery => parseSchema(auditoriaOperacionalQuerySchema, values);

const params = (query?: AuditoriaOperacionalQuery) => {
    const payload = buildAuditoriaOperacionalQuery(query ?? {});
    return cleanQueryParams({
        empresaId: payload.empresaId,
        filialId: payload.filialId,
        usuarioId: payload.usuarioId,
        modulo: payload.modulo,
        entidade: payload.entidade,
        entidadeId: payload.entidadeId,
        acao: payload.acao,
        termo: payload.termo,
        dataInicial: payload.dataInicial,
        dataFinal: payload.dataFinal,
        page: payload.page ?? 1,
        pageSize: payload.pageSize ?? 20
    });
};

export const auditoriaApi = {
    async listarEventos() {
        return runAuditoriaRequest(async () => {
            const response = await httpClient.get<AuditoriaEventoResponse[]>('/api/auditoria/eventos');
            return response.data;
        });
    },

    async listarEventosRecentes() {
        return runAuditoriaRequest(async () => {
            const response = await httpClient.get<AuditoriaEventoResponse[]>('/api/auditoria/eventos-recentes');
            return response.data;
        });
    },

    async consultarOperacional(query?: AuditoriaOperacionalQuery) {
        return runAuditoriaRequest(async () => {
            const response = await httpClient.get<AuditoriaOperacionalResponse>('/api/auditoria/operacional', { params: params(query) });
            return response.data;
        });
    }
};
