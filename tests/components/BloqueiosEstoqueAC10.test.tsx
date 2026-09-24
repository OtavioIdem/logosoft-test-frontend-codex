import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BloqueiosEstoqueTab } from '@/features/estoque-avancado/components/BloqueiosEstoqueTab';

/**
 * AC-10 da fatia v1.11.0a8b68.
 *
 * Bloqueios com texto de apoio explicando a ausência de busca por listagem.
 * O campo ID do bloqueio recebe um texto informativo sobre o ponto de liberação.
 *
 * O componente é mapeado para renderizar no jsdom; a mutação é real,
 * apenas a API é mockada.
 */

const { toastMock } = vi.hoisted(() => ({
    toastMock: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn() }
}));

vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => toastMock }));

vi.mock('@/features/estoque-avancado/hooks/useEstoqueAvancadoResources', () => ({
    useBloqueioEstoqueMutations: vi.fn(() => ({
        criarMutation: { mutateAsync: vi.fn(), isPending: false },
        liberarMutation: { mutateAsync: vi.fn(), isPending: false },
        cancelarMutation: { mutateAsync: vi.fn(), isPending: false }
    }))
}));

vi.mock('@/features/estoque/hooks/useEstoqueResources', () => ({
    useLocaisEstoque: vi.fn(() => ({ data: [], isFetching: false, isLoading: false })),
    useProdutos: vi.fn(() => ({ data: [], isFetching: false, isLoading: false }))
}));

vi.mock('@/features/produtos/hooks/useProdutosResources', () => ({
    useProdutos: vi.fn(() => ({ data: [], isFetching: false, isLoading: false }))
}));

vi.mock('@/hooks/useOrganizationalContext', () => ({
    useOrganizationalContext: () => ({
        snapshot: { empresaId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', filialId: null, isMaster: true, revision: 1 }
    })
}));

vi.mock('@/features/auth/hooks/usePermissions', () => ({
    usePermissions: () => ({
        hasPermission: vi.fn(() => true),
        hasAnyPermission: vi.fn(() => true),
        hasAllPermissions: vi.fn(() => true)
    })
}));

describe('BloqueiosEstoque — v1.11.0a8b68 — AC-10', () => {
    describe('AC-10: Bloqueios com texto de apoio explicando ausência de busca', () => {
        it('o texto de apoio aparece junto do campo ID de bloqueio, explicando a ausência de listagem', () => {
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <BloqueiosEstoqueTab />
                </QueryClientProvider>
            );

            // O campo de ID deve estar presente
            const campoId = screen.getByLabelText(/ID do bloqueio/i);
            expect(campoId).toBeInTheDocument();

            // O texto de apoio deve estar visível junto do campo
            const textoApoio = screen.getByText(/Cole aqui o identificador do bloqueio/i);
            expect(textoApoio).toBeInTheDocument();

            // O texto deve conter a mensagem sobre ausência de listagem
            expect(textoApoio).toHaveTextContent(/Não há hoje uma lista de bloqueios ativos para consultar/i);
            expect(textoApoio).toHaveTextContent(/o backend não expõe listagem/i);
        });

        it('o campo ID permanece como texto livre (sem seletor de lista)', () => {
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <BloqueiosEstoqueTab />
                </QueryClientProvider>
            );

            // O campo de ID deve estar presente
            const campoId = screen.getByLabelText(/ID do bloqueio/i);
            expect(campoId).toBeInTheDocument();

            // Não deve haver um dropdown/select de bloqueios (teria role combobox)
            const seletorBloqueios = screen.queryByRole('combobox', { name: /ID do bloqueio/i });
            expect(seletorBloqueios).not.toBeInTheDocument();
        });

        it('a mensagem informativa sobre liberação aparece no segundo card', () => {
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

            render(
                <QueryClientProvider client={queryClient}>
                    <BloqueiosEstoqueTab />
                </QueryClientProvider>
            );

            // A mensagem de informação sobre liberação deve estar visível
            const msgLiberacao = screen.getByText(/Ponto de liberação dos bloqueios criados por Qualidade/i);
            expect(msgLiberacao).toBeInTheDocument();

            // E deve mencionar Qualidade e Alimentar
            expect(msgLiberacao).toHaveTextContent(/Qualidade.*reprovação/i);
            expect(msgLiberacao).toHaveTextContent(/Alimentar.*recall/i);
        });
    });
});
