import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { clearSession, getRefreshToken, updateTokens } from '@/lib/auth/sessionStorage';
import { LoginPayload, LoginRequest } from '@/features/auth/types/auth.types';
import { normalizeLoginSession, normalizeRefreshSession } from '@/features/auth/api/authResponseMapper';
import { appConfig } from '@/config/app';
import { normalizeGuidOrNull } from '@/lib/http/requestUtils';

const MANAGER_TEST_EMAIL = 'manager@erp.local';

export const buildLoginPayload = ({ email, password, empresaId, filialId }: LoginRequest): LoginPayload => {
    const normalizedEmail = email.trim();
    const payload: LoginPayload = {
        email: normalizedEmail,
        password
    };

    if (normalizedEmail.toLowerCase() === MANAGER_TEST_EMAIL) {
        return payload;
    }

    const normalizedEmpresaId = normalizeGuidOrNull(empresaId);
    const normalizedFilialId = normalizeGuidOrNull(filialId);

    if (normalizedEmpresaId) {
        payload.empresaId = normalizedEmpresaId;
    }

    if (normalizedFilialId) {
        payload.filialId = normalizedFilialId;
    }

    return payload;
};

const genericLoginMessages = new Set([
    'Sessão não autenticada ou expirada.',
    'Não foi possível concluir a operação.',
    'Não foi possível conectar à API. Verifique a URL configurada e tente novamente.'
]);

const preserveApiMessage = (message: string, fallback: string) => (genericLoginMessages.has(message) ? fallback : message);

const mapLoginErrorMessage = (apiError: ReturnType<typeof mapApiError>) => {
    if (apiError.status === 401) {
        return preserveApiMessage(apiError.message, 'Credenciais inválidas ou acesso não autorizado para a empresa/filial informada.');
    }

    if (apiError.status === 403) {
        return preserveApiMessage(apiError.message, 'Usuário bloqueado ou sem permissão para acessar a operação selecionada.');
    }

    if (apiError.status === 400) {
        return preserveApiMessage(apiError.message, 'Empresa, filial ou credenciais inválidas. Revise os dados informados.');
    }

    return apiError.message;
};

const runAuthRequest = async <T>(request: () => Promise<T>, mapMessage?: (apiError: ReturnType<typeof mapApiError>) => string) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(mapMessage ? mapMessage(apiError) : apiError.message);
    }
};

export const authApi = {
    async login(payload: LoginRequest) {
        const loginPayload = buildLoginPayload(payload);

        if (appConfig.useMockAuth) {
            const { mockAuthClient } = await import('@/features/auth/api/mockAuthClient');
            return mockAuthClient.login(loginPayload);
        }

        return runAuthRequest(async () => {
            const response = await httpClient.post('/api/auth/login', loginPayload);
            return normalizeLoginSession(response.data);
        }, mapLoginErrorMessage);
    },

    async refresh() {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            throw new Error('Refresh token ausente.');
        }

        if (appConfig.useMockAuth) {
            const { mockAuthClient } = await import('@/features/auth/api/mockAuthClient');
            const refreshSession = await mockAuthClient.refresh();
            updateTokens(refreshSession, refreshSession.permissoes);
            return refreshSession;
        }

        return runAuthRequest(async () => {
            const response = await httpClient.post('/api/auth/refresh', { refreshToken });
            const refreshSession = normalizeRefreshSession(response.data);
            updateTokens(refreshSession, refreshSession.permissoes);
            return refreshSession;
        });
    },

    async logout() {
        const refreshToken = getRefreshToken();

        try {
            if (appConfig.useMockAuth) {
                const { mockAuthClient } = await import('@/features/auth/api/mockAuthClient');
                await mockAuthClient.logout();
                return;
            }

            await runAuthRequest(() => httpClient.post('/api/auth/logout', { refreshToken: refreshToken ?? null }));
        } finally {
            clearSession();
        }
    }
};
