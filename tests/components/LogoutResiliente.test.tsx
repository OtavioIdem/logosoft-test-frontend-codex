import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/providers/AuthProvider';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { readSession, writeSession, clearSession } from '@/lib/auth/sessionStorage';
import { authApiMock, MockAuthApiClientError, routerMock } from '@/tests/mocks/auth/authProviderDeps';

vi.mock('@/features/auth/api/authApi', async () => import('@/tests/mocks/auth/authProviderDeps'));
vi.mock('next/navigation', async () => import('@/tests/mocks/next/navigation'));

const validUser = {
  id: '11111111-1111-1111-1111-111111111111',
  nome: 'Usuario autorizado',
  email: 'usuario@erp.local',
  empresaId: '22222222-2222-2222-2222-222222222222',
  filialId: '33333333-3333-3333-3333-333333333333',
  isMaster: false,
  permissoes: ['PRODUTOS_CONSULTAR'] as const
};

const storedSession = {
  accessToken: 'access-token',
  accessTokenExpiraEm: '2030-01-01T00:00:00.000Z',
  refreshToken: 'refresh-token',
  refreshTokenExpiraEm: '2030-01-02T00:00:00.000Z',
  user: { ...validUser, permissoes: ['MASTER_GOD'] as never }
};

const renderAuthHook = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
};

describe('Logout resiliente — AC-4', () => {
  beforeEach(() => {
    clearSession();
    authApiMock.me.mockReset();
    authApiMock.logout.mockReset();
    routerMock.replace.mockReset();
  });

  it('AC-4: logout limpa a sessao e redireciona mesmo quando POST /api/auth/logout falha', async () => {
    // Preparar: sessão autenticada existente
    writeSession(storedSession);
    authApiMock.me.mockResolvedValue(validUser);

    const { result } = renderAuthHook();

    // Aguardar a sessão ser validada
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
    });

    // Verificar estado inicial
    expect(readSession()).not.toBeNull();
    expect(result.current.authStatus).toBe('authenticated');

    // Fazer logout com falha na API
    authApiMock.logout.mockRejectedValue(new Error('Falha de comunicação com API'));
    await result.current.logout();

    // Afirmar que:
    // 1. Sessão foi limpa mesmo com erro
    // 2. Status é anonymous
    // 3. Router foi redirecionado para /login
    // 4. Usuário é null
    await waitFor(() => {
      expect(readSession()).toBeNull();
      expect(result.current.authStatus).toBe('anonymous');
      expect(result.current.user).toBeNull();
      expect(routerMock.replace).toHaveBeenCalledWith('/login');
    });
  });
});
