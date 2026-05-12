import { Metadata } from 'next';
import Layout from '../../layout/layout';
import { ProtectedRoute } from '@/components/security/ProtectedRoute';
import { RoutePermissionGate } from '@/components/security/RoutePermissionGate';

interface AppLayoutProps {
    children: React.ReactNode;
}

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'logosoft',
    description: 'ERP logosoft com Next.js, TypeScript e PrimeReact.',
    robots: { index: false, follow: false },
    viewport: { initialScale: 1, width: 'device-width' },
    icons: {
        icon: '/favicon.ico'
    }
};

export default function AppLayout({ children }: AppLayoutProps) {
    return (
        <ProtectedRoute>
            <RoutePermissionGate>
                <Layout>{children}</Layout>
            </RoutePermissionGate>
        </ProtectedRoute>
    );
}
