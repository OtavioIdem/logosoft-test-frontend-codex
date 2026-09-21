import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useSeriesFiscaisMutations } from '@/features/fiscal/hooks/useSeriesFiscais';
import { seriesFiscaisApi } from '@/features/fiscal/api/seriesFiscaisApi';

const wrapperFor = (client: QueryClient) => ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const id = '11111111-1111-1111-1111-111111111111';

describe('useSeriesFiscaisMutations — AC-5/P-14a', () => {
    it.each([
        ['criarMutation', () => ({ empresaId: id })],
        ['ampliarMutation', () => ({ id, numeroFinalAtual: 10, values: { novoNumeroFinal: 11 } })],
        ['encerrarVigenciaMutation', () => ({ id, vigenciaInicioSerie: '2026-01-01', values: { vigenciaFim: '2026-12-31' } })],
        ['inativarMutation', () => ({ id, values: { motivo: 'Encerrada' } })]
    ] as const)('%s invalida a família nominal de séries ao concluir', async (mutationName, values) => {
        const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
        const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
        vi.spyOn(seriesFiscaisApi, 'criar').mockResolvedValue({} as never);
        vi.spyOn(seriesFiscaisApi, 'ampliar').mockResolvedValue({} as never);
        vi.spyOn(seriesFiscaisApi, 'encerrarVigencia').mockResolvedValue({} as never);
        vi.spyOn(seriesFiscaisApi, 'inativar').mockResolvedValue();
        const { result } = renderHook(() => useSeriesFiscaisMutations(), { wrapper: wrapperFor(client) });
        await (result.current as any)[mutationName].mutateAsync(values());
        await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['fiscal', 'series'] }));
    });

    it('invalida após rejeição, impedindo que dado antigo sobreviva ao erro da mutação', async () => {
        const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
        const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
        vi.spyOn(seriesFiscaisApi, 'criar').mockRejectedValue(new Error('Falha controlada'));
        const { result } = renderHook(() => useSeriesFiscaisMutations(), { wrapper: wrapperFor(client) });
        await expect(result.current.criarMutation.mutateAsync({ empresaId: id })).rejects.toThrow('Falha controlada');
        await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['fiscal', 'series'] }));
    });
});
