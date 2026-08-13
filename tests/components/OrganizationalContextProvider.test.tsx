import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { OrganizationalContextProvider } from '@/providers/OrganizationalContextProvider';

vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);
const empresaSessao = '22222222-2222-2222-2222-222222222222';
const filialSessao = '33333333-3333-3333-3333-333333333333';
const empresaSelecionada = '44444444-4444-4444-4444-444444444444';
const filialSelecionada = '55555555-5555-5555-5555-555555555555';

const ContextHarness = () => {
    const context = useOrganizationalContext();
    return (
        <div>
            <output aria-label="empresa ativa">{context.empresaId ?? 'global'}</output>
            <output aria-label="filial ativa">{context.filialId ?? 'todas'}</output>
            <output aria-label="pode alterar">{String(context.canChangeOrganization)}</output>
            <output aria-label="selecao obrigatoria">{String(context.requiresOrganizationSelection)}</output>
            <button type="button" onClick={() => context.setEmpresaId(empresaSelecionada)}>Selecionar empresa</button>
            <button type="button" onClick={() => context.setFilialId(filialSelecionada)}>Selecionar filial</button>
        </div>
    );
};

const renderContext = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(['recurso-operacional'], { id: 'registro' });
    render(<QueryClientProvider client={queryClient}><OrganizationalContextProvider><ContextHarness /></OrganizationalContextProvider></QueryClientProvider>);
    return queryClient;
};

const authenticated = (overrides: Partial<NonNullable<ReturnType<typeof useAuth>['user']>> = {}) => ({
    user: { id: '1', nome: 'Usuario', email: 'usuario@erp.local', empresaId: empresaSessao, filialId: filialSessao, isMaster: false, permissoes: [], ...overrides },
    isAuthenticated: true
} as ReturnType<typeof useAuth>);

describe('OrganizationalContextProvider', () => {
    beforeEach(() => {
        mockedUseAuth.mockReset();
    });

    it('mantem empresa e filial da sessao imutaveis para usuario comum', async () => {
        mockedUseAuth.mockReturnValue(authenticated());
        const user = userEvent.setup();
        const queryClient = renderContext();

        expect(screen.getByLabelText('empresa ativa')).toHaveTextContent(empresaSessao);
        expect(screen.getByLabelText('filial ativa')).toHaveTextContent(filialSessao);
        expect(screen.getByLabelText('pode alterar')).toHaveTextContent('false');

        await user.click(screen.getByRole('button', { name: 'Selecionar empresa' }));
        await user.click(screen.getByRole('button', { name: 'Selecionar filial' }));

        expect(screen.getByLabelText('empresa ativa')).toHaveTextContent(empresaSessao);
        expect(screen.getByLabelText('filial ativa')).toHaveTextContent(filialSessao);
        expect(queryClient.getQueryState(['recurso-operacional'])?.isInvalidated).toBe(false);
    });

    it('inicia master global, limpa a filial ao trocar empresa e invalida queries', async () => {
        mockedUseAuth.mockReturnValue(authenticated({ id: '2', nome: 'Master', email: 'master@erp.local', empresaId: '00000000-0000-0000-0000-000000000000', filialId: null, isMaster: true }));
        const user = userEvent.setup();
        const queryClient = renderContext();
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        expect(screen.getByLabelText('empresa ativa')).toHaveTextContent('global');
        expect(screen.getByLabelText('selecao obrigatoria')).toHaveTextContent('true');

        await user.click(screen.getByRole('button', { name: 'Selecionar empresa' }));
        expect(screen.getByLabelText('empresa ativa')).toHaveTextContent(empresaSelecionada);
        expect(screen.getByLabelText('filial ativa')).toHaveTextContent('todas');
        expect(screen.getByLabelText('selecao obrigatoria')).toHaveTextContent('false');
        await waitFor(() => expect(queryClient.getQueryState(['recurso-operacional'])?.isInvalidated).toBe(true));
        expect(invalidateSpy).toHaveBeenCalledTimes(1);

        await user.click(screen.getByRole('button', { name: 'Selecionar empresa' }));
        expect(invalidateSpy).toHaveBeenCalledTimes(1);

        await user.click(screen.getByRole('button', { name: 'Selecionar filial' }));
        expect(screen.getByLabelText('filial ativa')).toHaveTextContent(filialSelecionada);
        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(2));
    });

    it('preserva a selecao quando /me recria o mesmo master e limpa ao trocar identidade', async () => {
        mockedUseAuth.mockReturnValue(authenticated({ id: '2', isMaster: true, empresaId: '00000000-0000-0000-0000-000000000000', filialId: null }));
        const user = userEvent.setup();
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const view = render(<QueryClientProvider client={queryClient}><OrganizationalContextProvider><ContextHarness /></OrganizationalContextProvider></QueryClientProvider>);

        await user.click(screen.getByRole('button', { name: 'Selecionar empresa' }));
        expect(screen.getByLabelText('empresa ativa')).toHaveTextContent(empresaSelecionada);

        mockedUseAuth.mockReturnValue(authenticated({ id: '2', nome: 'Master atualizado', isMaster: true, empresaId: '00000000-0000-0000-0000-000000000000', filialId: null }));
        view.rerender(<QueryClientProvider client={queryClient}><OrganizationalContextProvider><ContextHarness /></OrganizationalContextProvider></QueryClientProvider>);
        expect(screen.getByLabelText('empresa ativa')).toHaveTextContent(empresaSelecionada);

        queryClient.setQueryData(['recurso-operacional'], { id: 'contexto-anterior' });
        mockedUseAuth.mockReturnValue(authenticated({ id: '3', empresaId: empresaSessao, filialId: filialSessao, isMaster: false }));
        view.rerender(<QueryClientProvider client={queryClient}><OrganizationalContextProvider><ContextHarness /></OrganizationalContextProvider></QueryClientProvider>);
        expect(await screen.findByLabelText('empresa ativa')).toHaveTextContent(empresaSessao);
        expect(screen.getByLabelText('filial ativa')).toHaveTextContent(filialSessao);
        expect(screen.getByLabelText('pode alterar')).toHaveTextContent('false');
        expect(queryClient.getQueryData(['recurso-operacional'])).toBeUndefined();
    });

    it('falha explicitamente quando o hook e usado fora do provider', () => {
        expect(() => render(<ContextHarness />)).toThrow(/OrganizationalContextProvider/);
    });
});
