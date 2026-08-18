import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { appConfig } from '@/config/app';
import { clearSession, getRefreshToken, getSession, isAccessTokenExpired, isRefreshTokenExpired, updateTokens } from '@/lib/auth/sessionStorage';
import { AuthTokens } from '@/types/erp';
import { normalizeRefreshSession } from '@/features/auth/api/authResponseMapper';
import { sanitizePayload } from '@/lib/http/requestUtils';
import { applyOrganizationalContextPolicy } from '@/lib/http/organizationalContextPolicy';

export const rawHttpClient = axios.create({
    baseURL: appConfig.apiUrl,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
    }
});

export const httpClient = axios.create({
    baseURL: appConfig.apiUrl,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
    }
});

let refreshPromise: Promise<AuthTokens> | null = null;

const requestRefresh = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('Refresh token ausente.');

    const response = await rawHttpClient.post('/api/auth/refresh', { refreshToken });
    const refreshSession = normalizeRefreshSession(response.data);
    updateTokens(refreshSession, refreshSession.permissoes);
    return refreshSession;
};

const getOrCreateRefreshPromise = () => {
    refreshPromise = refreshPromise ?? requestRefresh();
    return refreshPromise;
};

const clearRefreshPromise = () => {
    refreshPromise = null;
};

const isAuthenticationRequest = (url?: string) => Boolean(url && ['/api/auth/login', '/api/auth/refresh'].some((endpoint) => url.includes(endpoint)));

httpClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    config = applyOrganizationalContextPolicy(config);

    if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
        config.data = sanitizePayload(config.data);
    }

    if (isAuthenticationRequest(config.url)) {
        return config;
    }

    const session = getSession();
    if (!session) {
        return config;
    }

    if (isAccessTokenExpired(session) && !isRefreshTokenExpired(session)) {
        try {
            const tokens = await getOrCreateRefreshPromise();
            config.headers.Authorization = `Bearer ${tokens.accessToken}`;
            return config;
        } finally {
            clearRefreshPromise();
        }
    }

    config.headers.Authorization = `Bearer ${session.accessToken}`;
    return config;
});

httpClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

        if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || isAuthenticationRequest(originalRequest.url)) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            const tokens = await getOrCreateRefreshPromise();
            originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
            return httpClient(originalRequest);
        } catch (refreshError) {
            clearSession();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('logosoft:toast', { detail: { severity: 'warn', summary: 'Sessão expirada', detail: 'Faça login novamente para continuar.' } }));
                window.location.href = '/sessao-expirada';
            }
            return Promise.reject(refreshError);
        } finally {
            clearRefreshPromise();
        }
    }
);
