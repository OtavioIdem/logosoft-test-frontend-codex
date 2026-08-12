import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { clearSession, getRefreshToken, updateTokens } from '@/lib/auth/sessionStorage';
import { LoginPayload, LoginRequest } from '@/features/auth/types/auth.types';
import { normalizeCurrentUserResponse, normalizeLoginSession, normalizeRefreshSession } from '@/features/auth/api/authResponseMapper';
import { ZodError } from 'zod';

export class AuthApiClientError extends Error {
    apiError: ReturnType<typeof mapApiError>;

    constructor(apiError: ReturnType<typeof mapApiError>) {
        super(apiError.message);
        this.name = 'AuthApiClientError';
        this.apiError = apiError;
    }
}

/**
 * O payload de login carrega **somente credenciais**. A empresa saiu da tela: quem resolve o vínculo e valida
 * a licença do cliente é o backend, a partir do usuário autenticado. A desestruturação explícita garante que
 * um chamador desatualizado não reintroduza `empresaId` no corpo por engano.
 */
export const buildLoginPayload = ({ email, password }: LoginRequest): LoginPayload => ({
    email: email.trim(),
    password
});

const genericLoginMessages = new Set([
    'Sessão não autenticada ou expirada.',
    'Não foi possível concluir a operação.',
    'Não foi possível conectar à API. Verifique a URL configurada e tente novamente.'
]);

const preserveApiMessage = (message: string, fallback: string) => (genericLoginMessages.has(message) ? fallback : message);

const mapLoginErrorMessage = (apiError: ReturnType<typeof mapApiError>) => {
    if (apiError.status === 401) {
        return preserveApiMessage(apiError.message, 'Credenciais inválidas ou acesso não autorizado.');
    }

    if (apiError.status === 403) {
        return preserveApiMessage(apiError.message, 'Usuário bloqueado ou sem permissão para acessar a operação selecionada.');
    }

    // O backend responde aqui também quando a licença do cliente está irregular; a mensagem dele é específica
    // e `preserveApiMessage` a mantém, caindo no texto genérico apenas quando não vem nada útil.
    if (apiError.status === 400) {
        return preserveApiMessage(apiError.message, 'Credenciais inválidas. Revise os dados informados.');
    }

    return apiError.message;
};

const runAuthRequest = async <T>(request: () => Promise<T>, mapMessage?: (apiError: ReturnType<typeof mapApiError>) => string) => {
    try {
        return await request();
    } catch (error) {
        const apiError = error instanceof ZodError ? { ...mapApiError(error), code: 'AUTH_PAYLOAD_INVALID' } : mapApiError(error);
        const message = mapMessage ? mapMessage(apiError) : apiError.message;
        throw new AuthApiClientError({ ...apiError, message });
    }
};

export const authApi = {
    async login(payload: LoginRequest) {
        const loginPayload = buildLoginPayload(payload);

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

        return runAuthRequest(async () => {
            const response = await httpClient.post('/api/auth/refresh', { refreshToken });
            const refreshSession = normalizeRefreshSession(response.data);
            updateTokens(refreshSession, refreshSession.permissoes);
            return refreshSession;
        });
    },

    async me() {
        return runAuthRequest(async () => {
            const response = await httpClient.get('/api/auth/me');
            return normalizeCurrentUserResponse(response.data);
        });
    },

    async logout() {
        const refreshToken = getRefreshToken();

        try {
            await runAuthRequest(() => httpClient.post('/api/auth/logout', { refreshToken: refreshToken ?? null }));
        } finally {
            clearSession();
        }
    }
};
