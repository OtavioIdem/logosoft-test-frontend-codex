import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { AuditoriaEventoResponse } from '@/features/auditoria/types/auditoria.types';

const runAuditoriaRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

export const auditoriaApi = {
    async listarEventos() {
        return runAuditoriaRequest(async () => {
            const response = await httpClient.get<AuditoriaEventoResponse[]>('/api/auditoria/eventos');
            return response.data;
        });
    }
};
