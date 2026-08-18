import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFiliaisOptions, useTodasFiliaisOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { administracaoApi } from '@/features/administracao/api/administracaoApi';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { usePermissions } from '@/features/auth/hooks/usePermissions';

vi.mock('@/features/administracao/api/administracaoApi', () => ({ administracaoApi: { listarFiliais: vi.fn() } }));
vi.mock('@/hooks/useOrganizationalContext', () => ({ useOrganizationalContext: vi.fn() }));
vi.mock('@/features/auth/hooks/usePermissions', () => ({ usePermissions: vi.fn() }));

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const api = vi.mocked(administracaoApi);
const context = vi.mocked(useOrganizationalContext);
const permissions = vi.mocked(usePermissions);

const snapshot = (overrides: Partial<{ empresaId: string | null; filialId: string | null; isMaster: boolean; revision: number }> = {}) => ({
    empresaId,
    filialId: null,
    isMaster: true,
    revision: 1,
    ...overrides
});

const Harness = ({ all = false }: { all?: boolean }) => {
    const query = all ? useTodasFiliaisOptions(empresaId) : useFiliaisOptions(empresaId);
    return <output aria-label="resultado">{JSON.stringify({ blocked: query.blocked, options: query.options, error: query.error ? 'erro' : null })}</output>;
};

const renderHook = (all = false) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={queryClient}><Harness all={all} /></QueryClientProvider>);
};

describe('lookup de filiais B47.c2', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        permissions.mockReturnValue({ hasPermission: vi.fn(() => false), hasAnyPermission: vi.fn(), hasAllPermissions: vi.fn() });
        api.listarFiliais.mockResolvedValue([{ id: filialId, empresaId, nome: 'Filial atual', documento: '' }]);
    });

    it('não faz GET enquanto master está global e faz lookup com snapshot atual após selecionar empresa', async () => {
        context.mockReturnValue({ snapshot: snapshot({ empresaId: null, revision: 0 }) } as ReturnType<typeof useOrganizationalContext>);
        const view = renderHook();

        expect(api.listarFiliais).not.toHaveBeenCalled();
        expect(screen.getByLabelText('resultado')).toHaveTextContent('"blocked":true');

        const currentSnapshot = snapshot({ empresaId, filialId: null, revision: 1 });
        context.mockReturnValue({ snapshot: currentSnapshot } as ReturnType<typeof useOrganizationalContext>);
        view.rerender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Harness /></QueryClientProvider>);

        await waitFor(() => expect(api.listarFiliais).toHaveBeenCalledWith({ empresaId }, currentSnapshot));
    });

    it('bloqueia empresa divergente sem chamada remota', () => {
        context.mockReturnValue({ snapshot: snapshot({ empresaId: '33333333-3333-3333-3333-333333333333', isMaster: false }) } as ReturnType<typeof useOrganizationalContext>);
        renderHook();

        expect(api.listarFiliais).not.toHaveBeenCalled();
        expect(screen.getByLabelText('resultado')).toHaveTextContent('"blocked":true');
    });

    it('retorna somente a filial da sessão sem ADMINISTRACAO_CONSULTAR e não consulta a API', () => {
        context.mockReturnValue({ snapshot: snapshot({ isMaster: false, filialId }) } as ReturnType<typeof useOrganizationalContext>);
        renderHook();

        expect(api.listarFiliais).not.toHaveBeenCalled();
        expect(screen.getByLabelText('resultado')).toHaveTextContent('Filial atual');
    });

    it('bloqueia usuário sem permissão nem filial e aplica a mesma policy a useTodasFiliaisOptions', () => {
        context.mockReturnValue({ snapshot: snapshot({ isMaster: false, filialId: null }) } as ReturnType<typeof useOrganizationalContext>);
        renderHook(true);

        expect(api.listarFiliais).not.toHaveBeenCalled();
        expect(screen.getByLabelText('resultado')).toHaveTextContent('"blocked":true');
    });
});
