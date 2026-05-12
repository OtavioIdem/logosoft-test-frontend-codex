'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/features/auth/api/authApi';
import { AuthContextValue, LoginRequest } from '@/features/auth/types/auth.types';
import { clearSession, readSession, touchSessionActivity, writeSession } from '@/lib/auth/sessionStorage';
import { CurrentUser } from '@/types/erp';
import { useAppToast } from '@/hooks/useAppToast';

export const AuthContext = createContext<AuthContextValue>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: async () => undefined,
    logout: async () => undefined,
    refreshSession: async () => null,
    refreshUserFromStorage: () => undefined
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const toast = useAppToast();
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUserFromStorage = useCallback(() => {
        const session = readSession();
        setUser(session?.user ?? null);
    }, []);

    useEffect(() => {
        refreshUserFromStorage();
        setIsLoading(false);
    }, [refreshUserFromStorage]);

    const expireStoredSession = useCallback(() => {
        clearSession();
        setUser(null);
        toast.warn('Sessão expirada', 'Faça login novamente para continuar.');
        router.replace('/sessao-expirada');
    }, [router, toast]);

    useEffect(() => {
        if (!user) {
            return undefined;
        }

        let lastActivityUpdate = 0;
        const registerActivity = () => {
            const now = Date.now();
            if (now - lastActivityUpdate < 15_000) {
                return;
            }

            lastActivityUpdate = now;
            if (!touchSessionActivity()) {
                expireStoredSession();
            }
        };

        const validateStoredSession = () => {
            if (!readSession()) {
                expireStoredSession();
            }
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

    const login = useCallback(
        async (payload: LoginRequest) => {
            setIsLoading(true);
            try {
                clearSession();
                setUser(null);
                const session = await authApi.login(payload);
                writeSession(session);
                setUser(session.user);
                toast.success('Login realizado', `Bem-vindo, ${session.user.nome}.`);
                router.replace('/dashboard');
            } catch (error) {
                toast.error('Falha no login', error instanceof Error ? error.message : 'Não foi possível autenticar.');
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        [router, toast]
    );

    const refreshSession = useCallback(async () => {
        try {
            const refreshResponse = await authApi.refresh();
            refreshUserFromStorage();
            return refreshResponse;
        } catch {
            expireStoredSession();
            return null;
        }
    }, [expireStoredSession, refreshUserFromStorage]);

    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            await authApi.logout();
            toast.info('Sessão encerrada', 'Você saiu da logosoft com segurança.');
        } catch (error) {
            toast.warn('Logout local realizado', error instanceof Error ? error.message : 'Não foi possível avisar a API sobre o logout.');
        } finally {
            clearSession();
            setUser(null);
            setIsLoading(false);
            router.replace('/login');
        }
    }, [router, toast]);

    const value = useMemo<AuthContextValue>(
        () => ({ user, isAuthenticated: Boolean(user), isLoading, login, logout, refreshSession, refreshUserFromStorage }),
        [isLoading, login, logout, refreshSession, refreshUserFromStorage, user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
