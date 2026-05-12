'use client';

import { ProgressSpinner } from 'primereact/progressspinner';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';

const publicRoutes = ['/login', '/acesso-negado', '/sessao-expirada'];

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && !isAuthenticated && !publicRoutes.includes(pathname)) {
            router.replace('/login');
        }
    }, [isAuthenticated, isLoading, pathname, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex align-items-center justify-content-center">
                <ProgressSpinner />
            </div>
        );
    }

    if (!isAuthenticated && !publicRoutes.includes(pathname)) return null;

    return <>{children}</>;
};
