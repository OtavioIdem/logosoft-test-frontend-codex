import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { administracaoApi } from '@/features/administracao/api/administracaoApi';
import { httpClient } from '@/lib/http/httpClient';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const snapshot = { empresaId, filialId: null, isMaster: true, revision: 3 } as const;

describe('transporte do lookup de filiais', () => {
    const originalAdapter = httpClient.defaults.adapter;

    afterEach(() => {
        httpClient.defaults.adapter = originalAdapter;
        vi.restoreAllMocks();
    });

    it('envia GET canônico somente com empresaId e metadata lookup', async () => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
            data: [{ id: filialId, empresaId, nome: 'Filial teste', documento: '' }],
            status: 200,
            statusText: 'OK',
            headers: {},
            config
        }));
        httpClient.defaults.adapter = adapter;

        await expect(administracaoApi.listarFiliais({ empresaId }, snapshot)).resolves.toEqual([
            { id: filialId, empresaId, nome: 'Filial teste', documento: '' }
        ]);

        expect(adapter).toHaveBeenCalledTimes(1);
        const request = adapter.mock.calls[0][0];
        expect(request.method).toBe('get');
        expect(request.url).toBe('/api/administracao/filiais');
        expect(request.params).toEqual({ empresaId });
        expect(request.params.filialId).toBeUndefined();
        expect(request.organizationalContext).toMatchObject({
            scope: 'lookup',
            required: true,
            includeFilial: false,
            snapshot
        });
    });
});
