'use client';

import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { useAuth } from '@/features/auth/hooks/useAuth';

const publicRoutes = ['/login', '/acesso-negado', '/sessao-expirada'];

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, isLoading, authStatus, authError, retrySession } = useAuth();

    useEffect(() => {
        if (!isLoading && authStatus === 'anonymous' && !isAuthenticated && !publicRoutes.includes(pathname)) {
            router.replace('/login');
        }
    }, [authStatus, isAuthenticated, isLoading, pathname, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-column align-items-center justify-content-center gap-3 p-3 surface-ground" role="status" aria-live="polite" aria-busy="true">
                <ProgressSpinner />
                <span className="text-color-secondary">Validando sua sessão…</span>
            </div>
        );
    }

    if (authStatus === 'error' && !publicRoutes.includes(pathname)) {
        return (
            <div className="min-h-screen flex align-items-center justify-content-center p-3 surface-ground">
                <section className="surface-card border-round shadow-2 p-4 w-full max-w-30rem" aria-labelledby="session-validation-error-title">
                    <div className="flex align-items-center gap-2 mb-3">
                        <i className="pi pi-exclamation-triangle text-orange-500 text-2xl" aria-hidden="true" />
                        <h1 id="session-validation-error-title" className="text-xl m-0">
                            Não foi possível validar a sessão
                        </h1>
                    </div>
                    <ApiErrorPanel error={authError} title="Não foi possível validar a sessão com a API." />
                    <div className="flex justify-content-end">
                        <Button type="button" label="Tentar novamente" icon="pi pi-refresh" onClick={() => void retrySession()} />
                    </div>
                </section>
            </div>
        );
    }

    if (!isAuthenticated && !publicRoutes.includes(pathname)) return null;

    return <>{children}</>;
};
