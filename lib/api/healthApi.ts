import { rawHttpClient } from '@/lib/http/httpClient';

/**
 * Bloco opcional do health (backend v1.26.16/G3): só existe com opt-in fora de Production. `mock` é a prova de que a
 * SEFAZ é simulada; `ambiente` é informativo. Ausência do bloco NÃO prova SEFAZ real.
 */
export type HealthFiscalBloco = {
    mock: boolean;
    ambiente: string;
};

export type HealthResponse = {
    status: string;
    service: string;
    utcNow: string;
    fiscal?: HealthFiscalBloco | null;
};

export const healthApi = {
    async check() {
        const response = await rawHttpClient.get<HealthResponse>('/api/health');
        return response.data;
    }
};
