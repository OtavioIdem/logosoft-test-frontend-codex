import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notaFiscalIntegracoesQueryKey, notaFiscalQueryKey, notaFiscalResumoQueryKey, notaFiscalWorkflowQueryKey, useFiscalMutations } from '@/features/fiscal/hooks/useFiscalResources';
import { fiscalApi } from '@/features/fiscal/api/fiscalApi';

// AC-10 (v1.11.0a8b57): transmitirMutation, reprocessarMutation e consultarProtocoloMutation trocam onSuccess por
// onSettled -- a integração continua atualizada mesmo quando o POST é rejeitado (409, validação etc).
vi.mock('@/features/fiscal/api/fiscalApi', () => ({
    fiscalApi: {
        transmitirSefaz: vi.fn(),
        reprocessarSefaz: vi.fn(),
        consultarProtocoloSefaz: vi.fn(),
        cancelarSefaz: vi.fn()
    }
}));

const api = vi.mocked(fiscalApi);
const notaId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const renderComQueryClient = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useFiscalMutations(), { wrapper: Wrapper });
    return { result, invalidateSpy };
};

describe('useFiscalMutations — onSettled de D43/D37 (AC-10)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('transmitirMutation reconsulta nota, resumo, workflow e integrações mesmo quando o POST rejeita', async () => {
        api.transmitirSefaz.mockRejectedValue(new Error('falha simulada'));
        const { result, invalidateSpy } = renderComQueryClient();

        await expect(
            result.current.transmitirMutation.mutateAsync({ id: notaId, values: { correlationId: 'front-transmitir-20260916-abc123' } })
        ).rejects.toThrow('falha simulada');

        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notaFiscalQueryKey(notaId) }));
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notaFiscalResumoQueryKey(notaId) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notaFiscalWorkflowQueryKey(notaId) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notaFiscalIntegracoesQueryKey(notaId) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fiscal', 'notas-fiscais'] });
    });

    it('reprocessarMutation reconsulta a nota mesmo quando o POST rejeita', async () => {
        api.reprocessarSefaz.mockRejectedValue(new Error('IntegracaoFiscalJaProcessada'));
        const { result, invalidateSpy } = renderComQueryClient();

        await expect(
            result.current.reprocessarMutation.mutateAsync({ id: notaId, values: { correlationId: 'front-reprocessar-20260916-def456', motivo: 'Retry manual' } })
        ).rejects.toThrow('IntegracaoFiscalJaProcessada');

        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notaFiscalQueryKey(notaId) }));
    });

    it('consultarProtocoloMutation reconsulta a nota mesmo quando o POST rejeita', async () => {
        api.consultarProtocoloSefaz.mockRejectedValue(new Error('falha simulada'));
        const { result, invalidateSpy } = renderComQueryClient();

        await expect(result.current.consultarProtocoloMutation.mutateAsync({ id: notaId, values: {} })).rejects.toThrow('falha simulada');

        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notaFiscalQueryKey(notaId) }));
    });

    it('as três mutações também reconsultam quando o POST resolve (onSettled cobre sucesso e erro)', async () => {
        api.transmitirSefaz.mockResolvedValue({ notaFiscalId: notaId } as never);
        const { result, invalidateSpy } = renderComQueryClient();

        await result.current.transmitirMutation.mutateAsync({ id: notaId, values: { correlationId: 'front-transmitir-20260916-abc123' } });

        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notaFiscalQueryKey(notaId) }));
    });

    // Controle negativo (D37): mutação fora do escopo desta fatia (onSuccess) não reconsulta no erro.
    it('cancelarSefazMutation (fora do escopo de D37/D43) não reconsulta quando o POST rejeita', async () => {
        api.cancelarSefaz.mockRejectedValue(new Error('falha simulada'));
        const { result, invalidateSpy } = renderComQueryClient();

        await expect(result.current.cancelarSefazMutation.mutateAsync({ id: notaId, values: {} })).rejects.toThrow('falha simulada');

        expect(invalidateSpy).not.toHaveBeenCalled();
    });
});
