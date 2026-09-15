import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notaFiscalIntegracoesQueryKey, notaFiscalQueryKey, notaFiscalResumoQueryKey, notaFiscalWorkflowQueryKey, useFiscalMutations } from '@/features/fiscal/hooks/useFiscalResources';
import { fiscalApi } from '@/features/fiscal/api/fiscalApi';

vi.mock('@/features/fiscal/api/fiscalApi', () => ({
    fiscalApi: {
        adicionarImposto: vi.fn(),
        adicionarItem: vi.fn(),
        definirValoresAcessorios: vi.fn()
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

describe('useFiscalMutations — onSettled de D27/D37 (AC-9)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('definirValoresAcessoriosMutation reconsulta a nota mesmo quando o POST rejeita', async () => {
        api.definirValoresAcessorios.mockRejectedValue(new Error('falha simulada'));
        const { result, invalidateSpy } = renderComQueryClient();

        await expect(
            result.current.definirValoresAcessoriosMutation.mutateAsync({ id: notaId, values: { valorFrete: 12.5, valorSeguro: 0, valorOutrasDespesas: 0 } })
        ).rejects.toThrow('falha simulada');

        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notaFiscalQueryKey(notaId) }));
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notaFiscalResumoQueryKey(notaId) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notaFiscalWorkflowQueryKey(notaId) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notaFiscalIntegracoesQueryKey(notaId) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['fiscal', 'notas-fiscais'] });
    });

    it('adicionarImpostoMutation reconsulta a nota mesmo quando o POST rejeita', async () => {
        api.adicionarImposto.mockRejectedValue(new Error('falha simulada'));
        const { result, invalidateSpy } = renderComQueryClient();

        await expect(result.current.adicionarImpostoMutation.mutateAsync({ id: notaId, values: { nome: 'IPI', observacao: 'Motivo.' } })).rejects.toThrow('falha simulada');

        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notaFiscalQueryKey(notaId) }));
    });

    it('definirValoresAcessoriosMutation também reconsulta quando o POST resolve', async () => {
        api.definirValoresAcessorios.mockResolvedValue({ id: notaId } as never);
        const { result, invalidateSpy } = renderComQueryClient();

        await result.current.definirValoresAcessoriosMutation.mutateAsync({ id: notaId, values: { valorFrete: 0, valorSeguro: 0, valorOutrasDespesas: 0 } });

        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notaFiscalQueryKey(notaId) }));
    });

    // Controle negativo (D37): uma mutação fora do escopo desta fatia (onSuccess) não reconsulta no erro.
    it('adicionarItemMutation (fora do escopo de D37) não reconsulta quando o POST rejeita', async () => {
        api.adicionarItem.mockRejectedValue(new Error('falha simulada'));
        const { result, invalidateSpy } = renderComQueryClient();

        await expect(result.current.adicionarItemMutation.mutateAsync({ id: notaId, values: {} })).rejects.toThrow('falha simulada');

        expect(invalidateSpy).not.toHaveBeenCalled();
    });
});
