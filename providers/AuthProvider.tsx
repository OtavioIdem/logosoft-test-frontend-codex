'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, AuthApiClientError } from '@/features/auth/api/authApi';
import { AuthContextValue, LoginRequest } from '@/features/auth/types/auth.types';
import { clearSession, readSession, touchSessionActivity, updateCurrentUser, writeSession } from '@/lib/auth/sessionStorage';
import { ApiError, CurrentUser } from '@/types/erp';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';

export const AuthContext = createContext<AuthContextValue>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    authStatus: 'loading',
    authError: null,
    login: async () => undefined,
    logout: async () => undefined,
    refreshSession: async () => null,
    refreshUserFromStorage: () => undefined,
    retrySession: async () => undefined
});

const isSessionInvalid = (apiError: ApiError) => apiError.status === 401 || apiError.code === 'AUTH_PAYLOAD_INVALID';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const toast = useAppToast();
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authStatus, setAuthStatus] = useState<AuthContextValue['authStatus']>('loading');
    const [authError, setAuthError] = useState<ApiError | null>(null);
    const operationGeneration = useRef(0);
    const mountedRef = useRef(true);

    useEffect(() => () => {
        mountedRef.current = false;
        operationGeneration.current += 1;
    }, []);

    const beginOperation = () => ++operationGeneration.current;
    const isCurrentOperation = (generation: number) => mountedRef.current && generation === operationGeneration.current;

    const refreshUserFromStorage = useCallback(() => {
        const session = readSession();
        setUser(session?.user ?? null);
    }, []);

    const loadSession = useCallback(async () => {
        const generation = beginOperation();
        setIsLoading(true);
        setAuthStatus('loading');
        setAuthError(null);
        const session = readSession();

        if (!session) {
            if (!isCurrentOperation(generation)) return;
            setUser(null);
            setAuthStatus('anonymous');
            setIsLoading(false);
            return;
        }

        try {
            const me = await authApi.me();
            if (!isCurrentOperation(generation)) return;
            updateCurrentUser(me);
            setUser(me);
            setAuthStatus('authenticated');
        } catch (error) {
            if (!isCurrentOperation(generation)) return;
            const apiError = error instanceof AuthApiClientError ? error.apiError : mapApiError(error);
            setUser(null);
            if (isSessionInvalid(apiError)) {
                clearSession();
                setAuthStatus('anonymous');
                router.replace('/sessao-expirada');
            } else {
                setAuthStatus('error');
                setAuthError(apiError);
            }
        } finally {
            if (isCurrentOperation(generation)) setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        void loadSession();
    }, [loadSession]);

    const expireStoredSession = useCallback(() => {
        clearSession();
        setUser(null);
        setAuthStatus('anonymous');
        toast.warn('Sessão expirada', 'Faça login novamente para continuar.');
        router.replace('/sessao-expirada');
    }, [router, toast]);

    useEffect(() => {
        if (!user) return undefined;
        let lastActivityUpdate = 0;
        const registerActivity = () => {
            const now = Date.now();
            if (now - lastActivityUpdate < 15_000) return;
            lastActivityUpdate = now;
            if (!touchSessionActivity()) expireStoredSession();
        };
        const validateStoredSession = () => {
            if (!readSession()) expireStoredSession();
        };
        const activityEvents: Array<keyof WindowEventMap> = ['click', 'keydown', 'pointerdown'];
        activityEvents.forEach((eventName) => window.addEventListener(eventName, registerActivity, { passive: true }));
        document.addEventListener('visibilitychange', validateStoredSession);
        const intervalId = window.setInterval(validateStoredSession, 30_000);
        return () => {
            activityEvents.forEach((eventName) => window.removeEventListener(eventName, registerActivity));
            document.removeEventListener('visibilitychange', validateStoredSession);
            window.clearInterval(intervalId);
        };
    }, [expireStoredSession, user]);

    const login = useCallback(async (payload: LoginRequest) => {
        const generation = beginOperation();
        setIsLoading(true);
        setAuthStatus('loading');
        setAuthError(null);
        try {
            clearSession();
            setUser(null);
            const session = await authApi.login(payload);
            if (!isCurrentOperation(generation)) return;
            writeSession(session);
            const me = await authApi.me();
            if (!isCurrentOperation(generation)) return;
            updateCurrentUser(me);
            setUser(me);
            setAuthStatus('authenticated');
            toast.success('Login realizado', `Bem-vindo, ${me.nome}.`);
            router.replace('/dashboard');
        } catch (error) {
            if (!isCurrentOperation(generation)) return;
            const apiError = error instanceof AuthApiClientError ? error.apiError : mapApiError(error);
            clearSession();
            setUser(null);
            setAuthError(apiError);
            setAuthStatus('anonymous');
            toast.error('Falha no login', apiError.message);
            throw error;
        } finally {
            if (isCurrentOperation(generation)) setIsLoading(false);
        }
    }, [router, toast]);

    const refreshSession = useCallback(async () => {
        const generation = beginOperation();
        try {
            const refreshResponse = await authApi.refresh();
            if (!isCurrentOperation(generation)) return null;
            await loadSession();
            return refreshResponse;
        } catch {
            if (!isCurrentOperation(generation)) return null;
            expireStoredSession();
            return null;
        }
    }, [expireStoredSession, loadSession]);

    const logout = useCallback(async () => {
        const generation = beginOperation();
        setIsLoading(true);
        try {
            await authApi.logout();
            if (isCurrentOperation(generation)) toast.info('Sessão encerrada', 'Você saiu da logosoft com segurança.');
        } catch (error) {
            if (isCurrentOperation(generation)) toast.warn('Logout local realizado', error instanceof Error ? error.message : 'Não foi possível avisar a API sobre o logout.');
        } finally {
            if (!isCurrentOperation(generation)) return;
            clearSession();
            setUser(null);
            setAuthStatus('anonymous');
            setIsLoading(false);
            router.replace('/login');
        }
    }, [router, toast]);

    const value = useMemo<AuthContextValue>(
        () => ({ user, isAuthenticated: authStatus === 'authenticated' && Boolean(user), isLoading, authStatus, authError, login, logout, refreshSession, refreshUserFromStorage, retrySession: loadSession }),
        [authError, authStatus, isLoading, loadSession, login, logout, refreshSession, refreshUserFromStorage, user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
