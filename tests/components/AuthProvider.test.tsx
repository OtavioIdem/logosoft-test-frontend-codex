import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '@/components/security/ProtectedRoute';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { clearSession, readSession, writeSession } from '@/lib/auth/sessionStorage';
import { AuthProvider } from '@/providers/AuthProvider';
import { authApiMock, MockAuthApiClientError, routerMock } from '@/tests/mocks/auth/authProviderDeps';
import { nextNavigationMock } from '@/tests/mocks/next/navigation';

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

const SessionStatus = () => {
    const { authStatus } = useAuth();
    return <output aria-label="Estado da sessao">{authStatus}</output>;
};

const LoginTrigger = () => {
    const { login } = useAuth();
    return <button type="button" onClick={() => void login({ email: validUser.email, password: 'senha-de-teste' })}>Entrar para teste</button>;
};

const ConcurrentLoginTrigger = () => {
    const { login } = useAuth();
    return <button type="button" onClick={() => { void login({ email: 'primeiro@erp.local', password: 'primeira' }); void login({ email: 'segundo@erp.local', password: 'segunda' }); }}>Entrar duas vezes</button>;
};

const renderProtectedSession = (additionalChild?: React.ReactNode) =>
    render(
        <AuthProvider>
            {additionalChild}
            <SessionStatus />
            <ProtectedRoute><span>Shell operacional protegido</span></ProtectedRoute>
        </AuthProvider>
    );

describe('AuthProvider e ProtectedRoute', () => {
    beforeEach(() => {
        clearSession();
        authApiMock.login.mockReset();
        authApiMock.refresh.mockReset();
        authApiMock.me.mockReset();
        authApiMock.logout.mockReset();
        routerMock.replace.mockReset();
        nextNavigationMock.pathname = '/dashboard';
    });

    afterEach(() => {
        clearSession();
    });

    it('nao restaura nem exibe o shell com permissoes persistidas antes de validar /me', async () => {
        writeSession(storedSession);
        let resolveMe: (user: typeof validUser) => void = () => undefined;
        authApiMock.me.mockImplementationOnce(() => new Promise((resolve) => {
            resolveMe = resolve;
        }));

        renderProtectedSession();

        expect(screen.getByText(/validando sua sess/i)).toBeInTheDocument();
        expect(screen.queryByText('Shell operacional protegido')).not.toBeInTheDocument();

        resolveMe(validUser);

        expect(await screen.findByText('Shell operacional protegido')).toBeInTheDocument();
        expect(readSession()?.user.permissoes).toEqual(['PRODUTOS_CONSULTAR']);
    });

    it('so autentica o login depois que /me devolve as claims atuais', async () => {
        const user = userEvent.setup();
        let resolveMe: (user: typeof validUser) => void = () => undefined;
        authApiMock.login.mockResolvedValue(storedSession);
        authApiMock.me.mockImplementationOnce(() => new Promise((resolve) => {
            resolveMe = resolve;
        }));

        renderProtectedSession(<LoginTrigger />);
        await user.click(screen.getByRole('button', { name: 'Entrar para teste' }));

        expect(authApiMock.login).toHaveBeenCalledWith({ email: validUser.email, password: 'senha-de-teste' });
        expect(screen.getByText(/validando sua sess/i)).toBeInTheDocument();
        expect(screen.queryByText('Shell operacional protegido')).not.toBeInTheDocument();

        resolveMe(validUser);

        expect(await screen.findByText('Shell operacional protegido')).toBeInTheDocument();
        expect(routerMock.replace).toHaveBeenCalledWith('/dashboard');
    });

    it('bloqueia o shell em erro transitorio e tenta /me novamente pelo botao acessivel', async () => {
        writeSession(storedSession);
        authApiMock.me
            .mockRejectedValueOnce(new MockAuthApiClientError({ status: 503, code: 'AUTH.UPSTREAM_UNAVAILABLE', traceId: 'trace-auth-503', message: 'Servico de identidade indisponivel.' }))
            .mockResolvedValueOnce(validUser);
        const user = userEvent.setup();

        renderProtectedSession();

        expect(await screen.findByRole('heading', { name: /validar a sess/i })).toBeInTheDocument();
        expect(screen.queryByText('Shell operacional protegido')).not.toBeInTheDocument();
        expect(screen.getByText(/AUTH.UPSTREAM_UNAVAILABLE/)).toBeInTheDocument();
        expect(screen.getByText(/HTTP 503/)).toBeInTheDocument();
        expect(screen.getByText(/trace-auth-503/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /tentar novamente/i }));

        expect(await screen.findByText('Shell operacional protegido')).toBeInTheDocument();
        expect(authApiMock.me).toHaveBeenCalledTimes(2);
    });

    it.each([
        { status: 401, code: 'AUTH.UNAUTHORIZED', traceId: 'trace-auth-401', message: 'Sessao expirada.' },
        { code: 'AUTH_PAYLOAD_INVALID', traceId: 'trace-auth-payload', message: 'Claims da sessao invalidas.' }
    ])('limpa a sessao e nao exibe o shell quando /me invalida a sessao: $code', async (apiError) => {
        writeSession(storedSession);
        authApiMock.me.mockRejectedValueOnce(new MockAuthApiClientError(apiError));

        renderProtectedSession();

        await waitFor(() => expect(readSession()).toBeNull());
        expect(screen.queryByText('Shell operacional protegido')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Estado da sessao')).toHaveTextContent('anonymous');
        expect(routerMock.replace).toHaveBeenCalledWith('/sessao-expirada');
    });

    it('faz o login mais recente vencer quando dois logins concorrem', async () => {
        let resolveFirst: (session: typeof storedSession) => void = () => undefined;
        authApiMock.login.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; })).mockResolvedValueOnce(storedSession);
        authApiMock.me.mockResolvedValue(validUser);
        const user = userEvent.setup();
        renderProtectedSession(<ConcurrentLoginTrigger />);
        await user.click(screen.getByRole('button', { name: 'Entrar duas vezes' }));
        await waitFor(() => expect(screen.getByLabelText('Estado da sessao')).toHaveTextContent('authenticated'));
        resolveFirst(storedSession);
        expect(await screen.findByText('Shell operacional protegido')).toBeInTheDocument();
        expect(readSession()?.user.email).toBe(validUser.email);
    });

    it('ignora erro stale do bootstrap depois de login mais novo', async () => {
        writeSession(storedSession);
        let rejectBootstrap: (error: unknown) => void = () => undefined;
        authApiMock.me.mockImplementationOnce(() => new Promise((_, reject) => { rejectBootstrap = reject; }));
        authApiMock.login.mockResolvedValueOnce(storedSession);
        authApiMock.me.mockResolvedValueOnce(validUser);
        const user = userEvent.setup();
        renderProtectedSession(<LoginTrigger />);
        await user.click(screen.getByRole('button', { name: 'Entrar para teste' }));
        await waitFor(() => expect(screen.getByLabelText('Estado da sessao')).toHaveTextContent('authenticated'));
        rejectBootstrap(new MockAuthApiClientError({ status: 401, code: 'AUTH.UNAUTHORIZED', message: 'Sessao stale.' }));
        expect(await screen.findByText('Shell operacional protegido')).toBeInTheDocument();
        expect(routerMock.replace).not.toHaveBeenCalledWith('/sessao-expirada');
    });
});
