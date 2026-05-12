import { rawHttpClient } from '@/lib/http/httpClient';

export type HealthResponse = {
    status: string;
    service: string;
    utcNow: string;
};

export const healthApi = {
    async check() {
        const response = await rawHttpClient.get<HealthResponse>('/api/health');
        return response.data;
    }
};
